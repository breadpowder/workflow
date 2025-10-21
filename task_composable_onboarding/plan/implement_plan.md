# Composable Onboarding - Implementation Plan

**Status**: ✅ Planning Complete - Ready for Implementation
**Date**: 2025-10-21
**Version**: 1.0

---

## Executive Summary

This document provides the complete implementation plan for the Composable Onboarding Proof of Concept (POC). The POC demonstrates YAML-driven workflow systems with AI capabilities using CopilotKit.

### Core Innovation

The system implements a **four-layer architecture** that separates concerns and maximizes reusability:

1. **YAML Workflows** - Orchestration logic (WHAT, WHEN, WHERE)
2. **Task Definitions** - Ground truth schemas (HOW, WHICH fields)
3. **Component Registry** - Lookup table (component_id → React component)
4. **Generic UI Components** - Schema-driven rendering (one component = unlimited variations)

### Key Principles

**Schema-Driven Components**: Components = Behavior, Schemas = Data
- ONE generic component serves unlimited use cases via dynamic schemas
- YAML controls both which component renders AND how it's configured
- Result: 70% code reduction + business user empowerment

**Two-Level YAML Architecture**: Separation of orchestration from ground truth
- Workflows reference tasks via `task_ref` (no embedded schemas)
- Tasks define field schemas once, reused across workflows
- Result: Single source of truth + 85% workflow file size reduction

**Component Registry Pattern**: Decoupling actions from UI
- Actions don't import UI components directly
- Registry maps `component_id` → React component
- Result: YAML-controlled UI rendering + clean architecture

### Success Metrics

✅ YAML-driven workflows (business users edit without code)
✅ Schema-driven UI (one component, multiple use cases)
✅ Component registry pattern (decoupled actions and UI)
✅ AI-powered assistance (self-hosted CopilotKit)
✅ Conditional branching (risk-based workflow paths)
✅ Field validation (required field enforcement)
✅ Professional UI (three-pane layout)

### Deliverables

- Working application demonstrating all features
- 2+ workflow definitions (corporate, individual)
- Comprehensive task library with inheritance
- Unit and integration tests
- Complete documentation
- Clear architecture for production scaling

### Timeline

**Total**: 18-20 hours (3 weeks part-time or 1 week full-time)
- Week 1: Backend, engine, registry (10 hours)
- Week 2: UI, integration (7 hours)
- Week 3: Documentation, polish (1-3 hours)

---

## 1. Core Architecture

### 1.1 The Four-Layer Pattern

```
┌─────────────────────────────────────────────────────────┐
│ Layer 1: YAML Workflows (Orchestration Logic)          │
│    - Define workflow steps and transitions             │
│    - Reference tasks via task_ref                      │
│    - Specify conditions for branching                  │
│    - NO schemas (delegated to task files)              │
│    Location: data/workflows/*.yaml                     │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│ Layer 2: Task Definitions (Ground Truth Schemas)       │
│    - Define field schemas (canonical)                  │
│    - Validation rules and component config             │
│    - Support inheritance (extends base tasks)          │
│    - Reusable across multiple workflows                │
│    Location: data/tasks/**/*.yaml                      │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│ Layer 3: Component Registry (Lookup Table)             │
│    - Maps component_id → React component               │
│    - Lean registry (3-5 generic components)            │
│    - Receives resolved schemas from loader             │
│    Code: lib/ui/component-registry.ts                  │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│ Layer 4: Generic UI Components (Schema-Driven)         │
│    - Render based on resolved schema                   │
│    - One component = unlimited variations              │
│    - Examples: form, document-upload, data-table       │
│    Code: components/ui/*.tsx                           │
└─────────────────────────────────────────────────────────┘
```

### 1.2 Directory Structure

```
explore_copilotkit/
├── app/                                # Next.js App Router
│   ├── api/
│   │   └── copilotkit/                 # Self-hosted runtime endpoint
│   ├── page.tsx                        # Main onboarding page
│   └── layout.tsx
│
├── components/
│   ├── ui/                             # Generic schema-driven components
│   │   ├── generic-form.tsx            # Handles ALL forms via schema
│   │   ├── form-field.tsx              # Renders individual fields
│   │   ├── generic-document-upload.tsx
│   │   └── generic-data-table.tsx
│   │
│   ├── onboarding/                     # Registry wrappers
│   │   ├── generic-form-wrapper.tsx
│   │   ├── generic-document-upload-wrapper.tsx
│   │   └── generic-data-table-wrapper.tsx
│   │
│   └── layout/                         # Layout components
│       ├── left-pane.tsx               # Client list
│       ├── middle-pane.tsx             # Profile, timeline, required fields
│       └── right-pane.tsx              # Form + chat
│
├── lib/
│   ├── workflow/                       # Workflow engine
│   │   ├── schema.ts                   # TypeScript type definitions
│   │   ├── engine.ts                   # Runtime machine, state transitions
│   │   ├── loader.ts                   # Two-stage YAML loading
│   │   └── hooks.ts                    # useWorkflowState hook
│   │
│   ├── ui/
│   │   └── component-registry.ts       # Registry lookup
│   │
│   └── types/
│       └── field-schema.ts             # FieldSchema, FormSchema, etc.
│
├── data/
│   ├── workflows/                      # Workflow orchestration (Level 1)
│   │   ├── corporate_onboarding_v1.yaml
│   │   └── individual_onboarding_v1.yaml
│   │
│   └── tasks/                          # Ground truth schemas (Level 2)
│       ├── _base/                      # Base tasks for inheritance
│       │   └── contact_info_base.yaml
│       ├── contact_info/
│       │   ├── corporate.yaml
│       │   └── individual.yaml
│       ├── documents/
│       │   ├── corporate.yaml
│       │   └── individual.yaml
│       ├── due_diligence/
│       │   └── enhanced.yaml
│       └── review/
│           └── summary.yaml
│
└── tests/
    ├── unit/                           # Unit tests
    ├── integration/                    # Integration tests
    └── conftest.ts                     # Test configuration
```

### 1.3 Technology Stack

**Core Technologies:**
- Next.js 14+ (App Router)
- TypeScript 5+
- React 18+
- CopilotKit (@copilotkit/react-core, @copilotkit/runtime)
- Tailwind CSS 3+
- YAML for workflow definitions

**Development Tools:**
- Vitest + React Testing Library
- ESLint + Prettier
- TypeScript strict mode

**Key Dependencies:**
```json
{
  "@copilotkit/react-core": "latest",
  "@copilotkit/runtime": "latest",
  "next": "14+",
  "react": "18+",
  "typescript": "5+",
  "tailwindcss": "3+",
  "yaml": "latest"
}
```

---

## 2. Detailed Specifications

### 2.1 Schema-Driven Components

#### 2.1.1 Core Principle

**One component, multiple schemas** - Components should be reusable across different use cases by accepting dynamic field definitions rather than hardcoding specific fields.

**Rule of Thumb:**
> If components serve similar functionality but differ only in attributes/fields/configuration, use ONE schema-driven component instead of many specialized components.

#### 2.1.2 The Problem

**❌ Anti-Pattern: Creating Multiple Similar Components**

```typescript
// DON'T DO THIS - Creates unnecessary duplication
const UI_COMPONENT_REGISTRY = {
  'individual-contact-form': IndividualContactFormWrapper,
  'corporate-contact-form': CorporateContactFormWrapper,
  'trust-contact-form': TrustContactFormWrapper,
  // ... 10+ more variants
};
```

**Problems:**
- Code duplication (10 forms collecting contact info)
- Maintenance nightmare (bug fix needs 10 updates)
- Registry bloat (100 workflows = 1000 components)
- YAML can't adapt forms

#### 2.1.3 The Solution

**✅ Correct Pattern: Schema-Driven Components**

```typescript
// DO THIS - One component handles all schemas
const UI_COMPONENT_REGISTRY = {
  'form': GenericFormWrapper,              // Handles ALL forms via schema
  'document-upload': GenericDocumentUploadWrapper,
  'data-table': GenericDataTableWrapper,
  'review-summary': ReviewSummaryWrapper,
};
```

**Benefits:**
- Single source of truth (one component, one implementation)
- Easy maintenance (fix once, works everywhere)
- Registry stays lean (5 components, not 50)
- YAML defines schemas (full flexibility without code changes)

#### 2.1.4 Key Insight: Behavior vs. Data

**Component (behavior)**: HOW to collect/display data
- `form` → Renders a form with validation and submit button
- `document-upload` → Handles file uploads with drag-and-drop
- `data-table` → Displays data in sortable/filterable table

**Schema (data)**: WHAT data to collect/display
- Individual fields: full_name, email, phone
- Corporate fields: legal_name, entity_type, business_email
- Different data for same component behavior

#### 2.1.5 Schema Types

```typescript
// src/lib/types/field-schema.ts

export type FieldType =
  | 'text'
  | 'email'
  | 'tel'
  | 'number'
  | 'date'
  | 'textarea'
  | 'select'
  | 'checkbox'
  | 'radio'
  | 'file';

export interface FieldSchema {
  name: string;              // Field identifier
  label: string;             // Display label
  type: FieldType;           // Input type
  required?: boolean;        // Validation: is required?
  placeholder?: string;      // Placeholder text
  helpText?: string;         // Additional guidance
  validation?: {             // Advanced validation
    pattern?: string;        // Regex pattern
    minLength?: number;
    maxLength?: number;
    min?: number;
    max?: number;
  };
  options?: Array<{          // For select/radio
    value: string;
    label: string;
  }>;
  defaultValue?: any;        // Default value
  visible?: string;          // Conditional visibility expression
}

export interface FormSchema {
  fields: FieldSchema[];
  layout?: 'single-column' | 'two-column' | 'grid';
  submitLabel?: string;
  cancelLabel?: string;
}

export interface DocumentSchema {
  documents: Array<{
    id: string;
    label: string;
    required: boolean;
    acceptedTypes: string[];
    maxSize: number;
    helpText?: string;
  }>;
  allowMultiple: boolean;
  uploadLabel?: string;
}
```

#### 2.1.6 Generic Form Component Implementation

The GenericForm component (~300 lines) should include:

**Features:**
- Dynamic field rendering based on schema
- Validation logic (required, pattern, length, range)
- Conditional field visibility
- Layout options (single/two-column, grid)
- Error display with field-level messages
- Initial data population
- Loading states

**Key Functions:**
- `isFieldVisible(field)` - Evaluate conditional visibility
- `validateField(field, value)` - Field-level validation
- `handleChange(fieldName, value)` - Update form data
- `handleSubmit()` - Validate all fields and submit

**See schema-driven-components.md (archived) for complete implementation code.**

#### 2.1.7 Benefits Analysis

**Code Reduction:**
- Before: 50 components × 100 lines = 5,000 lines
- After: 5 generic components × 300 lines = 1,500 lines
- **Reduction: 70%**

**Registry Size:**
- Before: 50+ specialized components
- After: 3-5 generic components
- **Reduction: 90%**

**Time to Add Entity Type:**
- Before: 2-4 hours (create component, test, deploy)
- After: 5 minutes (edit YAML schema)
- **Speedup: 24-48x**

**Maintenance:**
- Before: Fix bug in 10 places
- After: Fix bug in 1 place
- **Effort: 90% reduction**

---

### 2.2 Two-Level YAML Architecture

#### 2.2.1 Core Principle

**Separation of Concerns**: Workflow orchestration vs. field schema definitions

**Principle:**
- Workflow files (Level 1) define WHAT to do, WHEN to do it, WHERE to go next
- Task files (Level 2) define HOW to collect data, WHICH fields, validation rules

**Benefit:**
Task definitions are the **single source of truth** and reused across multiple workflows.

#### 2.2.2 Level 1: Workflow Files

**Purpose:** Define workflow structure, step sequence, transitions, conditional branching

**Location:** `data/workflows/*.yaml`

**Schema:**

```yaml
id: string                               # Unique workflow identifier
name: string                             # Human-readable name
version: number                          # Workflow version
description: string (optional)           # Workflow description

applies_to:                              # When this workflow applies
  client_type: string                    # "corporate", "individual", "trust"
  jurisdictions: string[]                # ["US", "CA", "GB"]

steps:                                   # Workflow steps
  - id: string                           # Step identifier
    task_ref: string                     # Path to task file (e.g., "contact_info/corporate")
    next:                                # Transition rules
      conditions:                        # Conditional branching (optional)
        - when: string                   # Expression (e.g., "risk_score > 70")
          then: string                   # Target step ID
      default: string                    # Default next step or "END"
```

**Example: Corporate Onboarding Workflow**

```yaml
id: wf_corporate_v1
name: Corporate Onboarding v1
version: 1
description: Complete onboarding workflow for corporate entities

applies_to:
  client_type: corporate
  jurisdictions: ["US", "CA", "GB"]

steps:
  # Step 1: Collect corporate contact information
  - id: collectContactInfo
    task_ref: contact_info/corporate     # Reference to task definition
    next:
      default: collectDocuments

  # Step 2: Collect business documents
  - id: collectDocuments
    task_ref: documents/corporate        # Reference to task definition
    next:
      conditions:
        - when: "risk_score > 70"
          then: enhancedDueDiligence
      default: review

  # Step 3: Enhanced Due Diligence (conditional)
  - id: enhancedDueDiligence
    task_ref: due_diligence/enhanced     # Reference to task definition
    next:
      default: review

  # Step 4: Review and submit
  - id: review
    task_ref: review/summary             # Reference to task definition
    next:
      default: END
```

**Key Characteristics:**
- ✅ Clean, focused on orchestration logic
- ✅ No schema definitions (delegated to task files)
- ✅ Easy to understand workflow flow
- ✅ `task_ref` is relative path from `data/tasks/`
- ❌ Cannot define schemas inline (strict ground truth enforcement)
- ❌ Cannot override task schemas

**File Size Reduction:**
- Before (inline schemas): 200-300 lines
- After (task references): 30-50 lines
- **Reduction: 85%**

#### 2.2.3 Level 2: Task Files

**Purpose:** Define canonical field schemas, validation rules, UI component configuration (ground truth)

**Location:** `data/tasks/<category>/<specific_task>.yaml`

**Schema:**

```yaml
id: string                               # Unique task identifier
name: string                             # Human-readable name
description: string                      # Task description
version: number                          # Task version (managed within file)
extends: string (optional)               # Base task to inherit from (e.g., "_base/contact_info_base")

component_id: string                     # UI component to render

required_fields: string[]                # Fields that must be collected to complete this task

schema:                                  # Ground truth schema definition
  # For component_id: "form"
  fields:
    - name: string
      label: string
      type: FieldType
      required: boolean (optional)
      placeholder: string (optional)
      helpText: string (optional)
      defaultValue: any (optional)
      visible: string (optional)
      validation: { ... }
      options: [ { value, label } ]
  layout: string (optional)
  submitLabel: string (optional)
  cancelLabel: string (optional)

  # For component_id: "document-upload"
  documents:
    - id: string
      label: string
      required: boolean
      acceptedTypes: string[]
      maxSize: number
      helpText: string (optional)
  allowMultiple: boolean (optional)
  uploadLabel: string (optional)

expected_output_fields: string[]         # Fields this task outputs (for validation)

tags: string[] (optional)                # Tags for categorization/search
```

**Example: Base Contact Info Task**

```yaml
id: task_contact_info_base
name: Contact Information (Base)
description: Base task for collecting contact information - defines common fields
version: 1

component_id: form

required_fields:
  - email
  - phone

schema:
  fields:
    - name: email
      label: "Email Address"
      type: email
      required: true
      placeholder: "email@example.com"
      helpText: "Primary email address for communication"
      validation:
        pattern: "^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$"

    - name: phone
      label: "Phone Number"
      type: tel
      required: true
      placeholder: "+1 (555) 123-4567"
      helpText: "Primary contact phone number"
      validation:
        pattern: "^\\+?[1-9]\\d{1,14}$"

  layout: single-column

expected_output_fields:
  - email
  - phone

tags:
  - contact-info
  - base
```

**Example: Corporate Contact Info Task (Extends Base)**

```yaml
id: task_contact_info_corporate
name: Corporate Contact Information
description: Collect contact information for corporate entities
version: 1

extends: _base/contact_info_base         # Inherit email and phone from base

component_id: form

required_fields:
  - legal_name
  - entity_type
  - jurisdiction
  - business_email
  - business_phone

schema:
  fields:
    - name: legal_name
      label: "Legal Business Name"
      type: text
      required: true
      placeholder: "Acme Corporation"
      helpText: "Official registered business name"
      validation:
        minLength: 2
        maxLength: 200

    - name: entity_type
      label: "Entity Type"
      type: select
      required: true
      options:
        - value: corporation
          label: "Corporation (C-Corp or S-Corp)"
        - value: llc
          label: "Limited Liability Company (LLC)"
        - value: partnership
          label: "Partnership (GP or LP)"

    - name: jurisdiction
      label: "Jurisdiction of Incorporation"
      type: select
      required: true
      options:
        - value: US
          label: "United States"
        - value: CA
          label: "Canada"
        - value: GB
          label: "United Kingdom"

    # Renamed inherited fields
    - name: business_email
      inherits: email                    # Inherits validation from base
      label: "Business Email Address"
      placeholder: "contact@acmecorp.com"

    - name: business_phone
      inherits: phone
      label: "Business Phone Number"

  layout: two-column
  submitLabel: "Continue to Documents"

expected_output_fields:
  - legal_name
  - entity_type
  - jurisdiction
  - business_email
  - business_phone

tags:
  - contact-info
  - corporate
  - kyc
```

#### 2.2.4 Task Inheritance

**Purpose:** Enable reuse and composition of common field definitions

**Inheritance Rules:**

1. **Field Merging**: Child task fields merged with parent fields
2. **Field Override**: Child can override parent field by same `name`
3. **Field Inheritance**: Child can inherit specific field using `inherits` property
4. **Nested Inheritance**: Tasks can inherit from tasks that inherit from others
5. **Circular Detection**: Loader must detect and reject circular inheritance

**Inheritance Syntax:**

```yaml
# Option A: Full inheritance (merge all fields)
extends: _base/contact_info_base

# Option B: Selective inheritance with override
extends: _base/contact_info_base
schema:
  fields:
    # Add new field
    - name: legal_name
      label: "Legal Business Name"
      type: text

    # Override inherited field
    - name: email
      label: "Business Email"          # Override label only

    # Inherit with rename
    - name: business_email
      inherits: email                  # Copy base email definition
      label: "Business Email Address"  # But use new name
```

**Resolution Algorithm:**

```typescript
function resolveTaskInheritance(taskDef: TaskDefinition): TaskDefinition {
  if (!taskDef.extends) return taskDef;

  const parentDef = loadTask(taskDef.extends);

  if (hasCircularInheritance(taskDef, parentDef)) {
    throw new Error(`Circular inheritance detected`);
  }

  const resolvedParent = resolveTaskInheritance(parentDef);
  const mergedSchema = mergeSchemas(resolvedParent.schema, taskDef.schema);

  return {
    ...taskDef,
    schema: mergedSchema,
    required_fields: taskDef.required_fields, // Task defines its own requirements
    expected_output_fields: [
      ...resolvedParent.expected_output_fields,
      ...taskDef.expected_output_fields
    ]
  };
}
```

#### 2.2.5 Workflow Compilation Process

**Two-Stage Loading:**

```typescript
// Stage 1: Load workflow definition
const workflowDef = await loadYAML<WorkflowDefinition>(
  'data/workflows/corporate_onboarding_v1.yaml'
);

// Stage 2: Resolve all task references
const compiledSteps = await Promise.all(
  workflowDef.steps.map(async (stepRef) => {
    // Load task definition
    const taskDef = await loadTask(stepRef.task_ref);

    // Resolve inheritance
    const resolvedTask = resolveTaskInheritance(taskDef);

    // Validate (task's required_fields are ground truth)
    validateTask(resolvedTask);

    // Return compiled step
    return {
      id: stepRef.id,
      task_ref: stepRef.task_ref,
      task_definition: resolvedTask,
      component_id: resolvedTask.component_id,
      schema: resolvedTask.schema,
      required_fields: resolvedTask.required_fields, // From task file
      next: stepRef.next
    };
  })
);

return {
  workflowId: workflowDef.id,
  version: workflowDef.version,
  initialStepId: compiledSteps[0].id,
  steps: compiledSteps,
  stepIndexById: buildStepIndex(compiledSteps)
};
```

#### 2.2.6 Validation Rules

**Workflow-Level:**
- All `task_ref` must point to existing files
- All step IDs unique
- All transitions reference valid steps
- No orphaned steps

**Task-Level:**
- All field names unique within task
- Valid field types
- If `extends` specified, base task must exist
- No circular inheritance chains
- If field uses `inherits`, referenced field exists in parent

**Cross-Level:**
- Task `component_id` exists in component registry

#### 2.2.7 Benefits of Two-Level Architecture

**Separation of Concerns:**
- Workflows focus on business process flow
- Tasks focus on data collection
- Clear responsibility boundaries

**Reusability:**
- Task definitions shared across workflows
- Example: `contact_info/corporate` used in onboarding, account update, KYC review

**Single Source of Truth:**
- Task files are canonical schema definitions
- No duplication across workflows
- Update once, affects all workflows

**Maintainability:**
- Update field label: Edit one task file
- All workflows automatically updated
- Versioning within files (no file proliferation)

**Inheritance & Composition:**
- Base tasks define common fields
- Specific tasks extend and customize
- Powerful composition without code

**Testability:**
- Test task definitions independently
- Test workflow orchestration separately
- Clear test boundaries

---

## 3. Implementation Tasks

### Task 1: Self-Hosted CopilotKit Runtime (~2 hours)

**Objective:** Set up Next.js project with CopilotKit runtime endpoint

**Steps:**

A. **Initialize Next.js Project** (30 min)
```bash
npx create-next-app@latest explore_copilotkit --typescript --tailwind --app
cd explore_copilotkit
npm install @copilotkit/react-core @copilotkit/runtime
npm install yaml
```

B. **Create API Route** (1 hour)
- File: `app/api/copilotkit/route.ts`
- Configure OpenAI adapter
- Add error handling
- Set up streaming support

C. **Configure Environment** (15 min)
- Create `.env.local`
- Add `OPENAI_API_KEY`
- Add to `.gitignore`

D. **Test Integration** (15 min)
- Create test page
- Verify AI responds
- Check streaming works

**Acceptance Criteria:**
- ✅ `/api/copilotkit` endpoint responds
- ✅ AI generates responses
- ✅ Streaming works
- ✅ No API key committed

**Files Created:**
- `app/api/copilotkit/route.ts`
- `.env.local`
- `.env.example`

---

### Task 2: YAML Workflow Loader (~2 hours)

**Objective:** Implement two-stage YAML loading with task resolution

**Steps:**

A. **Define TypeScript Schemas** (30 min)
```typescript
// lib/workflow/schema.ts

interface WorkflowDefinition {
  id: string;
  name: string;
  version: number;
  applies_to: {
    client_type: string;
    jurisdictions: string[];
  };
  steps: WorkflowStepReference[];
}

interface WorkflowStepReference {
  id: string;
  task_ref: string;
  next: TransitionRules;
}

interface TaskDefinition {
  id: string;
  name: string;
  version: number;
  extends?: string;
  component_id: string;
  required_fields: string[];
  schema: any;
  expected_output_fields: string[];
}

interface CompiledWorkflowStep {
  id: string;
  task_ref: string;
  task_definition: TaskDefinition;
  component_id: string;
  schema: any;
  required_fields: string[];
  next: TransitionRules;
}
```

B. **Implement Loaders** (1 hour)
```typescript
// lib/workflow/loader.ts

async function loadWorkflow(path: string): Promise<WorkflowDefinition>
async function loadTask(taskRef: string): Promise<TaskDefinition>
async function resolveTaskInheritance(task: TaskDefinition): Promise<TaskDefinition>
async function compileWorkflow(workflowPath: string): Promise<CompiledWorkflow>
```

C. **Add Validation** (20 min)
- Validate task references exist
- Check for circular inheritance
- Validate field consistency

D. **Implement Workflow Selection** (10 min)
```typescript
function pickApplicableWorkflow(
  workflows: WorkflowDefinition[],
  profile: { client_type: string; jurisdiction: string }
): WorkflowDefinition
```

**Acceptance Criteria:**
- ✅ Loads workflow YAML files
- ✅ Resolves task references
- ✅ Handles task inheritance
- ✅ Validates all references
- ✅ Detects circular inheritance
- ✅ Selects workflow by client_type/jurisdiction

**Files Created:**
- `lib/workflow/schema.ts`
- `lib/workflow/loader.ts`

---

### Task 3: Component Registry (~2 hours)

**Objective:** Create registry pattern with schema-driven components

**Steps:**

A. **Define Registry Interface** (15 min)
```typescript
// lib/ui/component-registry.ts

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
```

B. **Create Registry** (15 min)
```typescript
import { GenericFormWrapper } from '@/components/onboarding/generic-form-wrapper';
import { GenericDocumentUploadWrapper } from '@/components/onboarding/generic-document-upload-wrapper';

const UI_COMPONENT_REGISTRY: Record<string, RegistryComponent> = {
  'form': GenericFormWrapper,
  'document-upload': GenericDocumentUploadWrapper,
  'data-table': GenericDataTableWrapper,
  'review-summary': ReviewSummaryWrapper,
};

export function getComponent(componentId: string): RegistryComponent | null {
  return UI_COMPONENT_REGISTRY[componentId] || null;
}

export function getAvailableComponentIds(): string[] {
  return Object.keys(UI_COMPONENT_REGISTRY);
}
```

C. **Create Generic `renderUI` Action** (1 hour)
```typescript
// components/workflow-chat.tsx

useCopilotAction({
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
    const componentId = args.componentId || currentStep?.component_id;
    const Component = getComponent(componentId);

    if (!Component) {
      return <ErrorComponent message={`Unknown component: ${componentId}`} />;
    }

    const componentData = {
      schema: currentStep?.schema,
      initialValues: {
        ...collectedInputs,
        ...(args.data || {})
      }
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
          respond?.(JSON.stringify({
            success: progression.canProgress,
            data: result.data,
            nextStepId: progression.nextStepId
          }));
        }}
      />
    );
  }
});
```

D. **Error Handling** (15 min)
- Handle component not found
- Handle missing schema
- Graceful degradation

**Acceptance Criteria:**
- ✅ Registry maps component_id to React component
- ✅ `getComponent()` returns correct component
- ✅ `renderUI` action passes schema to component
- ✅ Error handling for unknown components
- ✅ Registry contains only generic components (3-5)

**Files Created:**
- `lib/ui/component-registry.ts`

---

### Task 4: Workflow Engine (~4 hours)

**Objective:** Build runtime state machine with transitions and validation

**Steps:**

A. **Compile Runtime Machine** (1.5 hours)
```typescript
// lib/workflow/engine.ts

interface RuntimeMachine {
  workflowId: string;
  version: number;
  initialStepId: string;
  steps: CompiledWorkflowStep[];
  stepIndexById: Map<string, CompiledWorkflowStep>;
}

function compileRuntimeMachine(workflow: WorkflowDefinition): RuntimeMachine {
  // Resolve all tasks
  // Build step index
  // Validate transitions
}
```

B. **Expression Evaluation** (1 hour)
```typescript
function evaluateExpression(expr: string, inputs: Record<string, any>): boolean {
  // Support operators: >, >=, <, <=, ==, !=, in
  // Example: "risk_score > 70"
  // Example: "entity_type == 'corporation'"
}
```

C. **State Transition Logic** (1 hour)
```typescript
function nextStepId(
  step: CompiledWorkflowStep,
  inputs: Record<string, any>
): string | null {
  // Evaluate conditions
  // Return matching step or default
  // Return null if END
}

function missingRequiredFields(
  step: CompiledWorkflowStep,
  inputs: Record<string, any>
): string[] {
  // Check step.required_fields against inputs
  // Return array of missing field names
}
```

D. **Create Workflow State Hook** (30 min)
```typescript
// lib/workflow/hooks.ts

export function useWorkflowState(workflowId: string) {
  const [currentStepId, setCurrentStepId] = useState<string | null>(null);
  const [collectedInputs, setCollectedInputs] = useState<Record<string, any>>({});
  const [machine, setMachine] = useState<RuntimeMachine | null>(null);

  const currentStep = machine?.stepIndexById.get(currentStepId || '');

  const canProgress = () => {
    if (!currentStep) return false;
    return missingRequiredFields(currentStep, collectedInputs).length === 0;
  };

  const progressToNextStep = () => {
    if (!currentStep || !canProgress()) {
      return { success: false, nextStepId: null };
    }
    const next = nextStepId(currentStep, collectedInputs);
    setCurrentStepId(next);
    return { success: true, nextStepId: next };
  };

  return {
    currentStep,
    collectedInputs,
    updateInputs: setCollectedInputs,
    canProgress,
    progressToNextStep,
    isComplete: currentStepId === null
  };
}
```

**Acceptance Criteria:**
- ✅ Compiles workflow to runtime machine
- ✅ Evaluates conditional expressions
- ✅ Computes next step correctly
- ✅ Validates required fields
- ✅ Hook tracks workflow state
- ✅ Handles END state

**Files Created:**
- `lib/workflow/engine.ts`
- `lib/workflow/hooks.ts`

---

### Task 5: Schema-Driven UI Components (~6 hours)

**Objective:** Build generic components that render based on schemas

**Steps:**

A. **Field Schema Types** (30 min)
```typescript
// lib/types/field-schema.ts
// Define FieldSchema, FormSchema, DocumentSchema
// (See section 2.1.5 for complete types)
```

B. **Generic Form Component** (2 hours)
```typescript
// components/ui/generic-form.tsx

export function GenericForm({
  schema,
  initialData,
  isLoading,
  onSubmit,
  onCancel
}: GenericFormProps) {
  // State management
  // Conditional visibility logic
  // Validation logic
  // Dynamic field rendering
  // Layout handling
}
```

Features to implement:
- Dynamic field rendering
- Validation (required, pattern, length, range)
- Conditional field visibility
- Layout options (single/two-column, grid)
- Error display

C. **FormField Component** (1 hour)
```typescript
// components/ui/form-field.tsx

export function FormField({
  field,
  value,
  error,
  disabled,
  onChange
}: FormFieldProps) {
  // Render appropriate input based on field.type
  // Support: text, email, tel, number, date, textarea, select, checkbox, radio
}
```

D. **Three-Pane Layout** (1.5 hours)
```typescript
// components/layout/left-pane.tsx - Client list
// components/layout/middle-pane.tsx - Profile, timeline, required fields
// components/layout/right-pane.tsx - Form + chat
```

E. **Registry Wrappers** (1 hour)
```typescript
// components/onboarding/generic-form-wrapper.tsx

export function GenericFormWrapper({
  data,
  status,
  onComplete
}: RegistryComponentProps) {
  const schema: FormSchema = data.schema || { fields: [] };
  const initialValues = data.initialValues || {};

  return (
    <GenericForm
      schema={schema}
      initialData={initialValues}
      isLoading={status === 'executing'}
      onSubmit={(formData) => {
        onComplete({ action: 'submit', data: formData });
      }}
      onCancel={() => {
        onComplete({ action: 'cancel', data: {} });
      }}
    />
  );
}
```

**Acceptance Criteria:**
- ✅ GenericForm renders fields from schema
- ✅ All field types supported
- ✅ Validation works (client-side)
- ✅ Conditional visibility works
- ✅ Layout options work
- ✅ Three-pane layout implemented
- ✅ Wrappers adapt to registry interface

**Files Created:**
- `lib/types/field-schema.ts`
- `components/ui/generic-form.tsx`
- `components/ui/form-field.tsx`
- `components/layout/left-pane.tsx`
- `components/layout/middle-pane.tsx`
- `components/layout/right-pane.tsx`
- `components/onboarding/generic-form-wrapper.tsx`

---

### Task 6: Integration (~1 hour)

**Objective:** Wire all components together for end-to-end flow

**Steps:**

A. **Create Main Page** (30 min)
```typescript
// app/page.tsx

export default function OnboardingPage() {
  const { currentStep, collectedInputs, ... } = useWorkflowState('wf_corporate_v1');

  return (
    <div className="flex h-screen">
      <LeftPane clients={mockClients} />
      <MiddlePane
        profile={selectedClient}
        currentStep={currentStep}
        collectedInputs={collectedInputs}
      />
      <RightPane>
        <WorkflowChat
          currentStep={currentStep}
          onStepComplete={progressToNextStep}
        />
      </RightPane>
    </div>
  );
}
```

B. **Connect MiddlePane to Workflow** (15 min)
- Display required fields from current step
- Show completion status
- Display timeline

C. **Test End-to-End Flow** (15 min)
- Load workflow
- Navigate through steps
- Collect data
- Verify transitions
- Test conditional branching

**Acceptance Criteria:**
- ✅ Workflow loads on page load
- ✅ Current step displays correctly
- ✅ Form submission progresses to next step
- ✅ Required fields enforced
- ✅ Conditional branching works
- ✅ Data persists across steps

**Files Created:**
- `app/page.tsx`

---

### Task 7: Documentation (~1 hour)

**Objective:** Document setup, usage, and architecture

**Steps:**

A. **README.md** (30 min)
- Project overview
- Setup instructions
- Running locally
- Environment variables
- Project structure

B. **YAML Schema Documentation** (20 min)
- Workflow file format
- Task file format
- Inheritance rules
- Examples

C. **Component Usage Examples** (10 min)
- How to use GenericForm
- How to add new component types
- Registry pattern explanation

**Deliverables:**
- `README.md`
- `docs/yaml-schema.md`
- `docs/component-guide.md`

---

## 4. Examples & Code

### 4.1 Complete YAML Examples

#### Individual Onboarding Workflow

**File:** `data/workflows/individual_onboarding_v1.yaml`

```yaml
id: wf_individual_v1
name: Individual Onboarding v1
version: 1
description: Onboarding workflow for individual clients

applies_to:
  client_type: individual
  jurisdictions: ["US", "CA", "GB"]

steps:
  - id: collectContactInfo
    task_ref: contact_info/individual
    next:
      default: collectDocuments

  - id: collectDocuments
    task_ref: documents/individual
    next:
      default: review

  - id: review
    task_ref: review/summary
    next:
      default: END
```

#### Individual Contact Info Task

**File:** `data/tasks/contact_info/individual.yaml`

```yaml
id: task_contact_info_individual
name: Individual Contact Information
description: Collect contact information for individual clients
version: 1

extends: _base/contact_info_base

component_id: form

required_fields:
  - full_name
  - date_of_birth
  - email
  - phone
  - ssn

schema:
  fields:
    - name: full_name
      label: "Full Legal Name"
      type: text
      required: true
      placeholder: "John Michael Doe"
      helpText: "Name as it appears on government-issued ID"
      validation:
        minLength: 2
        maxLength: 100

    - name: date_of_birth
      label: "Date of Birth"
      type: date
      required: true
      helpText: "Must be 18 years or older"
      validation:
        max: "today-18years"

    # email and phone inherited from base

    - name: ssn
      label: "Social Security Number (Last 4 digits)"
      type: text
      required: true
      placeholder: "1234"
      helpText: "For identity verification purposes only"
      validation:
        pattern: "^\\d{4}$"
        minLength: 4
        maxLength: 4

  layout: single-column
  submitLabel: "Continue"

expected_output_fields:
  - full_name
  - date_of_birth
  - email
  - phone
  - ssn

tags:
  - contact-info
  - individual
  - kyc
```

#### Individual Documents Task

**File:** `data/tasks/documents/individual.yaml`

```yaml
id: task_documents_individual
name: Individual Document Upload
description: Upload required documents for individual identity verification
version: 1

component_id: document-upload

required_fields:
  - id_document
  - proof_of_address

schema:
  documents:
    - id: id_document
      label: "Government-Issued ID"
      required: true
      acceptedTypes:
        - image/jpeg
        - image/png
        - application/pdf
      maxSize: 5242880  # 5MB
      helpText: "Driver's license, passport, or national ID"

    - id: proof_of_address
      label: "Proof of Address"
      required: true
      acceptedTypes:
        - application/pdf
        - image/jpeg
        - image/png
      maxSize: 5242880
      helpText: "Utility bill or bank statement (within 3 months)"

  allowMultiple: false
  uploadLabel: "Upload Documents"

expected_output_fields:
  - id_document
  - proof_of_address

tags:
  - documents
  - individual
  - kyc
```

### 4.2 TypeScript Interface Examples

```typescript
// Complete workflow state interface
interface WorkflowState {
  workflowId: string;
  currentStepId: string | null;
  collectedInputs: Record<string, any>;
  machine: RuntimeMachine;
  isComplete: boolean;
}

// Complete step progression result
interface StepProgression {
  success: boolean;
  canProgress: boolean;
  missingFields: string[];
  nextStepId: string | null;
  isWorkflowComplete: boolean;
}
```

### 4.3 Design System

**Color Scheme: Professional Financial**
- Primary: `#1e40af` (Deep Blue) - Trust, stability
- Accent: `#14b8a6` (Teal) - Modern, approachable
- Success: `#10b981` (Emerald)
- Warning: `#f59e0b` (Amber)
- Danger: `#ef4444` (Rose)

**Typography:**
- System font stack
- Scale: 10px, 12px, 14px, 16px, 18px, 20px, 24px

**Spacing:**
- 8px grid system
- Common values: 8, 16, 24, 32, 48, 64

**Framework:**
- Tailwind CSS with custom theme configuration

---

## 5. Key Decisions

| ID | Decision | Selected Option | Rationale |
|----|----------|----------------|-----------|
| D1 | Project Structure | Standalone Next.js | Clean implementation |
| D2 | Domain | Financial onboarding | Realistic workflows |
| D3 | Component Decoupling | Registry pattern | YAML controls UI |
| D4 | Testing | Unit + integration | Quality without overhead |
| D5 | YAML Schema | `component_id` in step | Self-documenting |
| D6 | Workflow Loading | File-based YAML | Simple for POC |
| D7 | Error Handling | Graceful degradation | Operational resilience |
| D8 | CopilotKit Actions | Single `renderUI` | Scalable, extensible |
| D9 | State Management | Custom hook | Simple, testable |
| D10 | UI Design | Three-pane mockup | Professional, context-rich |
| D11 | Component Organization | By pane/feature | Clear separation |
| **D12** | **Component Reusability** | **Schema-driven** | **70% code reduction** |
| **D13** | **YAML Architecture** | **Two-level (workflow + task)** | **Single source of truth** |

---

## 6. Testing Strategy

### Unit Tests

**Coverage Target:** 80%+

**Test Files:**
- `lib/workflow/engine.test.ts` - Expression evaluation, state transitions
- `lib/workflow/loader.test.ts` - YAML loading, task resolution, inheritance
- `components/ui/generic-form.test.tsx` - Field rendering, validation
- `components/ui/form-field.test.tsx` - Individual field types

**Key Test Cases:**
- Task inheritance resolution
- Circular inheritance detection
- Conditional expression evaluation
- Required field validation
- Schema-driven form rendering
- Field visibility logic

### Integration Tests

**Test Files:**
- `tests/integration/workflow-execution.test.ts` - End-to-end workflow
- `tests/integration/copilotkit-integration.test.ts` - AI action flow

**Key Scenarios:**
- Load workflow → render form → submit → progress
- Conditional branching based on inputs
- Multi-step data collection
- Error handling and recovery

### Testing Commands

```bash
# Run all tests
npm test

# Run with coverage
npm test -- --coverage

# Run specific test file
npm test -- engine.test.ts

# Watch mode
npm test -- --watch
```

---

## 7. Next Steps

### Immediate Actions (Ready to Begin)

1. ✅ Planning complete
2. ✅ Architecture finalized
3. ✅ Examples created
4. → **Begin Task 1**: Self-Hosted CopilotKit Runtime

### Implementation Order

1. **Task 1**: CopilotKit Runtime (foundation)
2. **Task 2**: YAML Loader (data layer)
3. **Task 4**: Workflow Engine (business logic)
4. **Task 3**: Component Registry (glue layer)
5. **Task 5**: UI Components (presentation)
6. **Task 6**: Integration (wire together)
7. **Task 7**: Documentation

### Success Criteria

Before considering POC complete:
- ✅ 2+ workflows execute successfully
- ✅ Task inheritance works
- ✅ Conditional branching works
- ✅ Forms validate and collect data
- ✅ AI assistant responds appropriately
- ✅ 80%+ test coverage
- ✅ Documentation complete

---

## 8. Appendix

### A. File Organization Best Practices

**Task File Naming:**
- Lowercase with underscores: `contact_info.yaml`
- Be specific: `corporate.yaml` not `corp.yaml`
- Version in metadata, not filename

**Base Task Naming:**
- Prefix with `_base/` directory
- Suffix with `_base`: `contact_info_base.yaml`
- Keep minimal (common fields only)

**Task ID Convention:**
```
task_{category}_{specific}

Examples:
- task_contact_info_base
- task_contact_info_corporate
- task_documents_individual
- task_due_diligence_enhanced
```

### B. Migration from Inline Schemas (If Needed)

**Step 1:** Identify common schemas across workflows

**Step 2:** Extract schemas into task files
- Create base tasks for common fields
- Create specific tasks extending base

**Step 3:** Update workflow files
- Remove inline schemas
- Add `task_ref` pointing to task files

**Step 4:** Update loader
- Implement two-stage loading
- Add inheritance resolution

**Step 5:** Test thoroughly

### C. Future Enhancements (Not in POC)

**Potential Additions:**
1. Task versioning (multiple versions of same task)
2. Conditional fields at task level (complex visibility)
3. Field dependencies (inter-field relationships)
4. Computed fields (calculated from other fields)
5. Task composition (combine multiple tasks)
6. Dynamic task selection (choose based on runtime data)
7. Task templates (parameterized tasks)
8. Shared validation libraries

### D. Reference Documentation

**Planning Documents (Archived):**
- `decision-log.md` - All architectural decisions with rationale
- `design-system.md` - Complete UI specification
- `component-registry-explained.md` - Registry pattern deep dive
- `yaml-examples/` - Example workflow and task files

**Mockup:**
- `onboarding-mockup-with-form.excalidraw` - UI design reference

---

**Document Version:** 1.0
**Created:** 2025-10-21
**Status:** ✅ Complete - Ready for Implementation
**Next Action:** Begin Task 1 - Self-Hosted CopilotKit Runtime
