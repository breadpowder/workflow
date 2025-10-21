# Composable Onboarding - Detailed Implementation Plan

## Overview
This plan details the implementation of a standalone YAML-driven onboarding system using CopilotKit for financial services (corporate/individual client onboarding).

**Technology Stack:**
- Next.js 14+ (App Router)
- TypeScript
- CopilotKit (@copilotkit/react-core, @copilotkit/runtime)
- OpenAI API (self-hosted adapter)
- YAML for composable_onboarding definitions
- Tailwind CSS for styling

**Project Location:** New standalone project (not modifying existing example)

**Complexity:** Medium (requires component registry, composable_onboarding engine, and state management)

---

## Task Dependency Graph

```
Phase 1: Foundation (Parallel)
├── T1: Project Setup
├── T2: YAML Schema Definition
└── T3: Composable Onboarding Engine Core

Phase 2: Backend (Sequential, depends on Phase 1)
├── T4: Composable Onboarding Loader
├── T5: API Endpoints
└── T6: Self-Hosted Runtime

Phase 3: Component System (Parallel, depends on Phase 1)
├── T7: Component Registry Infrastructure
├── T8: UI Components (Corporate Onboarding)
└── T9: Component Wrappers

Phase 4: Integration (Sequential, depends on Phases 2 & 3)
├── T10: Composable Onboarding State Management Hook
├── T11: Generic renderUI Action
└── T12: YAML-Driven Transitions

Phase 5: Testing & Documentation (Parallel, depends on Phase 4)
├── T13: Unit Tests (Engine, Registry, Hook)
├── T14: Integration Tests (E2E Composable Onboardings)
└── T15: Documentation
```

---

## Phase 1: Foundation

### T1: Project Setup (30 min)

**Objective:** Initialize Next.js project with required dependencies

**Steps:**
```bash
# Create new Next.js project
npx create-next-app@latest composable-onboarding --typescript --tailwind --app --no-src-dir

cd composable-onboarding

# Install CopilotKit dependencies
npm install @copilotkit/react-core @copilotkit/runtime

# Install composable_onboarding dependencies
npm install yaml js-yaml
npm install -D @types/js-yaml

# Install testing dependencies
npm install -D vitest @testing-library/react @testing-library/jest-dom
```

**Acceptance Criteria:**
- ✅ Next.js project runs with `npm run dev`
- ✅ All dependencies installed without errors
- ✅ Directory structure created

---

### T2: YAML Schema Definition (45 min)

**Objective:** Define TypeScript interfaces for YAML composable_onboarding schema

**File:** `lib/composable_onboarding/schema.ts`

**Pseudocode:**
```typescript
// Step condition for transitions
export interface Composable OnboardingStepNextCondition {
  when: string;      // Expression: "risk_score > 70", "financing_decision == 'yes'"
  then: string;      // Target step ID
}

// Individual composable_onboarding step
export interface Composable OnboardingStep {
  id: string;                           // Unique step identifier
  task_ref: string;                     // Business task reference
  component_id?: string;                // UI component from registry
  required_fields?: string[];           // Fields that must be collected
  next: {
    conditions?: Composable OnboardingStepNextCondition[];  // Conditional transitions
    default: string;                           // Default next step
  };
}

// Complete composable_onboarding definition
export interface Composable OnboardingDefinition {
  id: string;                // Composable Onboarding unique ID
  name: string;              // Human-readable name
  version: number;           // Version number
  applies_to?: {             // Selection criteria
    client_type?: string;    // "corporate" | "individual"
    jurisdictions?: string[]; // ["US", "CA", "UK"]
  };
  steps: Composable OnboardingStep[];     // Array of composable_onboarding steps
}

// Client profile for composable_onboarding selection
export interface ClientProfile {
  client_type?: string;      // Type of client
  jurisdiction?: string;     // Operating jurisdiction
  [k: string]: unknown;      // Additional properties
}

// Compiled runtime machine
export interface RuntimeMachine {
  composable_onboardingId: string;                  // Source composable_onboarding ID
  version: number;                     // Version number
  stepIndexById: Record<string, number>; // Fast step lookup
  steps: Composable OnboardingStep[];               // All steps
  initialStepId: string;               // Starting step
}
```

**Example YAML Validation:**
```typescript
// Helper to validate YAML against schema
export function validateComposable OnboardingDefinition(def: any): def is Composable OnboardingDefinition {
  if (!def.id || !def.name || !def.version) return false;
  if (!Array.isArray(def.steps) || def.steps.length === 0) return false;

  for (const step of def.steps) {
    if (!step.id || !step.task_ref || !step.next || !step.next.default) {
      return false;
    }
  }

  return true;
}
```

**Acceptance Criteria:**
- ✅ All interfaces defined with proper TypeScript types
- ✅ Schema supports `component_id` field (new)
- ✅ Validation function catches malformed YAML
- ✅ Exported types available for other modules

---

### T3: Composable Onboarding Engine Core (60 min)

**Objective:** Implement expression evaluation, field validation, and transition logic

**File:** `lib/composable_onboarding/engine.ts`

**Pseudocode:**
```typescript
import { RuntimeMachine, Composable OnboardingDefinition, Composable OnboardingStep } from './schema';

// ═══════════════════════════════════════════════════════════════
// 1. COMPILE RUNTIME MACHINE
// ═══════════════════════════════════════════════════════════════

export function compileRuntimeMachine(def: Composable OnboardingDefinition): RuntimeMachine {
  /*
  Purpose: Transform YAML definition into runtime-optimized structure

  Algorithm:
  1. Create step index map (id → position) for O(1) lookup
  2. Extract initial step (first in array)
  3. Return compiled machine
  */

  const stepIndexById: Record<string, number> = {};
  def.steps.forEach((step, index) => {
    stepIndexById[step.id] = index;
  });

  const initialStepId = def.steps[0]?.id ?? '';

  return {
    composable_onboardingId: def.id,
    version: def.version,
    stepIndexById,
    steps: def.steps,
    initialStepId
  };
}

// ═══════════════════════════════════════════════════════════════
// 2. EXPRESSION EVALUATOR
// ═══════════════════════════════════════════════════════════════

type Inputs = Record<string, unknown>;

function evaluateExpression(expr: string, inputs: Inputs): boolean {
  /*
  Purpose: Safely evaluate simple comparison expressions

  Supported operators: ==, !=, >, >=, <, <=
  Supported types: numbers, strings (quoted)

  Example expressions:
  - "risk_score > 70"
  - "financing_decision == 'yes'"
  - "annual_income >= 50000"

  Algorithm:
  1. Parse expression using regex: (variable) (operator) (value)
  2. Extract variable value from inputs
  3. Parse right-hand value (number or quoted string)
  4. Execute comparison based on operator
  5. Return boolean result

  Security: No eval() - only predefined operators
  */

  // Match: variable operator value
  const regex = /^(\w+)\s*(==|!=|>=|<=|>|<)\s*(.*)$/;
  const match = expr.match(regex);

  if (!match) {
    console.warn(`Invalid expression: ${expr}`);
    return false;
  }

  const [, variableName, operator, rawValue] = match;
  const leftValue = inputs[variableName];

  // Parse right-hand value
  let rightValue: unknown = rawValue.trim();
  if (typeof rightValue === 'string') {
    // Remove quotes from strings
    if (rightValue.startsWith("'") || rightValue.startsWith('"')) {
      rightValue = rightValue.replace(/^['"]|['"]$/g, '');
    }
    // Parse numbers
    else if (/^-?\d+(\.\d+)?$/.test(rightValue)) {
      rightValue = Number(rightValue);
    }
  }

  // Execute comparison
  switch (operator) {
    case '>':
      return Number(leftValue) > Number(rightValue);
    case '>=':
      return Number(leftValue) >= Number(rightValue);
    case '<':
      return Number(leftValue) < Number(rightValue);
    case '<=':
      return Number(leftValue) <= Number(rightValue);
    case '==':
      return leftValue == rightValue;  // Intentional == for type coercion
    case '!=':
      return leftValue != rightValue;
    default:
      return false;
  }
}

// ═══════════════════════════════════════════════════════════════
// 3. NEXT STEP CALCULATOR
// ═══════════════════════════════════════════════════════════════

export function nextStepId(step: Composable OnboardingStep, inputs: Inputs): string {
  /*
  Purpose: Determine next step based on conditions and inputs

  Algorithm:
  1. Iterate through step.next.conditions
  2. For each condition, evaluate expression
  3. If condition matches, return its target step
  4. If no conditions match, return default step

  Example:
  Input: step with conditions = [
    { when: "financing_decision == 'yes'", then: "getFinancingInfo" }
  ]
  Input: inputs = { financing_decision: "yes" }
  Output: "getFinancingInfo"

  Input: inputs = { financing_decision: "no" }
  Output: step.next.default
  */

  const conditions = step.next.conditions ?? [];

  for (const condition of conditions) {
    if (evaluateExpression(condition.when, inputs)) {
      return condition.then;
    }
  }

  return step.next.default;
}

// ═══════════════════════════════════════════════════════════════
// 4. REQUIRED FIELDS VALIDATOR
// ═══════════════════════════════════════════════════════════════

export function missingRequiredFields(
  step: Composable OnboardingStep,
  inputs: Inputs
): string[] {
  /*
  Purpose: Identify which required fields are missing or empty

  Algorithm:
  1. Get required_fields array from step
  2. Filter fields that are null, undefined, or empty string
  3. Return array of missing field names

  Example:
  Input: step.required_fields = ["name", "email", "phone"]
  Input: inputs = { name: "John", email: "" }
  Output: ["email", "phone"]
  */

  const required = step.required_fields ?? [];

  return required.filter(fieldName => {
    const value = inputs[fieldName];
    return value == null || value === '';
  });
}

// ═══════════════════════════════════════════════════════════════
// 5. HELPER: GET STEP BY ID
// ═══════════════════════════════════════════════════════════════

export function getStepById(
  machine: RuntimeMachine,
  stepId: string
): Composable OnboardingStep | null {
  /*
  Purpose: Fast step lookup using pre-computed index

  Algorithm:
  1. Look up step index from stepIndexById map (O(1))
  2. Return step from steps array, or null if not found
  */

  const index = machine.stepIndexById[stepId];
  if (index === undefined) return null;
  return machine.steps[index];
}
```

**Test Cases:**
```typescript
// Test expression evaluation
describe('evaluateExpression', () => {
  test('numeric greater than', () => {
    expect(evaluateExpression('risk_score > 70', { risk_score: 80 })).toBe(true);
    expect(evaluateExpression('risk_score > 70', { risk_score: 60 })).toBe(false);
  });

  test('string equality', () => {
    expect(evaluateExpression("decision == 'yes'", { decision: 'yes' })).toBe(true);
    expect(evaluateExpression("decision == 'yes'", { decision: 'no' })).toBe(false);
  });
});

// Test next step calculation
describe('nextStepId', () => {
  test('returns conditional step when condition matches', () => {
    const step = {
      id: 'test',
      task_ref: 'test',
      next: {
        conditions: [{ when: "decision == 'yes'", then: 'stepA' }],
        default: 'stepB'
      }
    };
    expect(nextStepId(step, { decision: 'yes' })).toBe('stepA');
    expect(nextStepId(step, { decision: 'no' })).toBe('stepB');
  });
});

// Test field validation
describe('missingRequiredFields', () => {
  test('identifies missing fields', () => {
    const step = {
      id: 'test',
      task_ref: 'test',
      required_fields: ['name', 'email', 'phone'],
      next: { default: 'next' }
    };
    const missing = missingRequiredFields(step, { name: 'John' });
    expect(missing).toEqual(['email', 'phone']);
  });
});
```

**Acceptance Criteria:**
- ✅ `compileRuntimeMachine` creates step index correctly
- ✅ `evaluateExpression` handles all operators (>, >=, <, <=, ==, !=)
- ✅ `evaluateExpression` handles numbers and quoted strings
- ✅ `nextStepId` returns conditional step when condition matches
- ✅ `nextStepId` returns default when no conditions match
- ✅ `missingRequiredFields` identifies null, undefined, and empty strings
- ✅ Unit tests pass for all functions

---

## Phase 2: Backend Implementation

### T4: Composable Onboarding Loader (45 min)

**Objective:** Load YAML files and select applicable composable_onboarding

**File:** `lib/composable_onboarding/loader.ts`

**Pseudocode:**
```typescript
import fs from 'fs';
import path from 'path';
import { parse } from 'yaml';
import { Composable OnboardingDefinition, ClientProfile, validateComposable OnboardingDefinition } from './schema';

// ═══════════════════════════════════════════════════════════════
// 1. LOAD ALL WORKFLOWS FROM DISK
// ═══════════════════════════════════════════════════════════════

const WORKFLOWS_DIR = path.join(process.cwd(), 'data', 'composable_onboardings');

export function loadComposable Onboardings(): Composable OnboardingDefinition[] {
  /*
  Purpose: Read and parse all YAML composable_onboarding files

  Algorithm:
  1. Check if composable_onboardings directory exists
  2. Read all .yaml/.yml files from directory
  3. Parse each file using yaml.parse()
  4. Validate against Composable OnboardingDefinition schema
  5. Return array of valid composable_onboardings

  Error Handling:
  - Skip files that fail to parse
  - Log warnings for invalid schemas
  - Return empty array if directory doesn't exist
  */

  if (!fs.existsSync(WORKFLOWS_DIR)) {
    console.warn(`Composable Onboardings directory not found: ${WORKFLOWS_DIR}`);
    return [];
  }

  const files = fs.readdirSync(WORKFLOWS_DIR)
    .filter(f => f.endsWith('.yaml') || f.endsWith('.yml'));

  const definitions: Composable OnboardingDefinition[] = [];

  for (const file of files) {
    try {
      const filePath = path.join(WORKFLOWS_DIR, file);
      const content = fs.readFileSync(filePath, 'utf8');
      const parsed = parse(content);

      if (validateComposable OnboardingDefinition(parsed)) {
        definitions.push(parsed);
      } else {
        console.warn(`Invalid composable_onboarding schema in file: ${file}`);
      }
    } catch (error) {
      console.error(`Failed to load composable_onboarding file ${file}:`, error);
    }
  }

  return definitions;
}

// ═══════════════════════════════════════════════════════════════
// 2. SELECT APPLICABLE WORKFLOW
// ═══════════════════════════════════════════════════════════════

export function pickApplicableComposable Onboarding(
  definitions: Composable OnboardingDefinition[],
  profile: ClientProfile
): Composable OnboardingDefinition | null {
  /*
  Purpose: Find best matching composable_onboarding for client profile

  Algorithm:
  1. Filter composable_onboardings by client_type match (if specified)
  2. Filter by jurisdiction match (if specified)
  3. If multiple matches, select highest version number
  4. Return selected composable_onboarding or null if no match

  Matching Rules:
  - If composable_onboarding.applies_to is undefined, it matches all profiles
  - client_type must match exactly (if defined)
  - jurisdiction must be in jurisdictions array (if defined)
  - Higher version number wins

  Example:
  Composable Onboardings:
  - { id: "wf_corporate_v1", version: 1, applies_to: { client_type: "corporate" } }
  - { id: "wf_corporate_v2", version: 2, applies_to: { client_type: "corporate" } }

  Profile: { client_type: "corporate" }
  Result: wf_corporate_v2 (higher version)
  */

  const candidates = definitions.filter(def => {
    // No applies_to means it matches everything
    if (!def.applies_to) return true;

    const { client_type, jurisdictions } = def.applies_to;

    // Check client type match
    const clientTypeMatches = client_type
      ? client_type === profile.client_type
      : true;

    // Check jurisdiction match
    const jurisdictionMatches = jurisdictions?.length
      ? profile.jurisdiction && jurisdictions.includes(profile.jurisdiction)
      : true;

    return clientTypeMatches && jurisdictionMatches;
  });

  if (candidates.length === 0) return null;

  // Sort by version descending, return highest
  candidates.sort((a, b) => b.version - a.version);
  return candidates[0];
}
```

**Test Cases:**
```typescript
describe('pickApplicableComposable Onboarding', () => {
  const composable_onboardings = [
    {
      id: 'wf_corporate_v1',
      name: 'Corporate v1',
      version: 1,
      applies_to: { client_type: 'corporate', jurisdictions: ['US', 'CA'] },
      steps: []
    },
    {
      id: 'wf_corporate_v2',
      name: 'Corporate v2',
      version: 2,
      applies_to: { client_type: 'corporate', jurisdictions: ['US'] },
      steps: []
    },
    {
      id: 'wf_individual_v1',
      name: 'Individual v1',
      version: 1,
      applies_to: { client_type: 'individual' },
      steps: []
    }
  ];

  test('selects highest version for matching profile', () => {
    const result = pickApplicableComposable Onboarding(composable_onboardings, {
      client_type: 'corporate',
      jurisdiction: 'US'
    });
    expect(result?.id).toBe('wf_corporate_v2');
  });

  test('selects composable_onboarding by client_type only', () => {
    const result = pickApplicableComposable Onboarding(composable_onboardings, {
      client_type: 'individual'
    });
    expect(result?.id).toBe('wf_individual_v1');
  });

  test('returns null when no match', () => {
    const result = pickApplicableComposable Onboarding(composable_onboardings, {
      client_type: 'unknown'
    });
    expect(result).toBeNull();
  });
});
```

**Acceptance Criteria:**
- ✅ Loads all YAML files from data/composable_onboardings/
- ✅ Validates each composable_onboarding against schema
- ✅ Skips invalid files with warning
- ✅ Selects composable_onboarding by client_type and jurisdiction
- ✅ Returns highest version when multiple matches
- ✅ Returns null when no matching composable_onboarding
- ✅ Unit tests pass

---

### T5: API Endpoints (30 min)

**Objective:** Create REST endpoints for composable_onboarding access

**Files:**
- `app/api/composable_onboardings/route.ts` - Composable Onboarding query endpoint

**Pseudocode:**

**A. Composable Onboarding Query Endpoint**
```typescript
// app/api/composable_onboardings/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { loadComposable Onboardings, pickApplicableComposable Onboarding } from '@/lib/composable_onboarding/loader';
import { compileRuntimeMachine } from '@/lib/composable_onboarding/engine';

export async function GET(request: NextRequest) {
  /*
  Purpose: Return compiled RuntimeMachine for given profile

  Query Parameters:
  - client_type: "corporate" | "individual"
  - jurisdiction: "US" | "CA" | "UK" | etc.

  Response:
  200: RuntimeMachine JSON
  404: No matching composable_onboarding found
  500: Server error

  Algorithm:
  1. Parse query parameters
  2. Load all composable_onboarding definitions
  3. Select applicable composable_onboarding based on profile
  4. Compile to RuntimeMachine
  5. Return JSON response
  */

  try {
    // Extract query parameters
    const searchParams = request.nextUrl.searchParams;
    const client_type = searchParams.get('client_type') ?? undefined;
    const jurisdiction = searchParams.get('jurisdiction') ?? undefined;

    // Load and select composable_onboarding
    const definitions = loadComposable Onboardings();
    const selected = pickApplicableComposable Onboarding(definitions, {
      client_type,
      jurisdiction
    });

    // Handle no match
    if (!selected) {
      // Fallback to first composable_onboarding if no match
      const fallback = definitions[0];
      if (!fallback) {
        return NextResponse.json(
          { error: 'No composable_onboarding definitions found' },
          { status: 404 }
        );
      }
      const machine = compileRuntimeMachine(fallback);
      return NextResponse.json(machine);
    }

    // Compile and return
    const machine = compileRuntimeMachine(selected);
    return NextResponse.json(machine);

  } catch (error) {
    console.error('Composable Onboarding API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

**Example Requests:**
```bash
# Get corporate composable_onboarding for US
GET /api/composable_onboardings?client_type=corporate&jurisdiction=US

# Get individual composable_onboarding (no jurisdiction)
GET /api/composable_onboardings?client_type=individual

# Get default composable_onboarding
GET /api/composable_onboardings
```

**Example Response:**
```json
{
  "composable_onboardingId": "wf_corporate_v1",
  "version": 1,
  "initialStepId": "collectContactInfo",
  "stepIndexById": {
    "collectContactInfo": 0,
    "collectDocuments": 1,
    "enhancedDueDiligence": 2,
    "review": 3
  },
  "steps": [
    {
      "id": "collectContactInfo",
      "task_ref": "collect_contact_info",
      "component_id": "contact-form",
      "required_fields": ["legal_name", "contact_email", "contact_phone"],
      "next": { "default": "collectDocuments" }
    }
  ]
}
```

**Acceptance Criteria:**
- ✅ GET /api/composable_onboardings returns RuntimeMachine JSON
- ✅ Query parameters filter composable_onboardings correctly
- ✅ Returns 404 when no composable_onboardings exist
- ✅ Returns fallback composable_onboarding when no match
- ✅ Returns 500 on server errors with logged details

---

### T6: Self-Hosted CopilotKit Runtime (20 min)

**Objective:** Create self-hosted runtime endpoint (no cloud keys)

**File:** `app/api/copilotkit/route.ts`

**Pseudocode:**
```typescript
import {
  CopilotRuntime,
  OpenAIAdapter,
  copilotRuntimeNextJSAppRouterEndpoint
} from '@copilotkit/runtime';
import { NextRequest } from 'next/server';

/*
Purpose: Self-hosted CopilotKit runtime using OpenAI

Configuration:
- Uses server-side OPENAI_API_KEY from environment
- No public API keys exposed to client
- Handles chat messages and action execution

Environment Variables Required:
OPENAI_API_KEY=sk-...

Security:
- API key never sent to client
- All LLM calls proxied through this endpoint
*/

// Initialize adapter and runtime
const serviceAdapter = new OpenAIAdapter();
const runtime = new CopilotRuntime();

// Handle POST requests for chat
export const POST = async (req: NextRequest) => {
  const { handleRequest } = copilotRuntimeNextJSAppRouterEndpoint({
    runtime,
    serviceAdapter,
    endpoint: '/api/copilotkit'
  });

  return handleRequest(req);
};
```

**Environment Setup:**
```env
# .env.local
OPENAI_API_KEY=sk-proj-...

# DO NOT expose as NEXT_PUBLIC_* - keep server-side only!
```

**Acceptance Criteria:**
- ✅ Endpoint accepts POST requests
- ✅ Uses server-side OPENAI_API_KEY only
- ✅ No NEXT_PUBLIC_* keys required
- ✅ Successfully processes chat messages
- ✅ Returns streaming responses

---

## Phase 3: Component System

### T7: Component Registry Infrastructure (45 min)

**Objective:** Create registry mapping componentId → React component

**File:** `lib/ui/component-registry.ts`

**Pseudocode:**
```typescript
import { RenderFunctionStatus } from '@copilotkit/react-core';
import React from 'react';

// ═══════════════════════════════════════════════════════════════
// 1. STANDARD COMPONENT INTERFACE
// ═══════════════════════════════════════════════════════════════

export interface RegistryComponentProps {
  /*
  Standard interface that all registry components must implement

  Purpose: Enforce consistent API across all UI components
  */

  data: any;                          // Data passed from action/YAML
  status: RenderFunctionStatus;       // CopilotKit execution status
  onComplete: (result: any) => void;  // Callback when step completes
}

// ═══════════════════════════════════════════════════════════════
// 2. COMPONENT REGISTRY
// ═══════════════════════════════════════════════════════════════

// Import all wrapper components
import { ContactFormWrapper } from './components/contact-form-wrapper';
import { DocumentUploadWrapper } from './components/document-upload-wrapper';
import { EDDQuestionnaireWrapper } from './components/edd-questionnaire-wrapper';
import { ReviewSummaryWrapper } from './components/review-summary-wrapper';

const UI_COMPONENT_REGISTRY: Record<
  string,
  React.ComponentType<RegistryComponentProps>
> = {
  /*
  Central registry mapping component IDs to React components

  Key naming convention: kebab-case
  Value: React component implementing RegistryComponentProps

  Adding new components:
  1. Create component wrapper
  2. Add import above
  3. Add entry to registry
  4. Update YAML to use new component_id
  */

  'contact-form': ContactFormWrapper,
  'document-upload': DocumentUploadWrapper,
  'edd-questionnaire': EDDQuestionnaireWrapper,
  'review-summary': ReviewSummaryWrapper
};

// ═══════════════════════════════════════════════════════════════
// 3. COMPONENT LOOKUP
// ═══════════════════════════════════════════════════════════════

export function getComponent(
  componentId: string
): React.ComponentType<RegistryComponentProps> | null {
  /*
  Purpose: Safe component lookup with error handling

  Algorithm:
  1. Look up component in registry
  2. Return component if found
  3. Return null if not found (caller handles error)

  Example Usage:
  const Component = getComponent('contact-form');
  if (!Component) {
    return <ErrorView message="Component not found" />;
  }
  return <Component {...props} />;
  */

  return UI_COMPONENT_REGISTRY[componentId] ?? null;
}

// ═══════════════════════════════════════════════════════════════
// 4. REGISTRY INTROSPECTION
// ═══════════════════════════════════════════════════════════════

export function getRegisteredComponentIds(): string[] {
  /*
  Purpose: Get list of all registered component IDs

  Use Cases:
  - Validate YAML component_id references
  - Generate enum for useCopilotAction parameters
  - Debug and introspection
  */

  return Object.keys(UI_COMPONENT_REGISTRY);
}

export function isComponentRegistered(componentId: string): boolean {
  /*
  Purpose: Check if component ID exists in registry

  Use Cases:
  - Validate YAML before runtime
  - Early error detection
  */

  return componentId in UI_COMPONENT_REGISTRY;
}
```

**Test Cases:**
```typescript
describe('Component Registry', () => {
  test('getComponent returns component for valid ID', () => {
    const Component = getComponent('contact-form');
    expect(Component).toBeDefined();
    expect(Component).not.toBeNull();
  });

  test('getComponent returns null for invalid ID', () => {
    const Component = getComponent('nonexistent');
    expect(Component).toBeNull();
  });

  test('getRegisteredComponentIds returns all IDs', () => {
    const ids = getRegisteredComponentIds();
    expect(ids).toContain('contact-form');
    expect(ids).toContain('document-upload');
    expect(ids.length).toBeGreaterThan(0);
  });

  test('isComponentRegistered validates correctly', () => {
    expect(isComponentRegistered('contact-form')).toBe(true);
    expect(isComponentRegistered('invalid')).toBe(false);
  });
});
```

**Acceptance Criteria:**
- ✅ RegistryComponentProps interface defined
- ✅ UI_COMPONENT_REGISTRY object created
- ✅ getComponent() returns component or null
- ✅ getRegisteredComponentIds() returns all keys
- ✅ isComponentRegistered() validates existence
- ✅ Unit tests pass

---

### T8: UI Components for Corporate Onboarding (90 min)

**Objective:** Build actual UI components for onboarding steps

**Files:**
- `lib/ui/components/contact-form.tsx`
- `lib/ui/components/document-upload.tsx`
- `lib/ui/components/edd-questionnaire.tsx`
- `lib/ui/components/review-summary.tsx`

**Component 1: Contact Form**
```typescript
// lib/ui/components/contact-form.tsx

interface ContactFormProps {
  initialData?: {
    legal_name?: string;
    contact_email?: string;
    contact_phone?: string;
  };
  status: RenderFunctionStatus;
  onSubmit: (data: {
    legal_name: string;
    contact_email: string;
    contact_phone: string;
  }) => void;
}

export function ContactForm({ initialData, status, onSubmit }: ContactFormProps) {
  /*
  Purpose: Collect basic contact information

  Fields:
  - Legal Name (required)
  - Contact Email (required, email validation)
  - Contact Phone (required, phone format)

  Behavior:
  - Pre-fill with initialData if provided
  - Validate on change
  - Submit button disabled if incomplete
  - Show loading state during execution
  */

  const [formData, setFormData] = useState({
    legal_name: initialData?.legal_name ?? '',
    contact_email: initialData?.contact_email ?? '',
    contact_phone: initialData?.contact_phone ?? ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.legal_name) {
      newErrors.legal_name = 'Legal name is required';
    }

    if (!formData.contact_email) {
      newErrors.contact_email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.contact_email)) {
      newErrors.contact_email = 'Invalid email format';
    }

    if (!formData.contact_phone) {
      newErrors.contact_phone = 'Phone is required';
    } else if (!/^\+?[\d\s\-()]+$/.test(formData.contact_phone)) {
      newErrors.contact_phone = 'Invalid phone format';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) {
      onSubmit(formData);
    }
  };

  const isDisabled = status === 'executing' || status === 'complete';

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-6 bg-white rounded-lg shadow">
      <h2 className="text-2xl font-bold">Contact Information</h2>

      <div>
        <label className="block text-sm font-medium mb-1">Legal Name</label>
        <input
          type="text"
          value={formData.legal_name}
          onChange={e => setFormData({ ...formData, legal_name: e.target.value })}
          disabled={isDisabled}
          className="w-full px-3 py-2 border rounded"
        />
        {errors.legal_name && <p className="text-red-500 text-sm">{errors.legal_name}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Email</label>
        <input
          type="email"
          value={formData.contact_email}
          onChange={e => setFormData({ ...formData, contact_email: e.target.value })}
          disabled={isDisabled}
          className="w-full px-3 py-2 border rounded"
        />
        {errors.contact_email && <p className="text-red-500 text-sm">{errors.contact_email}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Phone</label>
        <input
          type="tel"
          value={formData.contact_phone}
          onChange={e => setFormData({ ...formData, contact_phone: e.target.value })}
          disabled={isDisabled}
          className="w-full px-3 py-2 border rounded"
        />
        {errors.contact_phone && <p className="text-red-500 text-sm">{errors.contact_phone}</p>}
      </div>

      <button
        type="submit"
        disabled={isDisabled}
        className="w-full py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400"
      >
        {status === 'executing' ? 'Processing...' : 'Continue'}
      </button>
    </form>
  );
}
```

**Component 2: Document Upload** (Simplified for POC)
```typescript
// lib/ui/components/document-upload.tsx

interface DocumentUploadProps {
  initialData?: {
    business_registration_certificate?: boolean;
    tax_identification_number?: string;
    proof_of_address?: boolean;
  };
  status: RenderFunctionStatus;
  onSubmit: (data: {
    business_registration_certificate: boolean;
    tax_identification_number: string;
    proof_of_address: boolean;
  }) => void;
}

export function DocumentUpload({ initialData, status, onSubmit }: DocumentUploadProps) {
  /*
  Purpose: Collect required business documents

  POC Simplification:
  - Use checkboxes instead of actual file upload
  - Collect TIN as text input
  - Focus on data flow, not upload infrastructure

  Fields:
  - Business Registration Certificate (checkbox)
  - Tax ID Number (text)
  - Proof of Address (checkbox)
  */

  const [formData, setFormData] = useState({
    business_registration_certificate: initialData?.business_registration_certificate ?? false,
    tax_identification_number: initialData?.tax_identification_number ?? '',
    proof_of_address: initialData?.proof_of_address ?? false
  });

  const isComplete =
    formData.business_registration_certificate &&
    formData.tax_identification_number &&
    formData.proof_of_address;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isComplete) {
      onSubmit(formData);
    }
  };

  const isDisabled = status === 'executing' || status === 'complete';

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-6 bg-white rounded-lg shadow">
      <h2 className="text-2xl font-bold">Business Documents</h2>
      <p className="text-gray-600">Please provide the following documents:</p>

      <div className="space-y-3">
        <label className="flex items-center space-x-3">
          <input
            type="checkbox"
            checked={formData.business_registration_certificate}
            onChange={e => setFormData({
              ...formData,
              business_registration_certificate: e.target.checked
            })}
            disabled={isDisabled}
            className="w-5 h-5"
          />
          <span>Business Registration Certificate</span>
        </label>

        <div>
          <label className="block text-sm font-medium mb-1">
            Tax Identification Number
          </label>
          <input
            type="text"
            value={formData.tax_identification_number}
            onChange={e => setFormData({
              ...formData,
              tax_identification_number: e.target.value
            })}
            disabled={isDisabled}
            placeholder="XX-XXXXXXX"
            className="w-full px-3 py-2 border rounded"
          />
        </div>

        <label className="flex items-center space-x-3">
          <input
            type="checkbox"
            checked={formData.proof_of_address}
            onChange={e => setFormData({
              ...formData,
              proof_of_address: e.target.checked
            })}
            disabled={isDisabled}
            className="w-5 h-5"
          />
          <span>Proof of Address (Utility bill or Bank statement)</span>
        </label>
      </div>

      <button
        type="submit"
        disabled={isDisabled || !isComplete}
        className="w-full py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400"
      >
        {status === 'executing' ? 'Processing...' : 'Continue'}
      </button>
    </form>
  );
}
```

**Component 3: EDD Questionnaire**
```typescript
// lib/ui/components/edd-questionnaire.tsx

interface EDDQuestionnaireProps {
  initialData?: {
    beneficial_owner_list?: string;
    source_of_funds?: string;
  };
  status: RenderFunctionStatus;
  onSubmit: (data: {
    beneficial_owner_list: string;
    source_of_funds: string;
  }) => void;
}

export function EDDQuestionnaire({ initialData, status, onSubmit }: EDDQuestionnaireProps) {
  /*
  Purpose: Enhanced Due Diligence for high-risk clients

  Fields:
  - Beneficial Owners (comma-separated names)
  - Source of Funds (description)

  Trigger: When risk_score > 70 in YAML
  */

  const [formData, setFormData] = useState({
    beneficial_owner_list: initialData?.beneficial_owner_list ?? '',
    source_of_funds: initialData?.source_of_funds ?? ''
  });

  const isComplete =
    formData.beneficial_owner_list.length > 0 &&
    formData.source_of_funds.length > 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isComplete) {
      onSubmit(formData);
    }
  };

  const isDisabled = status === 'executing' || status === 'complete';

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-6 bg-white rounded-lg shadow">
      <h2 className="text-2xl font-bold">Enhanced Due Diligence</h2>
      <p className="text-gray-600">
        Additional information is required for compliance purposes.
      </p>

      <div>
        <label className="block text-sm font-medium mb-1">
          Beneficial Owners
        </label>
        <textarea
          value={formData.beneficial_owner_list}
          onChange={e => setFormData({
            ...formData,
            beneficial_owner_list: e.target.value
          })}
          disabled={isDisabled}
          placeholder="List all individuals with 25%+ ownership (comma-separated)"
          rows={3}
          className="w-full px-3 py-2 border rounded"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">
          Source of Funds
        </label>
        <textarea
          value={formData.source_of_funds}
          onChange={e => setFormData({
            ...formData,
            source_of_funds: e.target.value
          })}
          disabled={isDisabled}
          placeholder="Describe the origin of funds (e.g., business revenue, investment, inheritance)"
          rows={3}
          className="w-full px-3 py-2 border rounded"
        />
      </div>

      <button
        type="submit"
        disabled={isDisabled || !isComplete}
        className="w-full py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400"
      >
        {status === 'executing' ? 'Processing...' : 'Continue'}
      </button>
    </form>
  );
}
```

**Component 4: Review Summary**
```typescript
// lib/ui/components/review-summary.tsx

interface ReviewSummaryProps {
  data: Record<string, any>;  // All collected inputs
  status: RenderFunctionStatus;
  onConfirm: () => void;
  onEdit: () => void;
}

export function ReviewSummary({ data, status, onConfirm, onEdit }: ReviewSummaryProps) {
  /*
  Purpose: Display collected information for review

  Behavior:
  - Show all collected fields
  - Allow user to confirm or go back to edit
  - Format data nicely for readability
  */

  const isDisabled = status === 'executing' || status === 'complete';

  return (
    <div className="space-y-4 p-6 bg-white rounded-lg shadow">
      <h2 className="text-2xl font-bold">Review Your Information</h2>
      <p className="text-gray-600">Please review the information you provided:</p>

      <div className="space-y-4 border-t pt-4">
        {Object.entries(data).map(([key, value]) => (
          <div key={key} className="flex justify-between py-2 border-b">
            <span className="font-medium capitalize">
              {key.replace(/_/g, ' ')}:
            </span>
            <span className="text-gray-700">
              {typeof value === 'boolean' ? (value ? 'Yes' : 'No') : String(value)}
            </span>
          </div>
        ))}
      </div>

      <div className="flex gap-3">
        <button
          onClick={onEdit}
          disabled={isDisabled}
          className="flex-1 py-2 border border-blue-600 text-blue-600 rounded hover:bg-blue-50 disabled:opacity-50"
        >
          Edit Information
        </button>
        <button
          onClick={onConfirm}
          disabled={isDisabled}
          className="flex-1 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400"
        >
          {status === 'executing' ? 'Processing...' : 'Confirm & Submit'}
        </button>
      </div>
    </div>
  );
}
```

**Acceptance Criteria:**
- ✅ ContactForm collects name, email, phone with validation
- ✅ DocumentUpload collects required documents (simulated)
- ✅ EDDQuestionnaire collects beneficial owners and source of funds
- ✅ ReviewSummary displays all collected data
- ✅ All components respect status prop (disable during execution)
- ✅ All components handle initialData for pre-filling
- ✅ Form validation prevents invalid submissions
- ✅ Components are visually consistent (Tailwind)

---

### T9: Component Wrappers (30 min)

**Objective:** Create thin wrappers implementing RegistryComponentProps

**Files:**
- `lib/ui/components/contact-form-wrapper.tsx`
- `lib/ui/components/document-upload-wrapper.tsx`
- `lib/ui/components/edd-questionnaire-wrapper.tsx`
- `lib/ui/components/review-summary-wrapper.tsx`

**Wrapper Pattern:**
```typescript
// lib/ui/components/contact-form-wrapper.tsx
import { RegistryComponentProps } from '../component-registry';
import { ContactForm } from './contact-form';

export function ContactFormWrapper({
  data,
  status,
  onComplete
}: RegistryComponentProps) {
  /*
  Purpose: Adapt ContactForm to RegistryComponentProps interface

  Responsibilities:
  - Transform generic `data` to ContactForm props
  - Transform onSubmit callback to generic onComplete
  - Pass through status unchanged

  Pattern:
  1. Extract/transform data prop
  2. Create submit handler that calls onComplete
  3. Render actual component
  */

  return (
    <ContactForm
      initialData={data}
      status={status}
      onSubmit={(formData) => {
        onComplete({
          action: 'submit',
          data: formData
        });
      }}
    />
  );
}

// lib/ui/components/document-upload-wrapper.tsx
import { RegistryComponentProps } from '../component-registry';
import { DocumentUpload } from './document-upload';

export function DocumentUploadWrapper({
  data,
  status,
  onComplete
}: RegistryComponentProps) {
  return (
    <DocumentUpload
      initialData={data}
      status={status}
      onSubmit={(formData) => {
        onComplete({
          action: 'submit',
          data: formData
        });
      }}
    />
  );
}

// lib/ui/components/edd-questionnaire-wrapper.tsx
import { RegistryComponentProps } from '../component-registry';
import { EDDQuestionnaire } from './edd-questionnaire';

export function EDDQuestionnaireWrapper({
  data,
  status,
  onComplete
}: RegistryComponentProps) {
  return (
    <EDDQuestionnaire
      initialData={data}
      status={status}
      onSubmit={(formData) => {
        onComplete({
          action: 'submit',
          data: formData
        });
      }}
    />
  );
}

// lib/ui/components/review-summary-wrapper.tsx
import { RegistryComponentProps } from '../component-registry';
import { ReviewSummary } from './review-summary';

export function ReviewSummaryWrapper({
  data,
  status,
  onComplete
}: RegistryComponentProps) {
  return (
    <ReviewSummary
      data={data}
      status={status}
      onConfirm={() => {
        onComplete({
          action: 'confirm',
          data: { confirmed: true }
        });
      }}
      onEdit={() => {
        onComplete({
          action: 'edit',
          data: { edit: true }
        });
      }}
    />
  );
}
```

**Acceptance Criteria:**
- ✅ All wrappers implement RegistryComponentProps
- ✅ Wrappers transform data/callbacks correctly
- ✅ No direct coupling between registry and actual components
- ✅ Can swap actual components without changing wrappers

---

## Phase 4: Integration

### T10: Composable Onboarding State Management Hook (60 min)

**Objective:** Create React hook to manage composable_onboarding state and transitions

**File:** `lib/composable_onboarding/use-composable_onboarding-state.ts`

**Pseudocode:**
```typescript
import { useState, useEffect, useCallback } from 'react';
import { RuntimeMachine, Composable OnboardingStep } from './schema';
import { missingRequiredFields, nextStepId, getStepById } from './engine';

// ═══════════════════════════════════════════════════════════════
// WORKFLOW STATE HOOK
// ═══════════════════════════════════════════════════════════════

export function useComposable OnboardingState() {
  /*
  Purpose: Central state management for composable_onboarding execution

  Responsibilities:
  - Load composable_onboarding machine from API
  - Track current step
  - Manage collected inputs
  - Validate required fields
  - Execute transitions

  State:
  - machine: RuntimeMachine | null
  - currentStepId: string
  - collectedInputs: Record<string, any>
  - loading: boolean
  - error: string | null

  Methods:
  - loadComposable Onboarding(profile)
  - progressToNextStep()
  - updateInputs(newData)
  - canProgress()
  - resetComposable Onboarding()
  */

  // ─────────────────────────────────────────────────────────────
  // STATE
  // ─────────────────────────────────────────────────────────────

  const [machine, setMachine] = useState<RuntimeMachine | null>(null);
  const [currentStepId, setCurrentStepId] = useState<string>('');
  const [collectedInputs, setCollectedInputs] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // ─────────────────────────────────────────────────────────────
  // DERIVED STATE
  // ─────────────────────────────────────────────────────────────

  const currentStep: Composable OnboardingStep | null = machine
    ? getStepById(machine, currentStepId)
    : null;

  const missingFields: string[] = currentStep
    ? missingRequiredFields(currentStep, collectedInputs)
    : [];

  // ─────────────────────────────────────────────────────────────
  // LOAD WORKFLOW FROM API
  // ─────────────────────────────────────────────────────────────

  const loadComposable Onboarding = useCallback(async (profile: {
    client_type?: string;
    jurisdiction?: string;
  }) => {
    /*
    Algorithm:
    1. Build query parameters from profile
    2. Fetch RuntimeMachine from /api/composable_onboardings
    3. Set machine state
    4. Initialize currentStepId to initialStepId
    5. Reset collected inputs
    6. Handle errors with user-friendly messages
    */

    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (profile.client_type) {
        params.set('client_type', profile.client_type);
      }
      if (profile.jurisdiction) {
        params.set('jurisdiction', profile.jurisdiction);
      }

      const response = await fetch(`/api/composable_onboardings?${params}`);

      if (!response.ok) {
        throw new Error(`Failed to load composable_onboarding: ${response.statusText}`);
      }

      const runtimeMachine: RuntimeMachine = await response.json();

      setMachine(runtimeMachine);
      setCurrentStepId(runtimeMachine.initialStepId);
      setCollectedInputs({});

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      console.error('Failed to load composable_onboarding:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // ─────────────────────────────────────────────────────────────
  // UPDATE COLLECTED INPUTS
  // ─────────────────────────────────────────────────────────────

  const updateInputs = useCallback((newData: Record<string, any>) => {
    /*
    Purpose: Merge new data into collected inputs

    Algorithm:
    1. Shallow merge newData into existing collectedInputs
    2. Trigger re-render
    3. Re-compute missingFields
    */

    setCollectedInputs(prev => ({
      ...prev,
      ...newData
    }));
  }, []);

  // ─────────────────────────────────────────────────────────────
  // CHECK IF CAN PROGRESS
  // ─────────────────────────────────────────────────────────────

  const canProgress = useCallback((): boolean => {
    /*
    Purpose: Determine if current step can transition

    Algorithm:
    1. Check if machine and currentStep exist
    2. Compute missing required fields
    3. Return true if no missing fields
    */

    if (!machine || !currentStep) return false;
    const missing = missingRequiredFields(currentStep, collectedInputs);
    return missing.length === 0;
  }, [machine, currentStep, collectedInputs]);

  // ─────────────────────────────────────────────────────────────
  // PROGRESS TO NEXT STEP
  // ─────────────────────────────────────────────────────────────

  const progressToNextStep = useCallback((): {
    success: boolean;
    nextStepId?: string;
    reason?: string;
  } => {
    /*
    Purpose: Execute transition to next step

    Algorithm:
    1. Validate current step exists
    2. Check if can progress (all required fields present)
    3. If cannot progress, return failure with reason
    4. Use nextStepId() engine helper to compute next step
    5. Update currentStepId state
    6. Return success with new step ID

    Return Value:
    - success: boolean
    - nextStepId?: string (if success)
    - reason?: string (if failure)
    */

    if (!machine || !currentStep) {
      return {
        success: false,
        reason: 'No composable_onboarding loaded or invalid step'
      };
    }

    if (!canProgress()) {
      return {
        success: false,
        reason: `Missing required fields: ${missingFields.join(', ')}`
      };
    }

    const next = nextStepId(currentStep, collectedInputs);
    setCurrentStepId(next);

    return {
      success: true,
      nextStepId: next
    };
  }, [machine, currentStep, collectedInputs, canProgress, missingFields]);

  // ─────────────────────────────────────────────────────────────
  // RESET WORKFLOW
  // ─────────────────────────────────────────────────────────────

  const resetComposable Onboarding = useCallback(() => {
    /*
    Purpose: Reset to initial state (restart composable_onboarding)

    Algorithm:
    1. Reset currentStepId to machine.initialStepId
    2. Clear collected inputs
    */

    if (machine) {
      setCurrentStepId(machine.initialStepId);
      setCollectedInputs({});
    }
  }, [machine]);

  // ─────────────────────────────────────────────────────────────
  // RETURN HOOK INTERFACE
  // ─────────────────────────────────────────────────────────────

  return {
    // State
    machine,
    currentStep,
    currentStepId,
    collectedInputs,
    missingFields,
    loading,
    error,

    // Methods
    loadComposable Onboarding,
    updateInputs,
    canProgress,
    progressToNextStep,
    resetComposable Onboarding
  };
}
```

**Usage Example:**
```typescript
function OnboardingFlow() {
  const {
    currentStep,
    collectedInputs,
    missingFields,
    loading,
    error,
    loadComposable Onboarding,
    updateInputs,
    progressToNextStep
  } = useComposable OnboardingState();

  useEffect(() => {
    loadComposable Onboarding({ client_type: 'corporate', jurisdiction: 'US' });
  }, [loadComposable Onboarding]);

  if (loading) return <div>Loading composable_onboarding...</div>;
  if (error) return <div>Error: {error}</div>;
  if (!currentStep) return <div>No composable_onboarding loaded</div>;

  return (
    <div>
      <h1>Current Step: {currentStep.id}</h1>
      <p>Missing: {missingFields.join(', ')}</p>
      {/* Render UI based on currentStep.component_id */}
    </div>
  );
}
```

**Test Cases:**
```typescript
describe('useComposable OnboardingState', () => {
  test('loads composable_onboarding and initializes to first step', async () => {
    const { result } = renderHook(() => useComposable OnboardingState());

    await act(async () => {
      await result.current.loadComposable Onboarding({ client_type: 'corporate' });
    });

    expect(result.current.machine).toBeDefined();
    expect(result.current.currentStepId).toBe(result.current.machine?.initialStepId);
  });

  test('updateInputs merges data correctly', () => {
    const { result } = renderHook(() => useComposable OnboardingState());

    act(() => {
      result.current.updateInputs({ name: 'John' });
      result.current.updateInputs({ email: 'john@example.com' });
    });

    expect(result.current.collectedInputs).toEqual({
      name: 'John',
      email: 'john@example.com'
    });
  });

  test('canProgress returns false when fields missing', async () => {
    const { result } = renderHook(() => useComposable OnboardingState());

    await act(async () => {
      await result.current.loadComposable Onboarding({ client_type: 'corporate' });
    });

    expect(result.current.canProgress()).toBe(false);
  });

  test('progressToNextStep transitions correctly', async () => {
    const { result } = renderHook(() => useComposable OnboardingState());

    await act(async () => {
      await result.current.loadComposable Onboarding({ client_type: 'corporate' });
      result.current.updateInputs({
        legal_name: 'Acme Corp',
        contact_email: 'info@acme.com',
        contact_phone: '+1234567890'
      });
    });

    const initialStep = result.current.currentStepId;

    act(() => {
      const progression = result.current.progressToNextStep();
      expect(progression.success).toBe(true);
      expect(result.current.currentStepId).not.toBe(initialStep);
    });
  });
});
```

**Acceptance Criteria:**
- ✅ Hook loads composable_onboarding from API
- ✅ Initializes to initialStepId from machine
- ✅ updateInputs merges data correctly
- ✅ canProgress validates required fields
- ✅ progressToNextStep executes transitions
- ✅ progressToNextStep blocks when fields missing
- ✅ resetComposable Onboarding restarts from beginning
- ✅ Unit tests pass

---

### T11: Generic renderUI Action (45 min)

**Objective:** Create single CopilotKit action that renders any component via registry

**File:** `app/page.tsx` or component file with CopilotKit actions

**Pseudocode:**
```typescript
'use client';

import { useCopilotAction, useCopilotReadable } from '@copilotkit/react-core';
import { useComposable OnboardingState } from '@/lib/composable_onboarding/use-composable_onboarding-state';
import { getComponent, getRegisteredComponentIds } from '@/lib/ui/component-registry';

export function OnboardingComposable Onboarding() {
  /*
  Purpose: Main component coordinating composable_onboarding and CopilotKit

  Responsibilities:
  - Load composable_onboarding on mount
  - Register renderUI action with CopilotKit
  - Provide composable_onboarding context to AI
  - Handle step completions
  - Display current component
  */

  const {
    currentStep,
    collectedInputs,
    missingFields,
    loading,
    error,
    loadComposable Onboarding,
    updateInputs,
    progressToNextStep
  } = useComposable OnboardingState();

  // ─────────────────────────────────────────────────────────────
  // LOAD WORKFLOW ON MOUNT
  // ─────────────────────────────────────────────────────────────

  useEffect(() => {
    loadComposable Onboarding({
      client_type: 'corporate',
      jurisdiction: 'US'
    });
  }, [loadComposable Onboarding]);

  // ─────────────────────────────────────────────────────────────
  // PROVIDE WORKFLOW CONTEXT TO AI
  // ─────────────────────────────────────────────────────────────

  useCopilotReadable({
    description: "Current composable_onboarding step and requirements",
    value: {
      stepId: currentStep?.id,
      taskRef: currentStep?.task_ref,
      componentId: currentStep?.component_id,
      requiredFields: currentStep?.required_fields ?? [],
      missingFields: missingFields,
      collectedData: collectedInputs
    }
  });

  // ─────────────────────────────────────────────────────────────
  // GENERIC RENDER UI ACTION
  // ─────────────────────────────────────────────────────────────

  useCopilotAction({
    name: "renderUI",
    description: `Render a UI component to collect information from the user.

Available components:
${getRegisteredComponentIds().map(id => `- ${id}`).join('\n')}

The component will be selected automatically based on the current composable_onboarding step, but you can override it if needed.`,

    parameters: [
      {
        name: "componentId",
        type: "string",
        description: "ID of the component to render (usually from current step)",
        enum: getRegisteredComponentIds(),
        required: false
      },
      {
        name: "data",
        type: "object",
        description: "Initial data to pre-fill the component (usually previously collected inputs)",
        required: false
      }
    ],

    renderAndWaitForResponse: ({ args, status, respond }) => {
      /*
      Purpose: Render component from registry and handle completion

      Algorithm:
      1. Determine which component to render
         - Use args.componentId if provided
         - Otherwise use currentStep.component_id
      2. Look up component in registry
      3. If not found, render error component
      4. Render component with:
         - data: args.data or collectedInputs
         - status: from CopilotKit
         - onComplete: handler that updates inputs and progresses
      5. On completion:
         - Update collected inputs
         - Try to progress to next step
         - Respond to AI with result
      */

      // Determine component ID
      const componentId = args.componentId || currentStep?.component_id;

      if (!componentId) {
        respond?.('Error: No component ID specified and no current step');
        return <div className="text-red-500">Error: No component specified</div>;
      }

      // Look up component
      const Component = getComponent(componentId);

      if (!Component) {
        respond?.(`Error: Unknown component ID "${componentId}"`);
        return (
          <div className="text-red-500">
            Error: Component "{componentId}" not found in registry
          </div>
        );
      }

      // Render component
      return (
        <Component
          data={args.data || collectedInputs}
          status={status}
          onComplete={(result) => {
            /*
            Handle step completion:
            1. Extract data from result
            2. Update collected inputs
            3. Attempt to progress to next step
            4. Inform AI of result
            */

            if (result.action === 'submit' || result.action === 'confirm') {
              // Update inputs
              updateInputs(result.data);

              // Try to progress
              setTimeout(() => {
                const progression = progressToNextStep();

                if (progression.success) {
                  respond?.(
                    `Step completed successfully. Progressed to step: ${progression.nextStepId}`
                  );
                } else {
                  respond?.(
                    `Step data collected but cannot progress yet. ${progression.reason}`
                  );
                }
              }, 100); // Small delay to ensure state updates
            } else if (result.action === 'edit') {
              respond?.('User wants to edit information. Stay on current step.');
            } else {
              respond?.(`User action: ${result.action}`);
            }
          }}
        />
      );
    }
  }, [currentStep, collectedInputs, missingFields]);

  // ─────────────────────────────────────────────────────────────
  // RENDER MAIN UI
  // ─────────────────────────────────────────────────────────────

  if (loading) {
    return <div className="p-8">Loading composable_onboarding...</div>;
  }

  if (error) {
    return <div className="p-8 text-red-500">Error: {error}</div>;
  }

  if (!currentStep) {
    return <div className="p-8">No composable_onboarding loaded</div>;
  }

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-6">Corporate Onboarding</h1>

      <div className="mb-4 p-4 bg-gray-100 rounded">
        <p className="text-sm text-gray-600">Current Step: {currentStep.id}</p>
        <p className="text-sm text-gray-600">Task: {currentStep.task_ref}</p>
        {missingFields.length > 0 && (
          <p className="text-sm text-orange-600">
            Missing fields: {missingFields.join(', ')}
          </p>
        )}
      </div>

      {/* Component will be rendered via renderUI action */}
    </div>
  );
}
```

**Acceptance Criteria:**
- ✅ renderUI action registered with CopilotKit
- ✅ Action uses component registry for lookup
- ✅ Action falls back to currentStep.component_id
- ✅ Action passes data and status correctly
- ✅ onComplete handler updates inputs
- ✅ onComplete handler triggers progressToNextStep
- ✅ Error handling for unknown components
- ✅ AI receives readable composable_onboarding context

---

### T12: YAML-Driven Transitions (45 min)

**Objective:** Wire everything together for end-to-end YAML-driven composable_onboarding

**Files:**
- `data/composable_onboardings/corporate_v1.yaml` (create)
- `data/composable_onboardings/individual_v1.yaml` (create)

**Corporate Composable Onboarding YAML:**
```yaml
# data/composable_onboardings/corporate_v1.yaml
id: wf_corporate_v1
name: Corporate Onboarding v1
version: 1
applies_to:
  client_type: corporate
  jurisdictions: ["US", "CA"]

steps:
  - id: collectContactInfo
    task_ref: collect_contact_info
    component_id: contact-form
    required_fields: ["legal_name", "contact_email", "contact_phone"]
    next:
      default: collectDocuments

  - id: collectDocuments
    task_ref: collect_business_documents
    component_id: document-upload
    required_fields: [
      "business_registration_certificate",
      "tax_identification_number",
      "proof_of_address"
    ]
    next:
      conditions:
        - when: "risk_score > 70"
          then: enhancedDueDiligence
      default: review

  - id: enhancedDueDiligence
    task_ref: edd_questionnaire
    component_id: edd-questionnaire
    required_fields: ["beneficial_owner_list", "source_of_funds"]
    next:
      default: review

  - id: review
    task_ref: internal_review
    component_id: review-summary
    required_fields: []
    next:
      default: complete

  - id: complete
    task_ref: complete_onboarding
    component_id: review-summary
    required_fields: []
    next:
      default: complete
```

**Individual Composable Onboarding YAML:**
```yaml
# data/composable_onboardings/individual_v1.yaml
id: wf_individual_v1
name: Individual Onboarding v1
version: 1
applies_to:
  client_type: individual
  jurisdictions: ["US", "CA", "UK"]

steps:
  - id: collectContactInfo
    task_ref: collect_personal_info
    component_id: contact-form
    required_fields: ["legal_name", "contact_email", "contact_phone"]
    next:
      default: review

  - id: review
    task_ref: review_information
    component_id: review-summary
    required_fields: []
    next:
      default: complete

  - id: complete
    task_ref: complete_onboarding
    component_id: review-summary
    required_fields: []
    next:
      default: complete
```

**Integration Test:**
```typescript
// tests/integration/composable_onboarding-e2e.test.ts

describe('End-to-End Composable Onboarding', () => {
  test('completes corporate composable_onboarding successfully', async () => {
    /*
    Test Flow:
    1. Load composable_onboarding for corporate/US
    2. Verify starts at collectContactInfo
    3. Submit contact info
    4. Verify progresses to collectDocuments
    5. Submit documents (with risk_score < 70)
    6. Verify progresses to review (skips EDD)
    7. Confirm review
    8. Verify reaches complete
    */

    // Implementation would use React Testing Library
    // and mock API responses
  });

  test('triggers EDD for high risk score', async () => {
    /*
    Test Flow:
    1. Load composable_onboarding
    2. Submit contact info
    3. Submit documents with risk_score = 80
    4. Verify progresses to enhancedDueDiligence (not review)
    5. Submit EDD info
    6. Verify progresses to review
    */
  });

  test('blocks progression when fields missing', async () => {
    /*
    Test Flow:
    1. Load composable_onboarding
    2. Attempt to progress without submitting form
    3. Verify progressToNextStep returns failure
    4. Submit partial data
    5. Verify still blocked
    6. Submit complete data
    7. Verify progression succeeds
    */
  });
});
```

**Acceptance Criteria:**
- ✅ corporate_v1.yaml created with all steps
- ✅ individual_v1.yaml created with simplified flow
- ✅ Conditional transition works (risk_score > 70)
- ✅ Required fields enforcement blocks progression
- ✅ Composable Onboarding completes end-to-end
- ✅ Different client_type loads different composable_onboarding
- ✅ Integration tests pass

---

## Phase 5: Testing & Documentation

### T13: Unit Tests (60 min)

**Files:**
- `tests/composable_onboarding/engine.test.ts`
- `tests/composable_onboarding/loader.test.ts`
- `tests/ui/component-registry.test.ts`

*(Test cases already documented in previous tasks)*

**Acceptance Criteria:**
- ✅ Engine tests cover all operators and edge cases
- ✅ Loader tests cover file I/O and selection logic
- ✅ Registry tests cover lookup and validation
- ✅ All unit tests pass
- ✅ Code coverage >80% for tested modules

---

### T14: Integration Tests (45 min)

**File:** `tests/integration/composable_onboarding-e2e.test.ts`

*(Test scenarios documented in T12)*

**Acceptance Criteria:**
- ✅ Full composable_onboarding completion test passes
- ✅ Conditional branching test passes
- ✅ Field validation blocking test passes
- ✅ Multi-composable_onboarding selection test passes

---

### T15: Documentation (30 min)

**Files:**
- `README.md` - Project overview and getting started
- `docs/YAML_AUTHORING.md` - Guide for business users
- `docs/ARCHITECTURE.md` - Technical architecture

**README.md Outline:**
```markdown
# Composable Onboarding Composable Onboardings POC

## Overview
YAML-driven onboarding system with self-hosted CopilotKit runtime.

## Quick Start
1. Clone repository
2. Install dependencies: `npm install`
3. Configure `.env.local` with OPENAI_API_KEY
4. Run dev server: `npm run dev`
5. Open http://localhost:3000

## Features
- YAML composable_onboarding definitions
- Component registry pattern
- Self-hosted AI runtime
- Required field validation
- Conditional transitions

## Testing
- Unit tests: `npm test`
- Integration tests: `npm run test:integration`

## Documentation
- [YAML Authoring Guide](docs/YAML_AUTHORING.md)
- [Architecture](docs/ARCHITECTURE.md)
```

**Acceptance Criteria:**
- ✅ README with quick start instructions
- ✅ YAML authoring guide for non-developers
- ✅ Architecture doc with diagrams
- ✅ All docs reviewed for clarity

---

## Summary

**Total Estimated Time:** ~12 hours

**Critical Path:**
T1 → T2 → T3 → T4 → T5 → T6 → T7 → T10 → T11 → T12

**Parallel Opportunities:**
- T8 (UI Components) can happen alongside T4-T6
- T9 (Wrappers) depends on T8 only
- T13-T14 (Tests) can start once core functionality exists

**Risk Mitigation:**
- Start with T1-T7 to establish foundation
- Test engine thoroughly before building UI
- Component registry tested independently
- Integration tests validate complete system

**Success Criteria:**
All 17 tasks completed with acceptance criteria met, resulting in a working POC demonstrating YAML-driven composable_onboardings with component registry and self-hosted CopilotKit runtime.
