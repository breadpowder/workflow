# Composable Onboarding POC - Detailed Implementation Guide

**Companion to**: tasks.md
**Purpose**: Detailed pseudocode, implementation patterns, and Context7 references for each task
**Status**: Ready for Implementation

---

## Task 1: Self-Hosted CopilotKit Runtime

**Reference**: tasks.md COMP-001

### Implementation Approach

#### Step 1: Initialize Next.js Project

```bash
npx create-next-app@latest explore_copilotkit --typescript --tailwind --app
cd explore_copilotkit
npm install @copilotkit/react-core @copilotkit/runtime openai yaml
```

#### Step 2: Create Runtime Endpoint

**Pseudocode:**

```
FUNCTION setupCopilotKitEndpoint():
  INPUT: None
  OUTPUT: Next.js API route handler

  1. VALIDATE environment:
     IF OPENAI_API_KEY is undefined THEN
       THROW Error("OPENAI_API_KEY environment variable is required")
     END IF

  2. INITIALIZE OpenAI client:
     openai ← NEW OpenAI({
       apiKey: process.env.OPENAI_API_KEY,
       timeout: 120000  // 2 minutes for long operations
     })

  3. CREATE service adapter:
     serviceAdapter ← NEW OpenAIAdapter({ openai })

  4. CREATE runtime:
     runtime ← NEW CopilotRuntime()

  5. DEFINE POST handler:
     FUNCTION handlePOST(request: NextRequest):
       endpoint ← copilotRuntimeNextJSAppRouterEndpoint({
         runtime,
         serviceAdapter,
         endpoint: '/api/copilotkit'
       })
       RETURN endpoint.handleRequest(request)
     END FUNCTION

  6. EXPORT POST handler with maxDuration

  EDGE CASES:
    - Missing API key → Throw clear error at startup
    - Invalid API key → OpenAI will return 401, runtime passes through
    - Timeout → Set 120s limit for Vercel compatibility
    - Streaming failure → Runtime handles reconnection
END FUNCTION
```

**Implementation Code:**

```typescript
// app/api/copilotkit/route.ts
import { NextRequest } from 'next/server';
import {
  CopilotRuntime,
  OpenAIAdapter,
  copilotRuntimeNextJSAppRouterEndpoint,
} from '@copilotkit/runtime';
import OpenAI from 'openai';

// Validate API key at module load time
if (!process.env.OPENAI_API_KEY) {
  throw new Error(
    'OPENAI_API_KEY is not defined. Please add it to your .env.local file.'
  );
}

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  timeout: 120000, // 2 minutes
});

// Create service adapter
const serviceAdapter = new OpenAIAdapter({ openai });

// Create runtime instance
const runtime = new CopilotRuntime();

// Define POST handler
export const POST = async (req: NextRequest) => {
  const { handleRequest } = copilotRuntimeNextJSAppRouterEndpoint({
    runtime,
    serviceAdapter,
    endpoint: '/api/copilotkit',
  });

  return handleRequest(req);
};

// Set maximum execution duration for Vercel
export const maxDuration = 120;
```

**Environment Setup:**

```bash
# .env.local (DO NOT COMMIT)
OPENAI_API_KEY=sk-...

# .env.example (COMMIT THIS)
OPENAI_API_KEY=your_openai_api_key_here
```

**Context7 References:**
- CopilotKit runtime: `/copilotkit/copilotkit` - renderAndWaitForResponse patterns
- Next.js API routes: `/vercel/next.js` - App Router API conventions

---

## Task 2: Two-Stage YAML Workflow Loader

**Reference**: tasks.md COMP-002

### Implementation Approach

#### TypeScript Schema Definitions

**Pseudocode:**

```
// Workflow-level types
INTERFACE WorkflowDefinition:
  id: string
  name: string
  version: number
  applies_to: {
    client_type: string
    jurisdictions: string[]
  }
  steps: WorkflowStepReference[]
END INTERFACE

INTERFACE WorkflowStepReference:
  id: string
  task_ref: string               // e.g., "contact_info/corporate"
  next: {
    conditions?: Array<{
      when: string                // Expression: "risk_score > 70"
      then: string                // Target step ID
    }>
    default: string               // Default step ID or "END"
  }
END INTERFACE

// Task-level types
INTERFACE TaskDefinition:
  id: string
  name: string
  description: string
  version: number
  extends?: string                // e.g., "_base/contact_info_base"
  component_id: string            // e.g., "form"
  required_fields: string[]       // Ground truth
  schema: any                     // FormSchema | DocumentSchema
  expected_output_fields: string[]
  tags?: string[]
END INTERFACE

// Compiled types
INTERFACE CompiledWorkflowStep:
  id: string
  task_ref: string
  task_definition: TaskDefinition // Resolved with inheritance
  component_id: string            // From task
  schema: any                     // From task
  required_fields: string[]       // From task (ground truth)
  next: TransitionRules
END INTERFACE
```

#### Two-Stage Loading Algorithm

**Pseudocode:**

```
FUNCTION loadAndCompileWorkflow(workflowPath: string) → CompiledWorkflow:
  INPUT: Path to workflow YAML file
  OUTPUT: Fully compiled workflow with resolved tasks

  // STAGE 1: Load workflow file
  1. workflowYAML ← READ_FILE(workflowPath)
  2. workflowDef ← PARSE_YAML(workflowYAML)
  3. VALIDATE_WORKFLOW(workflowDef)

  // STAGE 2: Resolve all task references
  4. compiledSteps ← EMPTY_ARRAY
  5. FOR EACH stepRef IN workflowDef.steps:
       a. taskDef ← loadTask(stepRef.task_ref)
       b. resolvedTask ← resolveTaskInheritance(taskDef)
       c. VALIDATE_TASK_REF(stepRef, resolvedTask)
       d. compiledStep ← {
            id: stepRef.id,
            task_ref: stepRef.task_ref,
            task_definition: resolvedTask,
            component_id: resolvedTask.component_id,
            schema: resolvedTask.schema,
            required_fields: resolvedTask.required_fields,  // From task!
            next: stepRef.next
          }
       e. ADD compiledStep TO compiledSteps
     END FOR

  6. stepIndex ← BUILD_INDEX(compiledSteps)
  7. VALIDATE_TRANSITIONS(compiledSteps, stepIndex)

  8. RETURN {
       workflowId: workflowDef.id,
       version: workflowDef.version,
       initialStepId: compiledSteps[0].id,
       steps: compiledSteps,
       stepIndexById: stepIndex
     }

  EDGE CASES:
    - Invalid YAML syntax → Throw parse error
    - Missing task file → Throw "Task not found: {task_ref}"
    - Circular inheritance → Throw "Circular inheritance detected"
    - Invalid transitions → Throw "Step references non-existent target"
END FUNCTION
```

#### Task Inheritance Resolution

**Pseudocode:**

```
FUNCTION resolveTaskInheritance(taskDef: TaskDefinition) → TaskDefinition:
  INPUT: Task definition (may have 'extends')
  OUTPUT: Fully resolved task with merged schemas

  1. IF taskDef.extends IS NULL:
       RETURN taskDef  // Base case: no inheritance
     END IF

  2. parentPath ← taskDef.extends  // e.g., "_base/contact_info_base"
  3. parentDef ← loadTask(parentPath)

  4. // Detect circular inheritance
     visitedSet ← SET containing taskDef.id
     IF detectCircular(parentDef, visitedSet):
       THROW Error("Circular inheritance: {taskDef.id}")
     END IF

  5. // Recursively resolve parent
     resolvedParent ← resolveTaskInheritance(parentDef)

  6. // Merge schemas
     mergedSchema ← mergeSchemas(resolvedParent.schema, taskDef.schema)

  7. RETURN {
       ...taskDef,
       schema: mergedSchema,
       required_fields: taskDef.required_fields,  // Child defines own requirements
       expected_output_fields: [
         ...resolvedParent.expected_output_fields,
         ...taskDef.expected_output_fields
       ]
     }

  EDGE CASES:
    - Parent not found → Throw "Base task not found: {parentPath}"
    - Circular reference → Detect with visited set
    - Field name collision → Child overrides parent
END FUNCTION

FUNCTION mergeSchemas(parentSchema, childSchema) → MergedSchema:
  1. parentFieldsMap ← MAP parent fields by name

  2. mergedFields ← EMPTY_ARRAY

  3. // Add all parent fields (with potential child overrides)
     FOR EACH parentField IN parentSchema.fields:
       childOverride ← FIND childField WHERE name = parentField.name
       IF childOverride EXISTS:
         mergedFields.ADD({ ...parentField, ...childOverride })  // Merge
       ELSE:
         mergedFields.ADD(parentField)  // Keep as-is
       END IF
     END FOR

  4. // Add child-only fields
     FOR EACH childField IN childSchema.fields:
       IF childField.name NOT IN parentFieldsMap:
         IF childField.inherits EXISTS:
           // Handle field inheritance (e.g., business_email inherits email)
           inheritedField ← parentFieldsMap.GET(childField.inherits)
           IF inheritedField IS NULL:
             THROW Error("Cannot inherit non-existent field: {childField.inherits}")
           END IF
           mergedFields.ADD({ ...inheritedField, ...childField, name: childField.name })
         ELSE:
           mergedFields.ADD(childField)
         END IF
       END IF
     END FOR

  5. RETURN {
       ...parentSchema,
       ...childSchema,
       fields: mergedFields
     }
END FUNCTION
```

**Implementation Code:**

```typescript
// lib/workflow/loader.ts
import { readFile } from 'fs/promises';
import { parse } from 'yaml';
import path from 'path';

const WORKFLOWS_DIR = path.join(process.cwd(), 'data/workflows');
const TASKS_DIR = path.join(process.cwd(), 'data/tasks');

/**
 * Load and parse a workflow YAML file
 */
export async function loadWorkflow(
  workflowId: string
): Promise<WorkflowDefinition> {
  const filePath = path.join(WORKFLOWS_DIR, `${workflowId}.yaml`);
  const content = await readFile(filePath, 'utf-8');
  return parse(content);
}

/**
 * Load and parse a task YAML file
 */
export async function loadTask(taskRef: string): Promise<TaskDefinition> {
  const filePath = path.join(TASKS_DIR, `${taskRef}.yaml`);
  try {
    const content = await readFile(filePath, 'utf-8');
    return parse(content);
  } catch (error) {
    throw new Error(`Task not found: ${taskRef} (${filePath})`);
  }
}

/**
 * Resolve task inheritance recursively
 */
export async function resolveTaskInheritance(
  taskDef: TaskDefinition,
  visited: Set<string> = new Set()
): Promise<TaskDefinition> {
  // Base case: no inheritance
  if (!taskDef.extends) {
    return taskDef;
  }

  // Detect circular inheritance
  if (visited.has(taskDef.id)) {
    throw new Error(`Circular inheritance detected: ${Array.from(visited).join(' → ')} → ${taskDef.id}`);
  }
  visited.add(taskDef.id);

  // Load parent task
  const parentDef = await loadTask(taskDef.extends);

  // Recursively resolve parent
  const resolvedParent = await resolveTaskInheritance(parentDef, new Set(visited));

  // Merge schemas
  const mergedSchema = mergeSchemas(resolvedParent.schema, taskDef.schema);

  return {
    ...taskDef,
    schema: mergedSchema,
    expected_output_fields: [
      ...resolvedParent.expected_output_fields,
      ...taskDef.expected_output_fields,
    ],
  };
}

/**
 * Compile workflow with resolved tasks
 */
export async function compileWorkflow(
  workflowId: string
): Promise<CompiledWorkflow> {
  const workflowDef = await loadWorkflow(workflowId);

  const compiledSteps = await Promise.all(
    workflowDef.steps.map(async (stepRef) => {
      const taskDef = await loadTask(stepRef.task_ref);
      const resolvedTask = await resolveTaskInheritance(taskDef);

      return {
        id: stepRef.id,
        task_ref: stepRef.task_ref,
        task_definition: resolvedTask,
        component_id: resolvedTask.component_id,
        schema: resolvedTask.schema,
        required_fields: resolvedTask.required_fields,
        next: stepRef.next,
      };
    })
  );

  return {
    workflowId: workflowDef.id,
    version: workflowDef.version,
    initialStepId: compiledSteps[0].id,
    steps: compiledSteps,
    stepIndexById: buildStepIndex(compiledSteps),
  };
}
```

**Context7 References:**
- Next.js server-side file operations: `/vercel/next.js` - API routes with file system access
- React patterns for data loading: `/websites/react_dev` - useEffect patterns

---

## Task 2B: Client State Persistence (~30 min)

**Objective:** Implement file-based key-value storage for persisting client workflow state

**Files:**
- `lib/workflow/state-store.ts` - State persistence functions
- `data/client_state/.gitkeep` - Ensure directory exists

**Pseudocode:**

```typescript
// ═══════════════════════════════════════════════════════════════
// lib/workflow/state-store.ts
// ═══════════════════════════════════════════════════════════════

import fs from 'fs/promises';
import path from 'path';

const STATE_DIR = path.join(process.cwd(), 'data', 'client_state');

// State interface
export interface ClientState {
  clientId: string;
  workflowId: string;
  currentStepId: string;
  currentStage?: string;
  collectedInputs: Record<string, any>;
  completedSteps: string[];
  completedStages?: string[];
  lastUpdated: string;
}

// ═══════════════════════════════════════════════════════════════
// SAVE CLIENT STATE (ATOMIC WRITE)
// ═══════════════════════════════════════════════════════════════

export async function saveClientState(
  clientId: string,
  state: ClientState
): Promise<void> {
  /*
  Purpose: Save client state to JSON file with atomic write

  Algorithm:
  1. Ensure state directory exists
  2. Write to temporary file
  3. Atomically rename temp file to final file
  4. This prevents corruption from partial writes

  Atomic Write Pattern:
  - Write to {filename}.tmp
  - Rename to {filename}
  - File system guarantees rename is atomic
  */

  // Create directory if it doesn't exist
  await fs.mkdir(STATE_DIR, { recursive: true });

  const filePath = path.join(STATE_DIR, `${clientId}.json`);
  const tempPath = `${filePath}.tmp`;

  // Write to temporary file first
  const jsonContent = JSON.stringify(state, null, 2);
  await fs.writeFile(tempPath, jsonContent, 'utf8');

  // Atomic rename (guaranteed by file system)
  await fs.rename(tempPath, filePath);
}

// ═══════════════════════════════════════════════════════════════
// LOAD CLIENT STATE
// ═══════════════════════════════════════════════════════════════

export async function loadClientState(
  clientId: string
): Promise<ClientState | null> {
  /*
  Purpose: Load client state from JSON file

  Algorithm:
  1. Construct file path
  2. Read file contents
  3. Parse JSON
  4. Return null if file doesn't exist
  5. Throw error for other failures (corrupt JSON, permissions, etc.)

  Error Handling:
  - ENOENT (file not found) → return null (expected for new clients)
  - Other errors → throw (unexpected, needs investigation)
  */

  const filePath = path.join(STATE_DIR, `${clientId}.json`);

  try {
    const content = await fs.readFile(filePath, 'utf8');
    return JSON.parse(content) as ClientState;
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      return null; // File doesn't exist (new client)
    }
    // Other errors (permissions, corrupt JSON, etc.)
    throw new Error(`Failed to load client state for ${clientId}: ${error.message}`);
  }
}

// ═══════════════════════════════════════════════════════════════
// LIST ALL CLIENTS
// ═══════════════════════════════════════════════════════════════

export async function listClients(): Promise<string[]> {
  /*
  Purpose: Get list of all client IDs with saved state

  Algorithm:
  1. Read directory contents
  2. Filter for .json files
  3. Extract client ID from filename (remove .json extension)
  4. Return array of client IDs

  Error Handling:
  - ENOENT (directory doesn't exist) → return empty array
  - Other errors → throw
  */

  try {
    const files = await fs.readdir(STATE_DIR);

    // Filter JSON files and extract client IDs
    return files
      .filter(filename => filename.endsWith('.json'))
      .map(filename => filename.replace('.json', ''));

  } catch (error: any) {
    if (error.code === 'ENOENT') {
      return []; // Directory doesn't exist yet (no clients)
    }
    throw new Error(`Failed to list clients: ${error.message}`);
  }
}

// ═══════════════════════════════════════════════════════════════
// DELETE CLIENT STATE
// ═══════════════════════════════════════════════════════════════

export async function deleteClientState(clientId: string): Promise<void> {
  /*
  Purpose: Delete client state file

  Algorithm:
  1. Construct file path
  2. Delete file using fs.unlink
  3. Throw error if file doesn't exist or can't be deleted
  */

  const filePath = path.join(STATE_DIR, `${clientId}.json`);
  await fs.unlink(filePath);
}
```

**Integration with Workflow Hook:**

```typescript
// Update lib/workflow/hooks.ts

import { saveClientState, loadClientState } from './state-store';

export function useWorkflowState(clientId: string) {
  const [machine, setMachine] = useState<RuntimeMachine | null>(null);
  const [currentStepId, setCurrentStepId] = useState<string>('');
  const [collectedInputs, setCollectedInputs] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState<boolean>(true);

  // ═══════════════════════════════════════════════════════════════
  // LOAD STATE ON MOUNT
  // ═══════════════════════════════════════════════════════════════

  useEffect(() => {
    async function loadState() {
      /*
      Algorithm:
      1. Try to load saved state for this client
      2. If state exists, restore workflow and current step
      3. If no state, this is a new client (will load fresh workflow)
      */

      const savedState = await loadClientState(clientId);

      if (savedState) {
        // Restore from saved state
        setCurrentStepId(savedState.currentStepId);
        setCollectedInputs(savedState.collectedInputs);

        // Load the workflow machine
        await loadWorkflow({ workflowId: savedState.workflowId });
      }

      setLoading(false);
    }

    loadState();
  }, [clientId]);

  // ═══════════════════════════════════════════════════════════════
  // SAVE STATE ON CHANGES
  // ═══════════════════════════════════════════════════════════════

  useEffect(() => {
    /*
    Algorithm:
    1. Skip if workflow not loaded or no current step
    2. Construct state object
    3. Save to file (debounced to avoid excessive writes)

    Performance: Consider debouncing (e.g., 1 second delay)
    to avoid saving on every keystroke
    */

    if (!machine || !currentStepId) return;

    async function persistState() {
      const state: ClientState = {
        clientId,
        workflowId: machine.workflowId,
        currentStepId,
        currentStage: currentStep?.stage,
        collectedInputs,
        completedSteps: [], // TODO: Track from progression history
        completedStages: [], // TODO: Compute from stage engine
        lastUpdated: new Date().toISOString()
      };

      await saveClientState(clientId, state);
    }

    // Save state (consider debouncing for production)
    persistState();

  }, [clientId, machine, currentStepId, collectedInputs]);

  // ... rest of hook implementation
}
```

**Test Cases:**

```typescript
describe('Client State Persistence', () => {
  const testClientId = 'test_client_123';

  afterEach(async () => {
    // Clean up test file
    try {
      await deleteClientState(testClientId);
    } catch (e) {
      // Ignore if doesn't exist
    }
  });

  test('saveClientState creates file', async () => {
    const state: ClientState = {
      clientId: testClientId,
      workflowId: 'wf_test_v1',
      currentStepId: 'step1',
      collectedInputs: { name: 'Test' },
      completedSteps: [],
      lastUpdated: new Date().toISOString()
    };

    await saveClientState(testClientId, state);

    const loaded = await loadClientState(testClientId);
    expect(loaded).toEqual(state);
  });

  test('loadClientState returns null for non-existent file', async () => {
    const result = await loadClientState('nonexistent_client');
    expect(result).toBeNull();
  });

  test('listClients returns all client IDs', async () => {
    await saveClientState('client_1', { /* ... */ });
    await saveClientState('client_2', { /* ... */ });

    const clients = await listClients();
    expect(clients).toContain('client_1');
    expect(clients).toContain('client_2');
  });

  test('deleteClientState removes file', async () => {
    await saveClientState(testClientId, { /* ... */ });
    await deleteClientState(testClientId);

    const loaded = await loadClientState(testClientId);
    expect(loaded).toBeNull();
  });
});
```

---

## Task 3: Component Registry

**Reference**: tasks.md COMP-003

### Implementation Approach

#### Registry Pattern Pseudocode

**Pseudocode:**

```
// Define standard interface for all registry components
INTERFACE RegistryComponentProps:
  data: {
    schema?: any              // Resolved schema from task
    initialValues?: Record    // Pre-populated form data
    [key: string]: any        // Additional component-specific data
  }
  status: 'idle' | 'executing' | 'complete' | 'error'
  onComplete: FUNCTION(result: {
    action: string            // 'submit', 'cancel', etc.
    data: any                 // Result data
  }) → void
END INTERFACE

// Create registry as static lookup
CONST UI_COMPONENT_REGISTRY:
  MAP<string, ReactComponent<RegistryComponentProps>> = {
    'form': GenericFormWrapper,
    'document-upload': GenericDocumentUploadWrapper,
    'data-table': GenericDataTableWrapper,
    'review-summary': ReviewSummaryWrapper
  }

FUNCTION getComponent(componentId: string) → ReactComponent | null:
  INPUT: Component ID from YAML
  OUTPUT: React component or null

  1. component ← REGISTRY.GET(componentId)
  2. IF component IS undefined:
       RETURN null
     END IF
  3. RETURN component
END FUNCTION

FUNCTION getAvailableComponentIds() → string[]:
  RETURN KEYS_OF(UI_COMPONENT_REGISTRY)
END FUNCTION
```

**Implementation Code:**

```typescript
// lib/ui/component-registry.ts
import React from 'react';

/**
 * Standard props interface for all registry components
 */
export interface RegistryComponentProps {
  data: {
    schema?: any;
    initialValues?: Record<string, any>;
    [key: string]: any;
  };
  status: 'idle' | 'executing' | 'complete' | 'error';
  onComplete: (result: { action: string; data: any }) => void;
}

export type RegistryComponent = React.ComponentType<RegistryComponentProps>;

/**
 * Component registry - maps component_id to React component
 *
 * Keep this lean! Use schema-driven generic components.
 */
const UI_COMPONENT_REGISTRY: Record<string, RegistryComponent> = {
  'form': React.lazy(() => import('@/components/onboarding/generic-form-wrapper')),
  'document-upload': React.lazy(() => import('@/components/onboarding/generic-document-upload-wrapper')),
  'data-table': React.lazy(() => import('@/components/onboarding/generic-data-table-wrapper')),
  'review-summary': React.lazy(() => import('@/components/onboarding/review-summary-wrapper')),
};

/**
 * Get component by ID
 */
export function getComponent(componentId: string): RegistryComponent | null {
  return UI_COMPONENT_REGISTRY[componentId] || null;
}

/**
 * Get all available component IDs
 */
export function getAvailableComponentIds(): string[] {
  return Object.keys(UI_COMPONENT_REGISTRY);
}
```

**Context7 References:**
- CopilotKit actions: `/copilotkit/copilotkit` - renderAndWaitForResponse pattern
- React component patterns: `/websites/react_dev` - Component composition

---

## Task 4A-4D: Workflow Engine

**Reference**: tasks.md COMP-004A through COMP-004D

### Combined Implementation Approach

#### Runtime Machine Compilation (4A)

**Pseudocode:**

```
FUNCTION compileRuntimeMachine(workflow: CompiledWorkflow) → RuntimeMachine:
  INPUT: Compiled workflow with resolved tasks
  OUTPUT: Optimized runtime state machine

  1. stepIndex ← NEW Map<string, CompiledWorkflowStep>()

  2. FOR EACH step IN workflow.steps:
       stepIndex.SET(step.id, step)
     END FOR

  3. // Validate all transitions
     FOR EACH step IN workflow.steps:
       IF step.next.default != "END":
         IF NOT stepIndex.HAS(step.next.default):
           THROW Error("Invalid transition: {step.id} → {step.next.default}")
         END IF
       END IF

       IF step.next.conditions EXISTS:
         FOR EACH condition IN step.next.conditions:
           IF NOT stepIndex.HAS(condition.then):
             THROW Error("Invalid condition target: {step.id} → {condition.then}")
           END IF
         END FOR
       END IF
     END FOR

  4. RETURN {
       workflowId: workflow.workflowId,
       version: workflow.version,
       initialStepId: workflow.initialStepId,
       steps: workflow.steps,
       stepIndexById: stepIndex
     }
END FUNCTION
```

#### Expression Evaluation (4B)

**Pseudocode:**

```
FUNCTION evaluateExpression(expr: string, inputs: Record) → boolean:
  INPUT: Expression string, collected inputs
  OUTPUT: Boolean result

  1. TRY:
       parts ← SPLIT expr BY whitespace
       leftVar ← TRIM(parts[0])
       operator ← TRIM(parts[1])
       rightValue ← TRIM(parts[2..end].JOIN(' '))

       // Get left value from inputs
       leftValue ← inputs[leftVar]

       IF leftValue IS undefined:
         RETURN false  // Safe default
       END IF

       // Remove quotes from right value
       cleanRight ← rightValue.REPLACE(/['"]/g, '')

       // Evaluate based on operator
       SWITCH operator:
         CASE '>':
           RETURN toNumber(leftValue) > toNumber(cleanRight)
         CASE '>=':
           RETURN toNumber(leftValue) >= toNumber(cleanRight)
         CASE '<':
           RETURN toNumber(leftValue) < toNumber(cleanRight)
         CASE '<=':
           RETURN toNumber(leftValue) <= toNumber(cleanRight)
         CASE '==':
           RETURN toString(leftValue) == toString(cleanRight)
         CASE '!=':
           RETURN toString(leftValue) != toString(cleanRight)
         CASE 'in':
           array ← cleanRight.SPLIT(',').MAP(TRIM)
           RETURN array.INCLUDES(toString(leftValue))
         DEFAULT:
           RETURN false  // Unknown operator
       END SWITCH

     CATCH error:
       RETURN false  // Malformed expression
     END TRY

  EDGE CASES:
    - Undefined variable → false
    - Malformed expression → false
    - Type mismatch → Attempt coercion
    - Division by zero (N/A for supported operators)
END FUNCTION
```

#### State Transition Logic (4C)

**Pseudocode:**

```
FUNCTION nextStepId(step: CompiledWorkflowStep, inputs: Record) → string | null:
  INPUT: Current step, collected inputs
  OUTPUT: Next step ID or null for END

  1. // Check conditions in order (first match wins)
     IF step.next.conditions EXISTS:
       FOR EACH condition IN step.next.conditions:
         IF evaluateExpression(condition.when, inputs):
           RETURN condition.then
         END IF
       END FOR
     END IF

  2. // Use default transition
     IF step.next.default == "END":
       RETURN null
     ELSE:
       RETURN step.next.default
     END IF
END FUNCTION

FUNCTION missingRequiredFields(step: CompiledWorkflowStep, inputs: Record) → string[]:
  INPUT: Current step, collected inputs
  OUTPUT: Array of missing field names

  1. missing ← EMPTY_ARRAY

  2. FOR EACH fieldName IN step.required_fields:
       value ← inputs[fieldName]

       // Check if truly missing
       IF value IS undefined OR value IS null OR value == '':
         missing.ADD(fieldName)
       END IF
     END FOR

  3. RETURN missing
END FUNCTION
```

#### Workflow State Hook (4D)

**Pseudocode:**

```
FUNCTION useWorkflowState(workflowId: string) → WorkflowState:
  INPUT: Workflow ID to load
  OUTPUT: Workflow state object

  1. [machine, setMachine] ← useState(null)
  2. [currentStepId, setCurrentStepId] ← useState(null)
  3. [collectedInputs, setCollectedInputs] ← useState({})

  4. // Load workflow on mount
     useEffect(() => {
       ASYNC loadWorkflow():
         compiled ← AWAIT fetch(`/api/workflows?id={workflowId}`).json()
         setMachine(compiled)
         setCurrentStepId(compiled.initialStepId)
       END ASYNC
       loadWorkflow()
     }, [workflowId])

  5. // Get current step from index
     currentStep ← machine?.stepIndexById.get(currentStepId) || null

  6. // Check if can progress
     FUNCTION canProgress() → boolean:
       IF NOT currentStep:
         RETURN false
       END IF
       missing ← missingRequiredFields(currentStep, collectedInputs)
       RETURN missing.length == 0
     END FUNCTION

  7. // Progress to next step
     FUNCTION progressToNextStep() → ProgressResult:
       IF NOT canProgress():
         RETURN {
           success: false,
           canProgress: false,
           missingFields: missingRequiredFields(currentStep, collectedInputs),
           nextStepId: null
         }
       END IF

       nextId ← nextStepId(currentStep, collectedInputs)
       setCurrentStepId(nextId)

       RETURN {
         success: true,
         canProgress: true,
         missingFields: [],
         nextStepId: nextId,
         isWorkflowComplete: nextId == null
       }
     END FUNCTION

  8. // Update inputs (merge)
     FUNCTION updateInputs(newData: Record) → void:
       setCollectedInputs(prev => ({ ...prev, ...newData }))
     END FUNCTION

  9. RETURN {
       machine,
       currentStep,
       currentStepId,
       collectedInputs,
       canProgress,
       progressToNextStep,
       updateInputs,
       missingFields: currentStep ? missingRequiredFields(currentStep, collectedInputs) : [],
       isComplete: currentStepId == null
     }
END FUNCTION
```

**Implementation Code:**

```typescript
// lib/workflow/hooks.ts
import { useState, useEffect } from 'react';
import { nextStepId, missingRequiredFields } from './engine';

export function useWorkflowState(workflowId: string) {
  const [machine, setMachine] = useState<RuntimeMachine | null>(null);
  const [currentStepId, setCurrentStepId] = useState<string | null>(null);
  const [collectedInputs, setCollectedInputs] = useState<Record<string, any>>({});

  // Load workflow on mount
  useEffect(() => {
    async function loadWorkflow() {
      const params = new URLSearchParams({ id: workflowId });
      const res = await fetch(`/api/workflows?${params}`);
      const compiled = await res.json();
      setMachine(compiled);
      setCurrentStepId(compiled.initialStepId);
    }
    loadWorkflow();
  }, [workflowId]);

  // Get current step
  const currentStep = machine?.stepIndexById.get(currentStepId || '') || null;

  // Check if can progress
  const canProgress = () => {
    if (!currentStep) return false;
    return missingRequiredFields(currentStep, collectedInputs).length === 0;
  };

  // Progress to next step
  const progressToNextStep = () => {
    if (!currentStep || !canProgress()) {
      return {
        success: false,
        canProgress: false,
        missingFields: missingRequiredFields(currentStep!, collectedInputs),
        nextStepId: null,
        isWorkflowComplete: false,
      };
    }

    const nextId = nextStepId(currentStep, collectedInputs);
    setCurrentStepId(nextId);

    return {
      success: true,
      canProgress: true,
      missingFields: [],
      nextStepId: nextId,
      isWorkflowComplete: nextId === null,
    };
  };

  // Update inputs
  const updateInputs = (newData: Record<string, any>) => {
    setCollectedInputs((prev) => ({ ...prev, ...newData }));
  };

  return {
    machine,
    currentStep,
    currentStepId,
    collectedInputs,
    canProgress,
    progressToNextStep,
    updateInputs,
    missingFields: currentStep ? missingRequiredFields(currentStep, collectedInputs) : [],
    isComplete: currentStepId === null,
  };
}
```

**Context7 References:**
- React hooks: `/websites/react_dev` - useState, useEffect custom hooks
- CopilotKit state management: `/copilotkit/copilotkit` - Integration patterns

---

## Task 4E: Stage Modeling and Progression (~1 hour)

**Objective:** Implement stage support for grouping workflow steps and tracking stage-level progress

**Files to Modify:**
- `lib/workflow/schema.ts` - Add StageDefinition interface
- `lib/workflow/engine.ts` - Add stage computation functions
- `lib/workflow/hooks.ts` - Expose stage state

**Files to Create:**
- `components/onboarding/stage-header.tsx` - Stage progress UI

**Pseudocode:**

```typescript
// ═══════════════════════════════════════════════════════════════
// lib/workflow/schema.ts - Add Stage Interfaces
// ═══════════════════════════════════════════════════════════════

export interface StageDefinition {
  id: string;                           // Unique stage identifier
  name: string;                         // Human-readable name
  description?: string;                 // Optional description
}

export interface WorkflowDefinition {
  id: string;
  name: string;
  version: number;
  applies_to?: { /* ... */ };
  stages?: StageDefinition[];           // NEW: Optional stages array
  steps: WorkflowStepReference[];
}

export interface WorkflowStepReference {
  id: string;
  stage?: string;                       // NEW: Optional stage membership
  task_ref: string;
  next: { /* ... */ };
}

export interface RuntimeMachine {
  workflowId: string;
  version: number;
  stages: StageDefinition[];            // NEW: Stages included in machine
  initialStepId: string;
  steps: CompiledWorkflowStep[];
  stepIndexById: Record<string, number>;
}

// ═══════════════════════════════════════════════════════════════
// lib/workflow/engine.ts - Stage Computation Functions
// ═══════════════════════════════════════════════════════════════

export interface StageStatus {
  stageId: string;
  totalSteps: number;                   // Total steps in this stage
  completedSteps: number;               // Completed steps
  requiredSteps: number;                // Steps required for progression
  isComplete: boolean;                  // All required steps done
  progress: number;                     // Percentage (0-100)
}

// ─────────────────────────────────────────────────────────────
// GET STAGE STATUS
// ─────────────────────────────────────────────────────────────

export function getStageStatus(
  machine: RuntimeMachine,
  stageId: string,
  completedStepIds: string[]
): StageStatus {
  /*
  Purpose: Compute completion status for a stage

  Algorithm:
  1. Find all steps belonging to this stage
  2. Count total steps
  3. Count completed steps (intersection with completedStepIds)
  4. Determine required steps (exclude optional/conditional paths)
  5. Compute completion percentage
  6. Mark stage complete if all required steps done

  Optional Steps:
  - Steps only reachable via conditional transitions
  - Example: EDD step only required if risk_score > 70
  - These don't block stage progression
  */

  // Find all steps in this stage
  const stageSteps = machine.steps.filter(step => step.stage === stageId);

  const totalSteps = stageSteps.length;
  const completedSteps = stageSteps.filter(step =>
    completedStepIds.includes(step.id)
  ).length;

  // For POC: All steps are required (P1: handle optional steps)
  const requiredSteps = totalSteps;

  const progress = totalSteps > 0
    ? Math.round((completedSteps / totalSteps) * 100)
    : 100;

  const isComplete = completedSteps >= requiredSteps;

  return {
    stageId,
    totalSteps,
    completedSteps,
    requiredSteps,
    isComplete,
    progress
  };
}

// ─────────────────────────────────────────────────────────────
// CAN PROGRESS TO NEXT STAGE
// ─────────────────────────────────────────────────────────────

export function canProgressToNextStage(
  machine: RuntimeMachine,
  currentStage: string,
  completedStepIds: string[]
): boolean {
  /*
  Purpose: Check if all required steps in current stage are complete

  Algorithm:
  1. Get stage status
  2. Return isComplete flag
  3. This determines if user can advance to next stage
  */

  const status = getStageStatus(machine, currentStage, completedStepIds);
  return status.isComplete;
}

// ─────────────────────────────────────────────────────────────
// GET ALL STAGE STATUSES
// ─────────────────────────────────────────────────────────────

export function getAllStageStatuses(
  machine: RuntimeMachine,
  completedStepIds: string[]
): StageStatus[] {
  /*
  Purpose: Get status for all stages in workflow

  Algorithm:
  1. Map over stages array
  2. Compute status for each stage
  3. Return array of statuses

  Use Case: Display stage progress indicators in UI
  */

  return machine.stages.map(stage =>
    getStageStatus(machine, stage.id, completedStepIds)
  );
}

// ─────────────────────────────────────────────────────────────
// GET CURRENT STAGE
// ─────────────────────────────────────────────────────────────

export function getCurrentStage(
  machine: RuntimeMachine,
  currentStepId: string
): string | null {
  /*
  Purpose: Get the stage of the current step

  Algorithm:
  1. Find current step in machine
  2. Return its stage field
  3. Return null if step has no stage or step not found
  */

  const step = machine.steps.find(s => s.id === currentStepId);
  return step?.stage || null;
}

// ═══════════════════════════════════════════════════════════════
// lib/workflow/hooks.ts - Add Stage State to Hook
// ═══════════════════════════════════════════════════════════════

export function useWorkflowState(clientId: string) {
  // ... existing state ...

  const [completedSteps, setCompletedSteps] = useState<string[]>([]);

  // ─────────────────────────────────────────────────────────────
  // COMPUTED STAGE STATE
  // ─────────────────────────────────────────────────────────────

  const currentStage = useMemo(() => {
    if (!machine || !currentStepId) return null;
    return getCurrentStage(machine, currentStepId);
  }, [machine, currentStepId]);

  const stageStatuses = useMemo(() => {
    if (!machine) return [];
    return getAllStageStatuses(machine, completedSteps);
  }, [machine, completedSteps]);

  const completedStages = useMemo(() => {
    return stageStatuses
      .filter(status => status.isComplete)
      .map(status => status.stageId);
  }, [stageStatuses]);

  const stageProgress = useMemo(() => {
    if (!machine || !currentStage) return 0;
    const status = getStageStatus(machine, currentStage, completedSteps);
    return status.progress;
  }, [machine, currentStage, completedSteps]);

  // ─────────────────────────────────────────────────────────────
  // TRACK COMPLETED STEPS
  // ─────────────────────────────────────────────────────────────

  const markStepComplete = useCallback((stepId: string) => {
    /*
    Purpose: Mark a step as completed

    Algorithm:
    1. Add stepId to completedSteps array (if not already present)
    2. This triggers re-computation of stage statuses
    3. Persist to client state
    */

    setCompletedSteps(prev => {
      if (prev.includes(stepId)) return prev;
      return [...prev, stepId];
    });
  }, []);

  // Return extended hook interface
  return {
    // ... existing exports ...
    currentStage,
    stageStatuses,
    completedStages,
    stageProgress,
    markStepComplete,
    completedSteps
  };
}

// ═══════════════════════════════════════════════════════════════
// components/onboarding/stage-header.tsx - Stage UI Component
// ═══════════════════════════════════════════════════════════════

import { StageStatus } from '@/lib/workflow/engine';

interface StageHeaderProps {
  statuses: StageStatus[];
  currentStage: string | null;
}

export function StageHeader({ statuses, currentStage }: StageHeaderProps) {
  /*
  Purpose: Display stage progress indicators

  UI Layout:
  [✓ Info Collection] → [◉ Compliance] → [○ Finalization]
     (completed)         (in progress)      (pending)

  Algorithm:
  1. Map over stage statuses
  2. Render each stage with:
     - Checkmark if complete
     - Filled circle if current
     - Empty circle if pending
  3. Show progress bar for current stage
  */

  return (
    <div className="flex items-center gap-4 p-4 bg-gray-50 rounded">
      {statuses.map((status, index) => {
        const isCurrent = status.stageId === currentStage;
        const isComplete = status.isComplete;
        const isPending = !isCurrent && !isComplete;

        return (
          <div key={status.stageId} className="flex items-center gap-2">
            {/* Stage indicator */}
            <div
              className={cn(
                'flex items-center gap-2 px-3 py-2 rounded',
                isCurrent && 'bg-blue-100 text-blue-700',
                isComplete && 'bg-green-100 text-green-700',
                isPending && 'bg-gray-200 text-gray-500'
              )}
            >
              {/* Icon */}
              {isComplete && <CheckCircle className="w-4 h-4" />}
              {isCurrent && <Circle className="w-4 h-4 fill-current" />}
              {isPending && <Circle className="w-4 h-4" />}

              {/* Stage name */}
              <span className="text-sm font-medium">
                {status.stageId.replace(/_/g, ' ')}
              </span>

              {/* Progress percentage for current stage */}
              {isCurrent && (
                <span className="text-xs">({status.progress}%)</span>
              )}
            </div>

            {/* Arrow between stages */}
            {index < statuses.length - 1 && (
              <ChevronRight className="w-4 h-4 text-gray-400" />
            )}
          </div>
        );
      })}
    </div>
  );
}
```

**Test Cases:**

```typescript
describe('Stage Engine', () => {
  const machine: RuntimeMachine = {
    workflowId: 'test_wf',
    version: 1,
    stages: [
      { id: 'stage1', name: 'Stage 1' },
      { id: 'stage2', name: 'Stage 2' }
    ],
    steps: [
      { id: 'step1', stage: 'stage1', /* ... */ },
      { id: 'step2', stage: 'stage1', /* ... */ },
      { id: 'step3', stage: 'stage2', /* ... */ }
    ],
    stepIndexById: { step1: 0, step2: 1, step3: 2 },
    initialStepId: 'step1'
  };

  test('getStageStatus returns correct completion', () => {
    const status = getStageStatus(machine, 'stage1', ['step1']);

    expect(status.totalSteps).toBe(2);
    expect(status.completedSteps).toBe(1);
    expect(status.progress).toBe(50);
    expect(status.isComplete).toBe(false);
  });

  test('getStageStatus marks stage complete when all steps done', () => {
    const status = getStageStatus(machine, 'stage1', ['step1', 'step2']);

    expect(status.completedSteps).toBe(2);
    expect(status.progress).toBe(100);
    expect(status.isComplete).toBe(true);
  });

  test('canProgressToNextStage validates completion', () => {
    const canProgress1 = canProgressToNextStage(machine, 'stage1', ['step1']);
    expect(canProgress1).toBe(false);

    const canProgress2 = canProgressToNextStage(machine, 'stage1', ['step1', 'step2']);
    expect(canProgress2).toBe(true);
  });

  test('getCurrentStage returns correct stage for step', () => {
    expect(getCurrentStage(machine, 'step1')).toBe('stage1');
    expect(getCurrentStage(machine, 'step3')).toBe('stage2');
  });

  test('getAllStageStatuses returns statuses for all stages', () => {
    const statuses = getAllStageStatuses(machine, ['step1', 'step2']);

    expect(statuses).toHaveLength(2);
    expect(statuses[0].stageId).toBe('stage1');
    expect(statuses[0].isComplete).toBe(true);
    expect(statuses[1].stageId).toBe('stage2');
    expect(statuses[1].isComplete).toBe(false);
  });
});
```

---

## Task 5A-5E: Schema-Driven UI Components

**Reference**: tasks.md COMP-005A through COMP-005E

### Task 5A: Field Schema Types

**Implementation Code:**

```typescript
// lib/types/field-schema.ts

/**
 * Supported field types for generic form component
 */
export type FieldType =
  | 'text'
  | 'email'
  | 'tel'
  | 'number'
  | 'date'
  | 'textarea'
  | 'select'
  | 'checkbox'
  | 'radio';

/**
 * Field schema definition - defines a single form field
 */
export interface FieldSchema {
  /** Field identifier (e.g., "legal_name") */
  name: string;

  /** Display label (e.g., "Legal Business Name") */
  label: string;

  /** Input type */
  type: FieldType;

  /** Is field required? */
  required?: boolean;

  /** Placeholder text */
  placeholder?: string;

  /** Help text shown below field */
  helpText?: string;

  /** Validation rules */
  validation?: {
    pattern?: string;      // Regex pattern
    minLength?: number;
    maxLength?: number;
    min?: number;          // For number/date
    max?: number;
  };

  /** Options for select/radio */
  options?: Array<{
    value: string;
    label: string;
  }>;

  /** Default value */
  defaultValue?: any;

  /** Conditional visibility expression (e.g., "entity_type == 'Corporation'") */
  visible?: string;
}

/**
 * Complete form schema
 */
export interface FormSchema {
  /** Array of field definitions */
  fields: FieldSchema[];

  /** Layout option */
  layout?: 'single-column' | 'two-column' | 'grid';

  /** Submit button label */
  submitLabel?: string;

  /** Cancel button label */
  cancelLabel?: string;
}

/**
 * Document upload schema
 */
export interface DocumentSchema {
  documents: Array<{
    id: string;
    label: string;
    required: boolean;
    acceptedTypes: string[];
    maxSize: number;
    helpText?: string;
  }>;
  allowMultiple?: boolean;
  uploadLabel?: string;
}
```

### Task 5B: Generic Form Component

**Pseudocode:**

```
FUNCTION GenericForm(props: GenericFormProps) → ReactElement:
  INPUT: {
    schema: FormSchema,
    initialData?: Record,
    isLoading?: boolean,
    onSubmit: FUNCTION(data),
    onCancel?: FUNCTION()
  }
  OUTPUT: Rendered form with all fields

  // State management
  1. [formData, setFormData] ← useState(initialData || {})
  2. [errors, setErrors] ← useState({})

  // Initialize with default values
  3. useEffect(() => {
       defaults ← {}
       FOR EACH field IN schema.fields:
         IF field.defaultValue EXISTS:
           defaults[field.name] ← field.defaultValue
         END IF
       END FOR
       setFormData({ ...defaults, ...initialData })
     }, [schema, initialData])

  // Check field visibility
  4. FUNCTION isFieldVisible(field: FieldSchema) → boolean:
       IF field.visible IS undefined:
         RETURN true
       END IF

       TRY:
         [leftVar, operator, rightValue] ← PARSE field.visible
         leftValue ← formData[leftVar]
         cleanRight ← rightValue WITHOUT quotes

         SWITCH operator:
           CASE '==': RETURN leftValue == cleanRight
           CASE '!=': RETURN leftValue != cleanRight
           CASE 'in': RETURN cleanRight.split(',').includes(leftValue)
           DEFAULT: RETURN true
         END SWITCH
       CATCH:
         RETURN true  // Show field if expression fails
       END TRY
     END FUNCTION

  // Validate single field
  5. FUNCTION validateField(field, value) → string | null:
       // Required check
       IF field.required AND (value IS empty):
         RETURN "{field.label} is required"
       END IF

       // Pattern validation
       IF field.validation.pattern AND value:
         regex ← NEW RegExp(field.validation.pattern)
         IF NOT regex.test(value):
           RETURN "{field.label} format is invalid"
         END IF
       END IF

       // Length validation
       IF field.validation.minLength AND value.length < minLength:
         RETURN "{field.label} must be at least {minLength} characters"
       END IF

       // Number range validation
       IF field.type == 'number':
         IF field.validation.min AND value < min:
           RETURN "{field.label} must be at least {min}"
         END IF
       END IF

       RETURN null  // No errors
     END FUNCTION

  // Handle field change
  6. FUNCTION handleChange(fieldName, value) → void:
       setFormData(prev => ({ ...prev, [fieldName]: value }))

       // Clear error when user types
       IF errors[fieldName]:
         setErrors(prev => { ...prev WITHOUT fieldName })
       END IF
     END FUNCTION

  // Handle submit
  7. FUNCTION handleSubmit(event) → void:
       event.preventDefault()

       validationErrors ← {}
       FOR EACH field IN schema.fields:
         IF isFieldVisible(field):
           error ← validateField(field, formData[field.name])
           IF error:
             validationErrors[field.name] ← error
           END IF
         END IF
       END FOR

       IF validationErrors NOT empty:
         setErrors(validationErrors)
         RETURN
       END IF

       // Filter out hidden fields
       visibleData ← {}
       FOR EACH field IN schema.fields:
         IF isFieldVisible(field) AND formData[field.name] EXISTS:
           visibleData[field.name] ← formData[field.name]
         END IF
       END FOR

       onSubmit(visibleData)
     END FUNCTION

  // Render
  8. layoutClass ← MAP schema.layout TO Tailwind classes

  9. RETURN (
       <form onSubmit={handleSubmit}>
         <div className={layoutClass}>
           {schema.fields.MAP(field => (
             isFieldVisible(field) ? (
               <FormField
                 key={field.name}
                 field={field}
                 value={formData[field.name]}
                 error={errors[field.name]}
                 disabled={isLoading}
                 onChange={value => handleChange(field.name, value)}
               />
             ) : null
           ))}
         </div>

         <div className="button-row">
           {onCancel && <button onClick={onCancel}>Cancel</button>}
           <button type="submit" disabled={isLoading}>
             {isLoading ? 'Submitting...' : schema.submitLabel || 'Submit'}
           </button>
         </div>
       </form>
     )
END FUNCTION
```

**Context7 References:**
- React forms and state: `/websites/react_dev` - Form handling patterns
- React hooks: `/websites/react_dev` - useState, useEffect

### Task 5E: Registry Wrappers

**Pseudocode:**

```
FUNCTION GenericFormWrapper(props: RegistryComponentProps) → ReactElement:
  INPUT: Registry standard props
  OUTPUT: GenericForm with extracted schema

  1. schema ← props.data.schema || { fields: [], layout: 'single-column' }
  2. initialValues ← props.data.initialValues || {}
  3. isLoading ← props.status == 'executing'

  4. FUNCTION handleSubmit(formData) → void:
       props.onComplete({
         action: 'submit',
         data: formData
       })
     END FUNCTION

  5. FUNCTION handleCancel() → void:
       props.onComplete({
         action: 'cancel',
         data: {}
       })
     END FUNCTION

  6. RETURN (
       <GenericForm
         schema={schema}
         initialData={initialValues}
         isLoading={isLoading}
         onSubmit={handleSubmit}
         onCancel={handleCancel}
       />
     )
END FUNCTION
```

---

## Task 5F: Chat Section Component (~2 hours)

**Objective:** Create full-height chat interface as primary interaction component

**Files to Create:**
- `components/chat/chat-section.tsx`
- `components/chat/message.tsx`
- `components/chat/system-message.tsx`

**Pseudocode:**

```typescript
// ═══════════════════════════════════════════════════════════════
// components/chat/message.tsx
// ═══════════════════════════════════════════════════════════════

interface MessageProps {
  role: 'user' | 'assistant' | 'system';
  content: string;
  type?: 'info' | 'success' | 'error' | 'warning'; // For system messages
  timestamp?: Date;
}

export function Message({ role, content, type, timestamp }: MessageProps) {
  /*
  Purpose: Render individual message with role-specific styling

  Layout:
  - User messages: right-aligned, blue background
  - AI messages: left-aligned, gray background
  - System messages: centered, colored by type

  Algorithm:
  1. Determine styling class based on role and type
  2. Render message bubble
  3. Include timestamp if provided
  */

  const styles = {
    user: 'ml-auto bg-blue-600 text-white',
    assistant: 'mr-auto bg-gray-100 text-gray-900',
    system: {
      info: 'mx-auto bg-blue-50 border-blue-200 text-blue-800',
      success: 'mx-auto bg-green-50 border-green-200 text-green-800',
      error: 'mx-auto bg-red-50 border-red-200 text-red-800',
      warning: 'mx-auto bg-yellow-50 border-yellow-200 text-yellow-800'
    }
  };

  if (role === 'system') {
    return (
      <div className={`system-message ${styles.system[type || 'info']}`}>
        <Icon type={type} />
        <span>{content}</span>
      </div>
    );
  }

  return (
    <div className={`message ${styles[role]}`}>
      <div className="message-content">
        {content}
      </div>
      {timestamp && (
        <div className="message-timestamp">
          {formatTime(timestamp)}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// components/chat/system-message.tsx
// ═══════════════════════════════════════════════════════════════

interface SystemMessageProps {
  type: 'info' | 'success' | 'error' | 'warning';
  children: React.ReactNode;
}

export function SystemMessage({ type, children }: SystemMessageProps) {
  /*
  Purpose: Render system message with icon and colored background

  Icon mapping:
  - info: ⓘ (info circle)
  - success: ✓ (checkmark)
  - error: ✗ (x mark)
  - warning: ⚠ (warning triangle)
  */

  const icons = {
    info: <InfoIcon className="w-4 h-4" />,
    success: <CheckCircleIcon className="w-4 h-4" />,
    error: <XCircleIcon className="w-4 h-4" />,
    warning: <AlertTriangleIcon className="w-4 h-4" />
  };

  const styles = {
    info: 'bg-blue-50 border-blue-200 text-blue-800',
    success: 'bg-green-50 border-green-200 text-green-800',
    error: 'bg-red-50 border-red-200 text-red-800',
    warning: 'bg-yellow-50 border-yellow-200 text-yellow-800'
  };

  return (
    <div
      className={`flex items-center gap-2 p-3 border rounded-lg ${styles[type]}`}
      role="status"
      aria-live="polite"
    >
      {icons[type]}
      <span className="text-sm">{children}</span>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// components/chat/chat-section.tsx
// ═══════════════════════════════════════════════════════════════

interface ChatSectionProps {
  messages: Message[];
  onSendMessage: (message: string) => void;
  className?: string;
  disabled?: boolean; // When overlay is open
}

export function ChatSection({
  messages,
  onSendMessage,
  className,
  disabled = false
}: ChatSectionProps) {
  /*
  Purpose: Full-height chat interface with message list and input

  Layout:
  ┌─────────────────────┐
  │ Messages (scroll)   │
  │ [Message 1]         │
  │ [Message 2]         │
  │ [Message 3]         │
  │ ...                 │
  ├─────────────────────┤
  │ [Input] [Send]      │
  └─────────────────────┘

  Algorithm:
  1. Display message list (auto-scroll to bottom)
  2. Render input box fixed at bottom
  3. Handle send message
  4. Disable interaction when overlay active
  */

  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!inputValue.trim() || disabled) return;

    onSendMessage(inputValue);
    setInputValue('');
  };

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Message list - scrollable */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg, idx) => (
          <Message
            key={idx}
            role={msg.role}
            content={msg.content}
            type={msg.type}
            timestamp={msg.timestamp}
          />
        ))}
        {/* Scroll anchor */}
        <div ref={messagesEndRef} />
      </div>

      {/* Input box - fixed at bottom */}
      <div className="border-t p-4 bg-white">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder={disabled ? "Please complete the form..." : "Type a message..."}
            className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={disabled}
          />
          <button
            type="submit"
            disabled={disabled || !inputValue.trim()}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            Send
          </button>
        </form>
      </div>
    </div>
  );
}
```

**Styling Notes:**

```css
/* Message styling */
.message {
  @apply max-w-[80%] p-3 rounded-lg;
}

.message.user {
  @apply ml-auto bg-blue-600 text-white rounded-br-none;
}

.message.assistant {
  @apply mr-auto bg-gray-100 text-gray-900 rounded-bl-none;
}

.system-message {
  @apply mx-auto max-w-[90%] flex items-center gap-2 p-3 border rounded-lg text-sm;
}

/* Auto-scroll behavior */
.messages-container {
  /* Use flexbox with column-reverse for auto-scroll */
  @apply flex flex-col-reverse overflow-y-auto;
}
```

**Accessibility:**
- ARIA labels on input: `aria-label="Chat message input"`
- System messages: `role="status"` and `aria-live="polite"`
- Focus management: Input should receive focus when overlay closes

---

## Task 5G: Form Overlay Component (~2.5 hours)

**Objective:** Create modal overlay for rendering forms on top of chat

**Files to Create:**
- `components/onboarding/form-overlay.tsx`

**Pseudocode:**

```typescript
// ═══════════════════════════════════════════════════════════════
// components/onboarding/form-overlay.tsx
// ═══════════════════════════════════════════════════════════════

interface FormOverlayProps {
  componentId: string;
  data: any;
  onSubmit: (formData: any) => void;
  onClose: () => void;
  isOpen: boolean;
}

export function FormOverlay({
  componentId,
  data,
  onSubmit,
  onClose,
  isOpen
}: FormOverlayProps) {
  /*
  Purpose: Modal overlay for form rendering

  Components:
  1. Backdrop - semi-transparent, click to close
  2. Form container - centered, scrollable
  3. Close button - top-right X
  4. Form component - from registry

  Behavior:
  - Escape key closes overlay
  - Click outside closes overlay
  - Focus trap: tab cycles within overlay
  - Animation: slide-in from bottom
  */

  const overlayRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  // Get component from registry
  const Component = getComponent(componentId);

  // ─────────────────────────────────────────────────────────────
  // ESCAPE KEY HANDLER
  // ─────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  // ─────────────────────────────────────────────────────────────
  // FOCUS TRAP
  // ─────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!isOpen || !overlayRef.current) return;

    // Save previous focus
    previousFocusRef.current = document.activeElement as HTMLElement;

    // Focus first input in overlay
    const firstInput = overlayRef.current.querySelector<HTMLElement>(
      'input, textarea, select, button'
    );
    firstInput?.focus();

    // Trap focus within overlay
    const handleTabKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab' || !overlayRef.current) return;

      const focusableElements = overlayRef.current.querySelectorAll<HTMLElement>(
        'button, input, textarea, select, [tabindex]:not([tabindex="-1"])'
      );

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      if (e.shiftKey) {
        // Shift + Tab
        if (document.activeElement === firstElement) {
          lastElement.focus();
          e.preventDefault();
        }
      } else {
        // Tab
        if (document.activeElement === lastElement) {
          firstElement.focus();
          e.preventDefault();
        }
      }
    };

    document.addEventListener('keydown', handleTabKey);

    // Cleanup: restore focus
    return () => {
      document.removeEventListener('keydown', handleTabKey);
      previousFocusRef.current?.focus();
    };
  }, [isOpen]);

  // ─────────────────────────────────────────────────────────────
  // HANDLE BACKDROP CLICK
  // ─────────────────────────────────────────────────────────────

  const handleBackdropClick = (e: React.MouseEvent) => {
    // Only close if clicking backdrop itself, not form container
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  // ─────────────────────────────────────────────────────────────
  // HANDLE FORM COMPLETE
  // ─────────────────────────────────────────────────────────────

  const handleComplete = (result: { action: string; data: any }) => {
    /*
    Purpose: Handle form completion

    Actions:
    - submit: Call onSubmit with data
    - cancel: Call onClose without data
    */

    if (result.action === 'submit') {
      onSubmit(result.data);
    } else if (result.action === 'cancel') {
      onClose();
    }
  };

  if (!isOpen) return null;

  if (!Component) {
    return (
      <div className="overlay-error">
        <p>Component "{componentId}" not found in registry</p>
        <button onClick={onClose}>Close</button>
      </div>
    );
  }

  return (
    <div
      className="form-overlay-container"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="overlay-title"
      ref={overlayRef}
    >
      {/* Backdrop */}
      <div className="backdrop" />

      {/* Form container */}
      <div className="form-container">
        {/* Close button */}
        <button
          className="close-button"
          onClick={onClose}
          aria-label="Close form"
        >
          ✕
        </button>

        {/* Form component from registry */}
        <Component
          data={data}
          status="inProgress"
          onComplete={handleComplete}
        />
      </div>
    </div>
  );
}
```

**Styling (Tailwind + CSS):**

```css
/* Overlay container */
.form-overlay-container {
  @apply fixed inset-0 z-50 flex items-center justify-center p-4;
}

/* Backdrop */
.backdrop {
  @apply absolute inset-0 bg-black/50 backdrop-blur-sm;
  animation: fadeIn 0.15s ease-out;
}

/* Form container */
.form-container {
  @apply relative bg-white rounded-lg shadow-2xl max-h-[90vh] overflow-y-auto;
  @apply w-full max-w-2xl p-6;
  animation: slideIn 0.2s ease-out;
}

/* Close button */
.close-button {
  @apply absolute top-4 right-4 w-8 h-8 flex items-center justify-center;
  @apply rounded-full hover:bg-gray-100 text-gray-500 hover:text-gray-700;
  @apply transition-colors;
}

/* Animations */
@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateY(20px) scale(0.95);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

/* Mobile: Full screen */
@media (max-width: 768px) {
  .form-container {
    @apply max-w-full h-full m-0 rounded-none;
    animation: slideInMobile 0.3s ease-out;
  }

  @keyframes slideInMobile {
    from {
      transform: translateY(100%);
    }
    to {
      transform: translateY(0);
    }
  }
}
```

---

## Task 5H: Right Panel Refactor (~1.5 hours)

**Objective:** Refactor right panel to chat-first with conditional overlay

**Files to Modify:**
- `components/layout/right-pane.tsx`

**Pseudocode:**

```typescript
// ═══════════════════════════════════════════════════════════════
// components/layout/right-pane.tsx
// ═══════════════════════════════════════════════════════════════

interface RightPaneProps {
  clientId: string;
}

export function RightPane({ clientId }: RightPaneProps) {
  /*
  Purpose: Chat-first interface with overlay support

  States:
  1. Chat-only (default) - full height chat
  2. Overlay active - chat dimmed, form overlay visible
  3. Post-submit - return to chat with success message

  Algorithm:
  1. Render ChatSection (always present)
  2. Conditionally render FormOverlay when overlay state active
  3. Handle form submission and closure
  4. Manage system messages
  */

  // Get workflow state and overlay handlers from hook
  const {
    messages,
    overlayState,
    handleFormSubmit,
    handleFormClose,
    sendMessage
  } = useWorkflowState(clientId);

  return (
    <div className="h-full relative">
      {/* Chat Section - always present */}
      <ChatSection
        messages={messages}
        onSendMessage={sendMessage}
        className={overlayState.visible ? 'opacity-50 pointer-events-none' : ''}
        disabled={overlayState.visible}
      />

      {/* Form Overlay - conditional */}
      {overlayState.visible && overlayState.componentId && (
        <FormOverlay
          componentId={overlayState.componentId}
          data={overlayState.data}
          isOpen={overlayState.visible}
          onSubmit={handleFormSubmit}
          onClose={handleFormClose}
        />
      )}
    </div>
  );
}
```

**State Flow:**

```typescript
/*
State Transitions:

1. Initial: Chat-Only
   { visible: false, componentId: null, data: null }
   └─> ChatSection renders full height

2. Form Triggered (by AI or manual)
   { visible: true, componentId: 'form', data: {...} }
   └─> FormOverlay renders
   └─> ChatSection dimmed

3. Form Submitted
   { visible: false, componentId: null, data: null }
   └─> handleFormSubmit called
   └─> Overlay closes
   └─> Success message added to chat
   └─> Workflow progresses

4. Form Closed (without submit)
   { visible: false, componentId: null, data: null }
   └─> handleFormClose called
   └─> Overlay closes
   └─> Info message added to chat
*/
```

---

## Task 5I: Update Workflow Hook for Overlay State (~1 hour)

**Objective:** Add overlay state management to useWorkflowState hook

**Files to Modify:**
- `lib/workflow/hooks.ts`

**Pseudocode:**

```typescript
// ═══════════════════════════════════════════════════════════════
// lib/workflow/hooks.ts - Add Overlay State
// ═══════════════════════════════════════════════════════════════

interface OverlayState {
  visible: boolean;
  componentId: string | null;
  data: any;
  step: WorkflowStep | null;
}

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  type?: 'info' | 'success' | 'error' | 'warning';
  timestamp: Date;
}

export function useWorkflowState(clientId: string) {
  // ... existing state ...

  const [messages, setMessages] = useState<Message[]>([]);
  const [overlayState, setOverlayState] = useState<OverlayState>({
    visible: false,
    componentId: null,
    data: null,
    step: null
  });

  // ─────────────────────────────────────────────────────────────
  // ADD SYSTEM MESSAGE
  // ─────────────────────────────────────────────────────────────

  const addSystemMessage = useCallback((
    content: string,
    type: 'info' | 'success' | 'error' | 'warning' = 'info'
  ) => {
    /*
    Purpose: Add system message to chat

    Algorithm:
    1. Create message object with role='system'
    2. Include type for styling
    3. Add timestamp
    4. Append to messages array
    */

    const message: Message = {
      role: 'system',
      content,
      type,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, message]);
  }, []);

  // ─────────────────────────────────────────────────────────────
  // SHOW FORM OVERLAY
  // ─────────────────────────────────────────────────────────────

  const showFormOverlay = useCallback((
    componentId: string,
    data: any,
    step: WorkflowStep
  ) => {
    /*
    Purpose: Open form overlay

    Algorithm:
    1. Set overlay state (visible = true)
    2. Store componentId, data, and step
    3. Add system message to chat
    */

    setOverlayState({
      visible: true,
      componentId,
      data,
      step
    });

    addSystemMessage(
      `Please fill out the ${step.task_ref} form to continue`,
      'info'
    );
  }, [addSystemMessage]);

  // ─────────────────────────────────────────────────────────────
  // HANDLE FORM SUBMIT
  // ─────────────────────────────────────────────────────────────

  const handleFormSubmit = useCallback((formData: any) => {
    /*
    Purpose: Handle form submission

    Algorithm:
    1. Update collected inputs with form data
    2. Mark current step as complete
    3. Close overlay
    4. Add success message to chat
    5. Progress to next step
    6. Add progression message to chat
    */

    // 1. Update inputs
    setCollectedInputs(prev => ({
      ...prev,
      ...formData
    }));

    // 2. Mark step complete
    if (overlayState.step) {
      markStepComplete(overlayState.step.id);
    }

    // 3. Close overlay
    setOverlayState({
      visible: false,
      componentId: null,
      data: null,
      step: null
    });

    // 4. Success message
    addSystemMessage('Form submitted successfully!', 'success');

    // 5. Progress workflow
    const result = progressToNextStep();

    // 6. Progression message
    if (result.success) {
      if (result.nextStepId === 'END') {
        addSystemMessage('Workflow completed! 🎉', 'success');
      } else {
        addSystemMessage(
          `Moving to next step: ${result.nextStepId}`,
          'info'
        );
      }
    } else {
      addSystemMessage(
        `Error progressing workflow: ${result.error}`,
        'error'
      );
    }
  }, [
    overlayState,
    markStepComplete,
    progressToNextStep,
    addSystemMessage
  ]);

  // ─────────────────────────────────────────────────────────────
  // HANDLE FORM CLOSE
  // ─────────────────────────────────────────────────────────────

  const handleFormClose = useCallback(() => {
    /*
    Purpose: Handle overlay close without submitting

    Algorithm:
    1. Close overlay
    2. Add informational message
    */

    setOverlayState({
      visible: false,
      componentId: null,
      data: null,
      step: null
    });

    addSystemMessage(
      'Form closed. You can resume by asking me to continue.',
      'info'
    );
  }, [addSystemMessage]);

  // Return extended interface
  return {
    // ... existing exports ...
    messages,
    overlayState,
    showFormOverlay,
    handleFormSubmit,
    handleFormClose,
    addSystemMessage
  };
}
```

---

## Task 5J: Update renderUI Action for Overlay (~30 min)

**Objective:** Change renderUI action to trigger overlay instead of inline render

**Files to Modify:**
- `app/page.tsx` (or main app component)

**Pseudocode:**

```typescript
// ═══════════════════════════════════════════════════════════════
// app/page.tsx - Update renderUI Action
// ═══════════════════════════════════════════════════════════════

export default function OnboardingPage() {
  const clientId = 'client_123'; // Or from route params

  const {
    machine,
    currentStep,
    showFormOverlay,
    overlayState,
    handleFormSubmit,
    handleFormClose,
    messages
  } = useWorkflowState(clientId);

  // ─────────────────────────────────────────────────────────────
  // RENDER UI ACTION - OVERLAY PATTERN
  // ─────────────────────────────────────────────────────────────

  useCopilotAction({
    name: "renderUI",
    description: "Render a form to collect user input for the current workflow step",
    parameters: [
      {
        name: "componentId",
        type: "string",
        description: "Component to render from registry",
        enum: getRegisteredComponentIds(), // ['form', 'document-upload', 'review-summary']
        required: true
      },
      {
        name: "data",
        type: "object",
        description: "Initial data and schema for the form",
        required: false
      }
    ],

    // OLD PATTERN (Inline Rendering):
    // renderAndWaitForResponse: ({ args, status }) => {
    //   const Component = getComponent(args.componentId);
    //   return <Component data={args.data} status={status} />;
    // }

    // NEW PATTERN (Trigger Overlay):
    handler: async ({ args }) => {
      /*
      Purpose: Trigger form overlay instead of inline render

      Algorithm:
      1. Extract componentId and data from args
      2. Get current step from workflow state
      3. Call showFormOverlay to open overlay
      4. Return text message (not JSX)

      Result:
      - Overlay appears on top of chat
      - Chat remains visible but dimmed
      - AI receives text confirmation
      */

      const { componentId, data } = args;

      // Validation
      if (!componentId) {
        return "Error: componentId is required";
      }

      if (!currentStep) {
        return "Error: No active workflow step";
      }

      // Trigger overlay
      showFormOverlay(componentId, data || {}, currentStep);

      // Return message (AI sees this response)
      return `I've opened the ${componentId} form. Please complete it and click submit when you're ready.`;
    }
  });

  // ─────────────────────────────────────────────────────────────
  // RENDER PAGE
  // ─────────────────────────────────────────────────────────────

  return (
    <CopilotKit runtimeUrl="/api/copilotkit">
      <div className="h-screen flex">
        {/* Left: Client list */}
        <LeftPane />

        {/* Middle: Profile & status */}
        <MiddlePane
          clientId={clientId}
          workflow={machine}
          currentStep={currentStep}
        />

        {/* Right: Chat-first with overlay */}
        <RightPane clientId={clientId} />
      </div>
    </CopilotKit>
  );
}
```

**Key Changes:**

```typescript
/*
BEFORE (Inline Rendering):
─────────────────────────────
useCopilotAction({
  name: "renderUI",
  renderAndWaitForResponse: ({ args, status }) => {
    return <FormComponent data={args.data} status={status} />;
  }
});

Result: Form renders inline in chat area
Problem: Static form always visible, chat secondary


AFTER (Overlay Pattern):
─────────────────────────────
useCopilotAction({
  name: "renderUI",
  handler: async ({ args }) => {
    showFormOverlay(args.componentId, args.data, currentStep);
    return "Form opened. Please complete and submit.";
  }
});

Result: Form appears as overlay on top of chat
Benefits:
- Chat remains primary interface
- Form dismisses after submission
- Clean, focused interaction
- Mobile-friendly modal pattern
*/
```

---

## Task 6: End-to-End Integration

**Reference**: tasks.md COMP-006

### Implementation Approach

#### CopilotKit Action with Registry

**Pseudocode:**

```
FUNCTION setupRenderUIAction(workflowState) → void:
  INPUT: Workflow state from useWorkflowState hook
  OUTPUT: Registered CopilotKit action

  1. useCopilotAction({
       name: "renderUI",
       description: "Render a UI component with its schema",
       parameters: [
         {
           name: "componentId",
           type: "string",
           enum: getAvailableComponentIds(),
           required: false
         },
         {
           name: "data",
           type: "object",
           required: false
         }
       ],

       renderAndWaitForResponse: ({ args, status, respond }) => {
         // Determine which component to render
         componentId ← args.componentId || currentStep?.component_id
         Component ← getComponent(componentId)

         IF Component IS null:
           RETURN <ErrorComponent message="Unknown component: {componentId}" />
         END IF

         // Prepare data with schema from resolved task
         componentData ← {
           schema: currentStep?.schema,
           initialValues: {
             ...collectedInputs,
             ...(args.data || {})
           }
         }

         // Render component
         RETURN (
           <Component
             data={componentData}
             status={status}
             onComplete={result => {
               // Update collected inputs
               IF result.action == 'submit':
                 updateInputs(result.data)
               END IF

               // Try to progress
               progression ← progressToNextStep()

               // Respond to agent
               respond(JSON.stringify({
                 success: progression.canProgress,
                 action: result.action,
                 data: result.data,
                 nextStepId: progression.nextStepId,
                 missingFields: progression.missingFields,
                 isComplete: progression.isWorkflowComplete
               }))
             }}
           />
         )
       }
     })
END FUNCTION
```

**Implementation Code:**

```typescript
// components/workflow-chat.tsx
'use client';

import { useCopilotAction, useCopilotReadable } from '@copilotkit/react-core';
import { useWorkflowState } from '@/lib/workflow/hooks';
import { getComponent } from '@/lib/ui/component-registry';
import { ErrorComponent } from './onboarding/error-component';

export function WorkflowChat({ workflowId }: { workflowId: string }) {
  const {
    currentStep,
    collectedInputs,
    updateInputs,
    progressToNextStep,
    missingFields,
  } = useWorkflowState(workflowId);

  // Expose context to AI
  useCopilotReadable({
    description: "Current onboarding step and requirements",
    value: {
      stepId: currentStep?.id,
      taskRef: currentStep?.task_ref,
      requiredFields: currentStep?.required_fields,
      missingFields,
      componentId: currentStep?.component_id,
    },
  });

  // Register renderUI action
  useCopilotAction({
    name: "renderUI",
    description: "Render a UI component to collect information",
    parameters: [
      {
        name: "componentId",
        type: "string",
        description: "Component to render (optional, uses current step)",
        required: false,
      },
      {
        name: "data",
        type: "object",
        description: "Additional data for the component",
        required: false,
      },
    ],
    renderAndWaitForResponse: ({ args, status, respond }) => {
      const componentId = args.componentId || currentStep?.component_id;
      const Component = getComponent(componentId);

      if (!Component) {
        return <ErrorComponent message={`Unknown component: ${componentId}`} />;
      }

      const componentData = {
        schema: currentStep?.schema,
        initialValues: {
          ...collectedInputs,
          ...(args.data || {}),
        },
      };

      return (
        <Component
          data={componentData}
          status={status}
          onComplete={(result) => {
            if (result.action === 'submit') {
              updateInputs(result.data);
            }

            const progression = progressToNextStep();

            respond?.(
              JSON.stringify({
                success: progression.success,
                action: result.action,
                data: result.data,
                nextStepId: progression.nextStepId,
                missingFields: progression.missingFields,
                isComplete: progression.isWorkflowComplete,
              })
            );
          }}
        />
      );
    },
  });

  return null; // This component doesn't render UI directly
}
```

**Context7 References:**
- CopilotKit renderAndWaitForResponse: `/copilotkit/copilotkit` - State machine transitions
- React integration: `/websites/react_dev` - Component composition

---

## Testing Strategy

### Unit Testing Pattern

```typescript
// Example: Test expression evaluation
describe('evaluateExpression', () => {
  it('should evaluate > operator', () => {
    const inputs = { risk_score: 75 };
    expect(evaluateExpression('risk_score > 70', inputs)).toBe(true);
    expect(evaluateExpression('risk_score > 80', inputs)).toBe(false);
  });

  it('should handle == operator with strings', () => {
    const inputs = { entity_type: 'Corporation' };
    expect(evaluateExpression("entity_type == 'Corporation'", inputs)).toBe(true);
  });

  it('should return false for undefined variables', () => {
    const inputs = {};
    expect(evaluateExpression('unknown_var > 10', inputs)).toBe(false);
  });
});
```

### Integration Testing Pattern

```typescript
// Example: Test workflow compilation
describe('compileWorkflow', () => {
  it('should compile workflow with task resolution', async () => {
    const compiled = await compileWorkflow('corporate_onboarding_v1');

    expect(compiled.workflowId).toBe('wf_corporate_v1');
    expect(compiled.steps).toHaveLength(4);
    expect(compiled.steps[0].schema).toBeDefined(); // Schema resolved from task
  });

  it('should resolve task inheritance', async () => {
    const compiled = await compileWorkflow('corporate_onboarding_v1');
    const contactStep = compiled.steps[0];

    // Should have inherited fields from base
    expect(contactStep.schema.fields).toContainEqual(
      expect.objectContaining({ name: 'email' }) // From base
    );
    expect(contactStep.schema.fields).toContainEqual(
      expect.objectContaining({ name: 'legal_name' }) // From child
    );
  });
});
```

---

## Common Patterns & Best Practices

### Error Handling

```typescript
// Always provide fallbacks for YAML parsing
try {
  const taskDef = await loadTask(taskRef);
  return await resolveTaskInheritance(taskDef);
} catch (error) {
  console.error(`Failed to load task ${taskRef}:`, error);
  throw new Error(`Task not found or invalid: ${taskRef}`);
}
```

### Type Safety

```typescript
// Use strict TypeScript for all interfaces
export interface WorkflowStep {
  id: string;
  task_ref: string;
  // ... other required fields
}

// Validate at runtime when loading from YAML
function validateWorkflowStep(step: any): asserts step is WorkflowStep {
  if (!step.id || typeof step.id !== 'string') {
    throw new Error('Step must have string id');
  }
  // ... other validations
}
```

### Performance Optimization

```typescript
// Cache loaded workflows
const workflowCache = new Map<string, CompiledWorkflow>();

export async function getWorkflow(id: string): Promise<CompiledWorkflow> {
  if (workflowCache.has(id)) {
    return workflowCache.get(id)!;
  }

  const compiled = await compileWorkflow(id);
  workflowCache.set(id, compiled);
  return compiled;
}
```

---

## Context7 Documentation Summary

**CopilotKit** (`/copilotkit/copilotkit`):
- `useCopilotAction` with `renderAndWaitForResponse` for generative UI
- `status` prop tracks: 'idle' | 'executing' | 'complete' | 'error'
- `respond()` callback returns data to agent
- State machine transitions via user interaction

**Next.js** (`/vercel/next.js`):
- App Router API routes: `app/api/*/route.ts`
- Server Components for data fetching
- `useRouter`, `usePathname`, `useSearchParams` client-side hooks
- Dynamic routes with `[slug]` folders

**React** (`/websites/react_dev`):
- `useState` for component state
- `useEffect` for side effects (data loading)
- Custom hooks pattern: `use*` functions
- Form handling with controlled components

---

**End of Detailed Implementation Guide**

Refer to tasks.md for acceptance criteria and testing requirements for each task.
