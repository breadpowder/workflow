# Code Introduction - React + Next.js + CopilotKit Workflow System

**For Developers New to React/Next.js**

This guide explains the architecture, control flow, and data flow of this YAML-driven workflow system with AI capabilities.

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [High-Level Architecture](#high-level-architecture)
3. [Directory Structure Explained](#directory-structure-explained)
4. [Key Concepts for React/Next.js Beginners](#key-concepts-for-reactnextjs-beginners)
5. [Complete User Journey with Control Flow](#complete-user-journey-with-control-flow)
6. [Data Flow with Real Code Examples](#data-flow-with-real-code-examples)
7. [Component Deep Dive](#component-deep-dive)
8. [API Endpoints Explained](#api-endpoints-explained)
9. [Workflow Engine Mechanics](#workflow-engine-mechanics)
10. [How to Navigate and Extend](#how-to-navigate-and-extend)

---

## Project Overview

### What This Project Does

This is a **YAML-driven workflow system** for React applications that:

- **Defines workflows in YAML files** (no code changes needed for business logic changes)
- **Renders dynamic forms and UI** based on workflow definitions
- **Integrates AI chat** via CopilotKit for conversational workflow guidance
- **Persists client state** across sessions
- **Validates transitions** between workflow steps

**Example Use Case:** Client onboarding for corporate vs. individual clients with different workflows.

### Technology Stack

| Technology | Purpose |
|------------|---------|
| **Next.js 15** | Full-stack React framework (handles routing, API, rendering) |
| **React 19** | UI library for building components |
| **TypeScript** | Type-safe JavaScript |
| **CopilotKit** | AI chat integration (self-hosted runtime) |
| **Tailwind CSS** | Utility-first styling |
| **YAML** | Workflow and task definitions |

---

## High-Level Architecture

### System Architecture Diagram

```
┌──────────────────────────────────────────────────────────────────────┐
│                          USER INTERFACE                              │
│  (React Components + Tailwind CSS + CopilotKit Chat)                │
└──────────────────┬───────────────────────────────────────────────────┘
                   │
                   │ HTTP Requests (GET/POST)
                   │
┌──────────────────▼───────────────────────────────────────────────────┐
│                    NEXT.JS API ROUTES (Backend)                      │
│  ┌────────────────┐  ┌──────────────┐  ┌─────────────────────────┐  │
│  │ /api/workflows │  │ /api/client- │  │ /api/copilotkit         │  │
│  │                │  │    state     │  │ (AI Runtime)            │  │
│  └───────┬────────┘  └──────┬───────┘  └──────────┬──────────────┘  │
│          │                  │                      │                 │
│          │                  │                      │                 │
└──────────┼──────────────────┼──────────────────────┼─────────────────┘
           │                  │                      │
           │                  │                      │
┌──────────▼──────────────────▼──────────────────────▼─────────────────┐
│                      WORKFLOW ENGINE (lib/workflow/)                 │
│  ┌──────────┐  ┌─────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │ loader.ts│  │ engine.ts   │  │ schema.ts    │  │ state-store.ts│  │
│  │ (YAML    │  │ (Execution  │  │ (TypeScript  │  │ (Persistence) │  │
│  │  Parser) │  │  Logic)     │  │  Types)      │  │               │  │
│  └────┬─────┘  └──────┬──────┘  └──────────────┘  └───────┬───────┘  │
│       │               │                                    │          │
└───────┼───────────────┼────────────────────────────────────┼──────────┘
        │               │                                    │
        │               │                                    │
┌───────▼───────────────▼────────────────────────────────────▼──────────┐
│                        FILE SYSTEM (data/)                            │
│  ┌───────────────────┐  ┌────────────────┐  ┌──────────────────────┐ │
│  │ workflows/*.yaml  │  │ tasks/**/*.yaml│  │ client_state/*.json  │ │
│  │ (Orchestration)   │  │ (Task Schemas) │  │ (Persisted State)    │ │
│  └───────────────────┘  └────────────────┘  └──────────────────────┘ │
└───────────────────────────────────────────────────────────────────────┘
```

### Key Architectural Principles

1. **Separation of Concerns**
   - **UI (components/)**: Pure presentation, no business logic
   - **Logic (lib/)**: Business logic, no UI imports
   - **Data (data/)**: YAML definitions, JSON state
   - **Routes (app/)**: Next.js pages and API endpoints

2. **Component Registry Pattern**
   - YAML references components by ID (`component_id: 'form'`)
   - Registry maps ID to React component (`'form' → GenericForm`)
   - Decouples workflow definitions from UI implementation

3. **YAML-Driven Configuration**
   - Business users can edit workflows without code changes
   - Two-level hierarchy: Workflows → Tasks
   - Supports inheritance and composition

---

## Directory Structure Explained

### Top-Level Structure

```
explore_copilotkit/
├── app/              # Next.js App Router (pages + API routes)
├── components/       # React UI components (presentation only)
├── lib/              # Business logic, hooks, utilities (no UI)
├── data/             # YAML workflows, tasks, persisted state
├── public/           # Static assets (images, fonts)
├── package.json      # Dependencies and scripts
└── tsconfig.json     # TypeScript configuration
```

### Detailed Breakdown

#### `/app` - Next.js App Router

**Purpose:** Routing and API endpoints

**Structure:**
```
app/
├── layout.tsx                # Root layout (wraps all pages)
├── page.tsx                  # Root page (/) - redirects to /onboarding
├── onboarding/
│   └── page.tsx              # Onboarding workflow page (/onboarding)
└── api/                      # Backend API routes
    ├── copilotkit/route.ts   # AI runtime endpoint
    ├── workflows/route.ts    # Workflow loading API
    ├── client-state/route.ts # Client state persistence API
    └── workflow-test/route.ts # Engine testing API
```

**How Next.js Routing Works:**
- Each folder with `page.tsx` becomes a route
- `app/page.tsx` → `/` (root)
- `app/onboarding/page.tsx` → `/onboarding`
- `app/api/workflows/route.ts` → `/api/workflows` (API endpoint)

#### `/components` - UI Components

**Purpose:** Reusable React components (presentation only)

**Structure:**
```
components/
├── layout/                   # Layout containers
│   ├── three-pane-layout.tsx # Main 3-pane container
│   ├── left-pane.tsx         # Client list pane (316px)
│   ├── middle-pane.tsx       # Client details pane (flex)
│   └── right-pane.tsx        # Chat + forms pane (476px)
├── onboarding/               # Onboarding-specific UI
│   ├── client-list.tsx       # Searchable client list
│   ├── client-selector.tsx   # Client type selector
│   ├── profile-section.tsx   # Client profile display
│   ├── required-fields-section.tsx # Field checklist
│   ├── timeline-section.tsx  # Activity timeline
│   ├── workflow-progress.tsx # Progress indicators
│   ├── client-folder.tsx     # Client folder view
│   └── form-overlay.tsx      # Sliding form overlay
├── chat/                     # Chat interface
│   ├── chat-section.tsx      # Main chat container
│   ├── message.tsx           # User/AI message bubbles
│   └── system-message.tsx    # System notifications
└── workflow/                 # Registry components
    ├── GenericForm.tsx       # Dynamic form renderer
    ├── DocumentUpload.tsx    # File upload component
    ├── ReviewSummary.tsx     # Review screen
    ├── DataTable.tsx         # Data table
    ├── ProgressBar.tsx       # Progress visualization
    └── StageIndicator.tsx    # Stage progress indicator
```

**Component Rules:**
- ✅ Only UI rendering logic
- ✅ Receive data via props
- ✅ Call parent callbacks for events
- ❌ No direct API calls
- ❌ No business logic

#### `/lib` - Business Logic

**Purpose:** Business logic, state management, utilities (NO UI)

**Structure:**
```
lib/
├── workflow/                 # Workflow engine core
│   ├── schema.ts             # TypeScript types for workflows & tasks
│   ├── engine.ts             # Workflow execution engine
│   ├── loader.ts             # YAML loading & compilation
│   ├── state-store.ts        # File-based state persistence
│   └── __tests__/
│       └── engine.test.ts    # Unit tests
├── ui/
│   ├── component-registry.ts # Component registry implementation
│   └── registry-init.ts      # Registry initialization
├── hooks/                    # React hooks
│   ├── useWorkflowState.tsx  # Workflow state management
│   └── useWorkflowActions.tsx # CopilotKit action hooks
├── mock-data/
│   └── clients.ts            # Sample client data
└── types/                    # Shared TypeScript types
```

**Library Rules:**
- ✅ Business logic, algorithms, state management
- ✅ Export functions and hooks
- ❌ No UI components
- ❌ No JSX rendering (except hooks)

#### `/data` - YAML Workflows & State

**Purpose:** Data-driven configuration and persistence

**Structure:**
```
data/
├── workflows/                # Level 1: Workflow orchestration
│   ├── corporate_onboarding_v1.yaml
│   └── individual_onboarding_v1.yaml
├── tasks/                    # Level 2: Task schemas (ground truth)
│   ├── _base/                # Base definitions for inheritance
│   │   └── contact_info_base.yaml
│   ├── contact_info/
│   │   ├── corporate.yaml
│   │   └── individual.yaml
│   ├── documents/
│   ├── due_diligence/
│   └── review/
│       └── summary.yaml
└── client_state/             # Persisted client workflow states
    └── client_*.json         # One JSON file per client
```

**Two-Level Hierarchy:**
- **Workflows** → Define step sequence, transitions, conditions
- **Tasks** → Define form fields, validation, UI components

---

## Key Concepts for React/Next.js Beginners

### 1. React Components

**What is a React Component?**

A component is a reusable piece of UI. Think of it like a custom HTML tag.

**Example:**
```tsx
// Simple component definition
function Welcome({ name }: { name: string }) {
  return <h1>Hello, {name}!</h1>;
}

// Usage
<Welcome name="Alice" />
// Renders: <h1>Hello, Alice!</h1>
```

**Two Types of Components:**

1. **Function Components** (modern approach - what this project uses)
   ```tsx
   export default function MyComponent({ title }: { title: string }) {
     return <div>{title}</div>;
   }
   ```

2. **Class Components** (legacy - not used in this project)

### 2. Props (Properties)

**Props** are how you pass data from parent to child components.

**Example from this project:**
```tsx
// Parent component (onboarding/page.tsx)
<ProfileSection
  client={selectedClient}
  inputs={inputs}
  currentStage={currentStage}
/>

// Child component (components/onboarding/profile-section.tsx)
interface ProfileSectionProps {
  client: Client;
  inputs: Record<string, unknown>;
  currentStage: string;
}

export default function ProfileSection({
  client,
  inputs,
  currentStage
}: ProfileSectionProps) {
  return (
    <div>
      <h2>{client.name}</h2>
      <p>Stage: {currentStage}</p>
    </div>
  );
}
```

**Key Points:**
- Props flow **down** (parent → child)
- Props are **read-only** (immutable)
- To update, child calls parent's callback function

### 3. Hooks

**What are Hooks?**

Hooks are special React functions that let you use state and other React features in function components.

**Common Hooks:**

1. **`useState`** - Manage component state
   ```tsx
   const [count, setCount] = useState(0); // Initial value: 0

   <button onClick={() => setCount(count + 1)}>
     Clicked {count} times
   </button>
   ```

2. **`useEffect`** - Run code when component mounts or updates
   ```tsx
   useEffect(() => {
     console.log('Component mounted or updated');

     // Cleanup function (runs on unmount)
     return () => {
       console.log('Component unmounted');
     };
   }, [dependency]); // Re-run when dependency changes
   ```

3. **Custom Hooks** - Reusable logic (this project uses these heavily)
   ```tsx
   // lib/hooks/useWorkflowState.tsx
   function useWorkflowState(clientId: string, clientProfile: ClientProfile) {
     const [currentStep, setCurrentStep] = useState<WorkflowStep | null>(null);
     const [inputs, setInputs] = useState<Record<string, unknown>>({});

     // ... complex workflow logic ...

     return { currentStep, inputs, updateInput, goToNextStep };
   }

   // Usage in component
   const { currentStep, inputs, updateInput } = useWorkflowState(clientId, profile);
   ```

### 4. Next.js App Router

**How Routing Works:**

Next.js uses **file-based routing** - the folder structure defines routes.

**Examples:**
```
app/page.tsx                  → /
app/onboarding/page.tsx       → /onboarding
app/api/workflows/route.ts    → /api/workflows (API endpoint)
```

**Special Files:**
- `page.tsx` → Page component (renders at route)
- `layout.tsx` → Shared layout wrapper
- `route.ts` → API endpoint handler

### 5. Server vs. Client Components

Next.js 15 distinguishes between server and client components.

**Server Components** (default):
- Run on server only
- Can access databases, file system
- Smaller JavaScript bundle
- **Cannot use hooks or browser APIs**

**Client Components** (opt-in with `'use client'`):
- Run in browser
- Can use hooks, event handlers, browser APIs
- Necessary for interactivity

**Example:**
```tsx
'use client'; // This directive makes it a client component

import { useState } from 'react';

export default function Counter() {
  const [count, setCount] = useState(0); // Hooks only work in client components

  return (
    <button onClick={() => setCount(count + 1)}>
      Count: {count}
    </button>
  );
}
```

**This project mostly uses client components** because of interactivity (forms, chat, hooks).

### 6. TypeScript Basics

**Why TypeScript?**

TypeScript adds **type safety** to JavaScript, catching errors before runtime.

**Examples:**
```typescript
// Type annotation
const name: string = "Alice";
const age: number = 30;

// Interface (defines shape of object)
interface Client {
  id: string;
  name: string;
  type: 'corporate' | 'individual'; // Only these two values allowed
  jurisdiction: string;
}

// Function with typed parameters and return value
function greet(client: Client): string {
  return `Hello, ${client.name}!`;
}

// Type error - won't compile
greet({ id: '123', name: 'Bob' }); // Error: missing 'type' and 'jurisdiction'
```

**This project uses TypeScript extensively** for workflow definitions, component props, API responses.

---

## Complete User Journey with Control Flow

### ASCII Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│ STEP 1: User opens /onboarding page                                    │
└────┬────────────────────────────────────────────────────────────────────┘
     │
     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ STEP 2: Next.js renders app/onboarding/page.tsx (Client Component)     │
│  - Imports useWorkflowState hook                                        │
│  - Imports CopilotKit components                                        │
└────┬────────────────────────────────────────────────────────────────────┘
     │
     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ STEP 3: useWorkflowState hook initializes                              │
│  ┌────────────────────────────────────────────────────────────┐         │
│  │ useEffect runs on mount:                                   │         │
│  │  1. Fetch workflow from /api/workflows?client_type=...     │         │
│  │  2. Fetch client state from /api/client-state?clientId=... │         │
│  │  3. If no state, POST to /api/client-state (initialize)    │         │
│  └────────────────────────────────────────────────────────────┘         │
└────┬────────────────────────────────────────────────────────────────────┘
     │
     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ STEP 4: API Route /api/workflows processes request                     │
│  ┌────────────────────────────────────────────────────────────┐         │
│  │ 1. loadWorkflows() - Read YAML files from data/workflows/  │         │
│  │ 2. pickApplicableWorkflow() - Match client_type/jurisdiction│         │
│  │ 3. compileWorkflow() - Build RuntimeMachine                │         │
│  │    - Load referenced tasks from data/tasks/                │         │
│  │    - Resolve task inheritance (_base)                      │         │
│  │    - Build step index (Map) for O(1) lookup                │         │
│  │ 4. Return JSON: { machine: RuntimeMachine }                │         │
│  └────────────────────────────────────────────────────────────┘         │
└────┬────────────────────────────────────────────────────────────────────┘
     │
     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ STEP 5: useWorkflowState receives response                             │
│  - Stores machine in state: setMachine(data.machine)                   │
│  - Computes current step: getStepById(machine, currentStepId)          │
│  - Component re-renders with new state                                 │
└────┬────────────────────────────────────────────────────────────────────┘
     │
     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ STEP 6: Page component renders current step UI                         │
│  ┌────────────────────────────────────────────────────────────┐         │
│  │ 1. Get current step from useWorkflowState                  │         │
│  │ 2. Look up component via registry:                         │         │
│  │    const Component = getComponent(step.component_id);      │         │
│  │ 3. Render component with props:                            │         │
│  │    <Component                                              │         │
│  │      schema={step.schema}                                  │         │
│  │      inputs={inputs}                                       │         │
│  │      onInputChange={(field, value) => updateInput(...)}    │         │
│  │      onSubmit={() => goToNextStep()}                       │         │
│  │    />                                                      │         │
│  └────────────────────────────────────────────────────────────┘         │
└────┬────────────────────────────────────────────────────────────────────┘
     │
     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ STEP 7: User interacts with form                                       │
│  - User types in input field                                            │
│  - onChange event fires                                                 │
│  - Calls: onInputChange('email', 'user@example.com')                   │
└────┬────────────────────────────────────────────────────────────────────┘
     │
     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ STEP 8: updateInput handler in useWorkflowState                        │
│  ┌────────────────────────────────────────────────────────────┐         │
│  │ const updateInput = (field: string, value: unknown) => {   │         │
│  │   setInputs(prev => ({ ...prev, [field]: value }));        │         │
│  │   triggerAutoSave(); // Debounced save to backend          │         │
│  │ };                                                         │         │
│  └────────────────────────────────────────────────────────────┘         │
│  - Updates local state immediately (UI updates)                         │
│  - Triggers debounced auto-save (500ms delay)                          │
└────┬────────────────────────────────────────────────────────────────────┘
     │
     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ STEP 9: Auto-save triggers after 500ms                                 │
│  - POST to /api/client-state with action='update'                      │
│  - Backend writes to data/client_state/{clientId}.json                 │
└────┬────────────────────────────────────────────────────────────────────┘
     │
     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ STEP 10: User clicks "Submit" button                                   │
│  - Calls: onSubmit() → goToNextStep()                                  │
└────┬────────────────────────────────────────────────────────────────────┘
     │
     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ STEP 11: goToNextStep handler in useWorkflowState                      │
│  ┌────────────────────────────────────────────────────────────┐         │
│  │ 1. Validate: canTransitionFrom(currentStep, inputs)        │         │
│  │    - Check required fields are filled                      │         │
│  │    - Check field validations (email format, etc.)          │         │
│  │ 2. If invalid: setValidationErrors(...) → return           │         │
│  │ 3. If valid:                                               │         │
│  │    - Execute: executeTransition(currentStepId, inputs)     │         │
│  │    - Compute next step: nextStepId(currentStep, inputs)    │         │
│  │    - Update state: setCurrentStepId(nextId)                │         │
│  │    - Mark completed: setCompletedSteps([...prev, currentId])│         │
│  │    - Save to backend: POST /api/client-state               │         │
│  └────────────────────────────────────────────────────────────┘         │
└────┬────────────────────────────────────────────────────────────────────┘
     │
     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ STEP 12: Engine computes next step (lib/workflow/engine.ts)            │
│  ┌────────────────────────────────────────────────────────────┐         │
│  │ export function nextStepId(                                │         │
│  │   step: WorkflowStep,                                      │         │
│  │   inputs: Record<string, unknown>                          │         │
│  │ ): string {                                                │         │
│  │   // Check conditions in order                             │         │
│  │   for (const condition of step.next.conditions || []) {    │         │
│  │     if (evaluateExpression(condition.if, inputs)) {        │         │
│  │       return condition.then; // Return matching step       │         │
│  │     }                                                      │         │
│  │   }                                                        │         │
│  │   return step.next.default; // Fallback                   │         │
│  │ }                                                          │         │
│  └────────────────────────────────────────────────────────────┘         │
│                                                                         │
│  Example condition evaluation:                                          │
│  ┌────────────────────────────────────────────────────────────┐         │
│  │ // YAML: if: "input.revenue > 1000000"                     │         │
│  │ evaluateExpression("input.revenue > 1000000", inputs)      │         │
│  │  → Parse: { left: "input.revenue", op: ">", right: "1000000" }│      │
│  │  → Resolve: inputs.revenue = 2000000                       │         │
│  │  → Compare: 2000000 > 1000000 → true                       │         │
│  │  → Return corresponding 'then' step ID                     │         │
│  └────────────────────────────────────────────────────────────┘         │
└────┬────────────────────────────────────────────────────────────────────┘
     │
     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ STEP 13: Component re-renders with new step                            │
│  - React detects state change (currentStepId updated)                  │
│  - Component re-renders                                                 │
│  - Renders new step's component from registry                          │
│  - User sees next form/screen                                          │
└────┬────────────────────────────────────────────────────────────────────┘
     │
     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ STEP 14: Repeat steps 7-13 until workflow complete                     │
│  - Final step transitions to 'END'                                     │
│  - isComplete flag set to true                                         │
│  - Progress shows 100%                                                 │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Data Flow with Real Code Examples

### Example 1: Loading a Workflow

#### YAML Workflow Definition

**File:** `data/workflows/corporate_onboarding_v1.yaml`

```yaml
workflow_id: corporate_onboarding_v1
name: Corporate Client Onboarding
description: Workflow for onboarding corporate clients
client_type: corporate
jurisdiction: US

stages:
  - id: information_gathering
    name: Information Gathering
    steps:
      - contact_info
      - beneficial_ownership

  - id: document_collection
    name: Document Collection
    steps:
      - corporate_documents
      - identification_documents

steps:
  - id: contact_info
    stage: information_gathering
    task_ref: contact_info/corporate
    next:
      default: beneficial_ownership

  - id: beneficial_ownership
    stage: information_gathering
    task_ref: due_diligence/beneficial_ownership
    next:
      conditions:
        - if: "input.has_complex_structure == true"
          then: ownership_verification
        - if: "input.num_beneficial_owners > 4"
          then: enhanced_due_diligence
      default: corporate_documents

  - id: corporate_documents
    stage: document_collection
    task_ref: documents/corporate
    next:
      default: identification_documents

  - id: identification_documents
    stage: document_collection
    task_ref: documents/identification
    next:
      default: review_and_approval

  - id: review_and_approval
    stage: review
    task_ref: review/summary
    next:
      default: END
```

#### Task Definition (Referenced by Workflow)

**File:** `data/tasks/contact_info/corporate.yaml`

```yaml
task_id: contact_info_corporate
name: Corporate Contact Information
description: Collect contact information for corporate clients
component_id: form  # Maps to GenericForm in component registry

schema:
  fields:
    - id: company_name
      label: Company Name
      type: text
      required: true
      validation:
        min_length: 2
        max_length: 200

    - id: company_email
      label: Company Email
      type: email
      required: true
      validation:
        pattern: "^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$"

    - id: phone_number
      label: Phone Number
      type: text
      required: true
      validation:
        pattern: "^\\+?[1-9]\\d{1,14}$"

    - id: country
      label: Country of Incorporation
      type: select
      required: true
      options:
        - value: US
          label: United States
        - value: UK
          label: United Kingdom
        - value: CA
          label: Canada

    - id: industry
      label: Industry
      type: select
      required: false
      options:
        - value: technology
          label: Technology
        - value: finance
          label: Finance
        - value: healthcare
          label: Healthcare
        - value: manufacturing
          label: Manufacturing
```

#### Backend API Route

**File:** `app/api/workflows/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { loadWorkflows, pickApplicableWorkflow, compileWorkflow } from '@/lib/workflow/loader';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const clientType = searchParams.get('client_type') || 'individual';
    const jurisdiction = searchParams.get('jurisdiction') || 'US';

    // 1. Load all workflow definitions from data/workflows/*.yaml
    const workflows = await loadWorkflows();

    // 2. Pick applicable workflow based on client profile
    const workflow = pickApplicableWorkflow(workflows, {
      client_type: clientType,
      jurisdiction,
    });

    if (!workflow) {
      return NextResponse.json(
        { error: 'No applicable workflow found' },
        { status: 404 }
      );
    }

    // 3. Compile workflow to RuntimeMachine
    //    - Loads referenced tasks from data/tasks/
    //    - Resolves inheritance
    //    - Builds step index
    const machine = await compileWorkflow(workflow);

    // 4. Return compiled machine to client
    return NextResponse.json({ machine });
  } catch (error) {
    console.error('Error loading workflow:', error);
    return NextResponse.json(
      { error: 'Failed to load workflow' },
      { status: 500 }
    );
  }
}
```

#### Workflow Loader Logic

**File:** `lib/workflow/loader.ts` (simplified excerpt)

```typescript
import fs from 'fs/promises';
import path from 'path';
import yaml from 'yaml';
import { WorkflowDefinition, RuntimeMachine } from './schema';

/**
 * Load all workflow definitions from data/workflows/*.yaml
 */
export async function loadWorkflows(): Promise<WorkflowDefinition[]> {
  const workflowDir = path.join(process.cwd(), 'data', 'workflows');
  const files = await fs.readdir(workflowDir);

  const workflows: WorkflowDefinition[] = [];

  for (const file of files) {
    if (!file.endsWith('.yaml') && !file.endsWith('.yml')) continue;

    const filePath = path.join(workflowDir, file);
    const content = await fs.readFile(filePath, 'utf-8');
    const workflow = yaml.parse(content) as WorkflowDefinition;

    workflows.push(workflow);
  }

  return workflows;
}

/**
 * Pick applicable workflow based on client profile
 */
export function pickApplicableWorkflow(
  workflows: WorkflowDefinition[],
  profile: { client_type: string; jurisdiction: string }
): WorkflowDefinition | null {
  // 1. Try exact match (type + jurisdiction)
  const exactMatch = workflows.find(
    (w) =>
      w.client_type === profile.client_type &&
      w.jurisdiction === profile.jurisdiction
  );
  if (exactMatch) return exactMatch;

  // 2. Try type match (ignore jurisdiction)
  const typeMatch = workflows.find((w) => w.client_type === profile.client_type);
  if (typeMatch) return typeMatch;

  // 3. Fallback to first workflow
  return workflows[0] || null;
}

/**
 * Compile workflow to RuntimeMachine
 */
export async function compileWorkflow(
  workflow: WorkflowDefinition
): Promise<RuntimeMachine> {
  const tasksDir = path.join(process.cwd(), 'data', 'tasks');

  // Load and resolve all referenced tasks
  const stepsWithTasks = await Promise.all(
    workflow.steps.map(async (step) => {
      // Load task schema from data/tasks/{task_ref}.yaml
      const taskPath = path.join(tasksDir, `${step.task_ref}.yaml`);
      const taskContent = await fs.readFile(taskPath, 'utf-8');
      let task = yaml.parse(taskContent);

      // Resolve inheritance if 'extends' is present
      if (task.extends) {
        const basePath = path.join(tasksDir, `${task.extends}.yaml`);
        const baseContent = await fs.readFile(basePath, 'utf-8');
        const baseTask = yaml.parse(baseContent);

        // Merge base + child (child overrides base)
        task = {
          ...baseTask,
          ...task,
          schema: {
            ...baseTask.schema,
            ...task.schema,
            fields: [
              ...(baseTask.schema?.fields || []),
              ...(task.schema?.fields || []),
            ],
          },
        };
      }

      return {
        ...step,
        schema: task.schema,
        component_id: task.component_id,
      };
    })
  );

  // Build step index (Map) for O(1) lookup
  const stepIndex = new Map();
  stepsWithTasks.forEach((step) => {
    stepIndex.set(step.id, step);
  });

  return {
    workflow_id: workflow.workflow_id,
    name: workflow.name,
    description: workflow.description,
    stages: workflow.stages,
    steps: stepsWithTasks,
    stepIndex,
    initial_step: workflow.steps[0].id,
  };
}
```

#### Frontend Hook Consumption

**File:** `lib/hooks/useWorkflowState.tsx` (simplified excerpt)

```typescript
'use client';

import { useState, useEffect } from 'react';
import { RuntimeMachine, WorkflowStep } from '../workflow/schema';

export function useWorkflowState(
  clientId: string,
  profile: { client_type: string; jurisdiction: string }
) {
  const [machine, setMachine] = useState<RuntimeMachine | null>(null);
  const [currentStepId, setCurrentStepId] = useState<string>('');
  const [inputs, setInputs] = useState<Record<string, unknown>>({});
  const [isLoading, setIsLoading] = useState(true);

  // Load workflow on mount
  useEffect(() => {
    async function loadWorkflow() {
      try {
        // Fetch compiled workflow from backend
        const response = await fetch(
          `/api/workflows?client_type=${profile.client_type}&jurisdiction=${profile.jurisdiction}`
        );

        if (!response.ok) throw new Error('Failed to load workflow');

        const data = await response.json();
        setMachine(data.machine);
        setCurrentStepId(data.machine.initial_step);
      } catch (error) {
        console.error('Error loading workflow:', error);
      } finally {
        setIsLoading(false);
      }
    }

    loadWorkflow();
  }, [clientId, profile]);

  // Get current step from machine
  const currentStep = machine
    ? machine.stepIndex.get(currentStepId) || null
    : null;

  // Update input handler
  const updateInput = (field: string, value: unknown) => {
    setInputs((prev) => ({ ...prev, [field]: value }));
    // Trigger auto-save (debounced)
    triggerAutoSave();
  };

  // Transition to next step
  const goToNextStep = async () => {
    if (!currentStep || !machine) return;

    // Validate before transition
    const errors = validateStep(currentStep, inputs);
    if (errors.length > 0) {
      console.error('Validation errors:', errors);
      return;
    }

    // Compute next step ID based on conditions
    const nextId = computeNextStepId(currentStep, inputs);

    // Update state
    setCurrentStepId(nextId);

    // Save to backend
    await saveState();
  };

  return {
    machine,
    currentStep,
    currentStepId,
    inputs,
    updateInput,
    goToNextStep,
    isLoading,
  };
}
```

#### Frontend Component Usage

**File:** `app/onboarding/page.tsx` (simplified excerpt)

```typescript
'use client';

import { useState } from 'react';
import { useWorkflowState } from '@/lib/hooks/useWorkflowState';
import { getComponent } from '@/lib/ui/component-registry';

export default function OnboardingPage() {
  const [selectedClient] = useState({
    id: 'client-123',
    name: 'Acme Corp',
    type: 'corporate',
    jurisdiction: 'US',
  });

  // Initialize workflow state
  const {
    currentStep,
    inputs,
    updateInput,
    goToNextStep,
    isLoading,
  } = useWorkflowState(selectedClient.id, {
    client_type: selectedClient.type,
    jurisdiction: selectedClient.jurisdiction,
  });

  if (isLoading) {
    return <div>Loading workflow...</div>;
  }

  if (!currentStep) {
    return <div>No workflow step found</div>;
  }

  // Look up component from registry
  const StepComponent = getComponent(currentStep.component_id || 'form');

  if (!StepComponent) {
    return <div>Unknown component: {currentStep.component_id}</div>;
  }

  // Render component with standardized props
  return (
    <div className="p-6">
      <h1>{currentStep.name || 'Current Step'}</h1>

      <StepComponent
        schema={currentStep.schema}
        inputs={inputs}
        onInputChange={(field, value) => updateInput(field, value)}
        onSubmit={() => goToNextStep()}
      />
    </div>
  );
}
```

#### Generic Form Component (Registry Component)

**File:** `components/workflow/GenericForm.tsx` (simplified excerpt)

```typescript
'use client';

import { RegistryComponentProps } from '@/lib/ui/component-registry';

export default function GenericForm({
  schema,
  inputs,
  onInputChange,
  onSubmit,
}: RegistryComponentProps) {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit?.();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {schema?.fields?.map((field) => (
        <div key={field.id} className="flex flex-col">
          <label htmlFor={field.id} className="font-medium mb-1">
            {field.label}
            {field.required && <span className="text-red-500">*</span>}
          </label>

          {/* Text/Email Input */}
          {(field.type === 'text' || field.type === 'email') && (
            <input
              id={field.id}
              type={field.type}
              value={(inputs[field.id] as string) || ''}
              onChange={(e) => onInputChange?.(field.id, e.target.value)}
              required={field.required}
              className="border rounded px-3 py-2"
            />
          )}

          {/* Select Dropdown */}
          {field.type === 'select' && (
            <select
              id={field.id}
              value={(inputs[field.id] as string) || ''}
              onChange={(e) => onInputChange?.(field.id, e.target.value)}
              required={field.required}
              className="border rounded px-3 py-2"
            >
              <option value="">-- Select --</option>
              {field.options?.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          )}

          {/* Textarea */}
          {field.type === 'textarea' && (
            <textarea
              id={field.id}
              value={(inputs[field.id] as string) || ''}
              onChange={(e) => onInputChange?.(field.id, e.target.value)}
              required={field.required}
              rows={4}
              className="border rounded px-3 py-2"
            />
          )}
        </div>
      ))}

      <button
        type="submit"
        className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700"
      >
        Continue
      </button>
    </form>
  );
}
```

### Example 2: Conditional Workflow Branching

#### YAML with Conditions

```yaml
steps:
  - id: beneficial_ownership
    stage: information_gathering
    task_ref: due_diligence/beneficial_ownership
    next:
      conditions:
        - if: "input.has_complex_structure == true"
          then: ownership_verification
        - if: "input.num_beneficial_owners > 4"
          then: enhanced_due_diligence
      default: corporate_documents
```

#### Engine Expression Evaluation

**File:** `lib/workflow/engine.ts`

```typescript
/**
 * Evaluate conditional expression
 * Supports operators: >, >=, <, <=, ==, !=
 */
export function evaluateExpression(
  expression: string,
  inputs: Record<string, unknown>
): boolean {
  // Parse expression: "input.field > value"
  const regex = /^input\.(\w+)\s*(>|>=|<|<=|==|!=)\s*(.+)$/;
  const match = expression.match(regex);

  if (!match) {
    console.error('Invalid expression:', expression);
    return false;
  }

  const [, fieldPath, operator, rightValue] = match;

  // Resolve field value from inputs
  const leftValue = inputs[fieldPath];

  // Parse right value (number, boolean, string)
  let parsedRight: unknown = rightValue.trim();
  if (parsedRight === 'true') parsedRight = true;
  else if (parsedRight === 'false') parsedRight = false;
  else if (!isNaN(Number(parsedRight))) parsedRight = Number(parsedRight);
  else parsedRight = parsedRight.replace(/['"]/g, ''); // Remove quotes

  // Compare based on operator
  switch (operator) {
    case '>':
      return Number(leftValue) > Number(parsedRight);
    case '>=':
      return Number(leftValue) >= Number(parsedRight);
    case '<':
      return Number(leftValue) < Number(parsedRight);
    case '<=':
      return Number(leftValue) <= Number(parsedRight);
    case '==':
      return leftValue === parsedRight;
    case '!=':
      return leftValue !== parsedRight;
    default:
      return false;
  }
}

/**
 * Compute next step ID based on conditions
 */
export function nextStepId(
  step: WorkflowStep,
  inputs: Record<string, unknown>
): string {
  // Evaluate conditions in order
  for (const condition of step.next.conditions || []) {
    if (evaluateExpression(condition.if, inputs)) {
      return condition.then; // First matching condition wins
    }
  }

  // Fallback to default
  return step.next.default;
}
```

#### Example Execution

**Scenario:** User fills beneficial ownership form

**Inputs:**
```json
{
  "has_complex_structure": true,
  "num_beneficial_owners": 3
}
```

**Execution:**
```typescript
const step = machine.stepIndex.get('beneficial_ownership');
const nextId = nextStepId(step, inputs);

// Evaluation:
// 1. Check: input.has_complex_structure == true
//    → inputs.has_complex_structure = true
//    → true == true → TRUE ✓
//    → Return 'ownership_verification'

// Result: nextId = 'ownership_verification'
```

**Alternative Scenario:**
```json
{
  "has_complex_structure": false,
  "num_beneficial_owners": 5
}
```

**Execution:**
```typescript
// Evaluation:
// 1. Check: input.has_complex_structure == true
//    → inputs.has_complex_structure = false
//    → false == true → FALSE ✗
// 2. Check: input.num_beneficial_owners > 4
//    → inputs.num_beneficial_owners = 5
//    → 5 > 4 → TRUE ✓
//    → Return 'enhanced_due_diligence'

// Result: nextId = 'enhanced_due_diligence'
```

---

## Component Deep Dive

### Component Registry Pattern

#### Why Use a Component Registry?

**Problem:**
- YAML workflows need to reference UI components
- Can't import React components in YAML files
- Need decoupling between workflow definitions and UI code

**Solution:**
- Components register themselves with a string ID
- YAML references component by ID (`component_id: 'form'`)
- Runtime resolves ID to React component

#### Registry Implementation

**File:** `lib/ui/component-registry.ts`

```typescript
import React from 'react';

// Standardized props interface for all registry components
export interface RegistryComponentProps {
  schema?: {
    fields?: Array<{
      id: string;
      label: string;
      type: string;
      required?: boolean;
      validation?: Record<string, unknown>;
      options?: Array<{ value: string; label: string }>;
    }>;
  };
  inputs: Record<string, unknown>;
  onInputChange?: (field: string, value: unknown) => void;
  onSubmit?: () => void;
}

// Component registry (Map of ID → Component)
const componentRegistry = new Map<string, React.ComponentType<RegistryComponentProps>>();

/**
 * Register a component with an ID
 */
export function registerComponent(
  id: string,
  component: React.ComponentType<RegistryComponentProps>
): void {
  if (componentRegistry.has(id)) {
    console.warn(`Component '${id}' is already registered. Overwriting.`);
  }
  componentRegistry.set(id, component);
}

/**
 * Get component by ID
 */
export function getComponent(
  id: string
): React.ComponentType<RegistryComponentProps> | undefined {
  return componentRegistry.get(id);
}

/**
 * List all registered component IDs
 */
export function listComponents(): string[] {
  return Array.from(componentRegistry.keys());
}
```

#### Registry Initialization

**File:** `lib/ui/registry-init.ts`

```typescript
// Import all registry components
import GenericForm from '@/components/workflow/GenericForm';
import DocumentUpload from '@/components/workflow/DocumentUpload';
import ReviewSummary from '@/components/workflow/ReviewSummary';
import DataTable from '@/components/workflow/DataTable';

// Import registry functions
import { registerComponent } from './component-registry';

/**
 * Initialize component registry with all available components
 * This file is imported once in app/layout.tsx to auto-initialize
 */
export function initializeRegistry() {
  // Register workflow components
  registerComponent('form', GenericForm);
  registerComponent('document-upload', DocumentUpload);
  registerComponent('review-summary', ReviewSummary);
  registerComponent('data-table', DataTable);

  console.log('Component registry initialized');
}

// Auto-initialize on import (side effect)
initializeRegistry();
```

#### Root Layout Auto-Initialization

**File:** `app/layout.tsx`

```typescript
import { CopilotKit } from '@copilotkit/react-core';
import '@/lib/ui/registry-init'; // Auto-initializes registry

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <CopilotKit runtimeUrl="/api/copilotkit">
          {children}
        </CopilotKit>
      </body>
    </html>
  );
}
```

**Key Points:**
- Importing `registry-init.ts` runs `initializeRegistry()`
- Registry populated before any page renders
- Components available for all workflow steps

### Three-Pane Layout System

#### Layout Architecture

**File:** `components/layout/three-pane-layout.tsx`

```typescript
'use client';

import LeftPane from './left-pane';
import MiddlePane from './middle-pane';
import RightPane from './right-pane';

export default function ThreePaneLayout() {
  return (
    <div className="flex flex-row h-screen overflow-hidden bg-gray-50">
      {/* Left Pane - Client List (316px fixed width) */}
      <LeftPane />

      {/* Middle Pane - Client Details (flexible width) */}
      <MiddlePane />

      {/* Right Pane - Chat & Forms (476px fixed width) */}
      <RightPane />
    </div>
  );
}
```

**CSS Breakdown:**
- `flex flex-row` → Horizontal layout (side-by-side panes)
- `h-screen` → Full viewport height (100vh)
- `overflow-hidden` → Hide scrollbars on container (panes scroll internally)

#### Left Pane - Client List

**File:** `components/layout/left-pane.tsx` (simplified)

```typescript
'use client';

import { useState } from 'react';
import ClientList from '../onboarding/client-list';

export default function LeftPane() {
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <div className="w-[316px] flex-shrink-0 border-r border-gray-200 bg-white">
      <div className="h-full flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold">Clients</h2>

          {/* Search Input */}
          <input
            type="text"
            placeholder="Search clients..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="mt-2 w-full px-3 py-2 border rounded"
          />
        </div>

        {/* Scrollable Client List */}
        <div className="flex-1 overflow-y-auto">
          <ClientList searchQuery={searchQuery} />
        </div>
      </div>
    </div>
  );
}
```

**CSS Breakdown:**
- `w-[316px]` → Fixed width (316 pixels)
- `flex-shrink-0` → Never shrink below 316px
- `border-r` → Right border to separate from middle pane
- `overflow-y-auto` → Vertical scroll when content overflows

#### Client Details

**File:** `components/layout/middle-pane.tsx` (simplified)

```typescript
'use client';

import ProfileSection from '../onboarding/profile-section';
import RequiredFieldsSection from '../onboarding/required-fields-section';
import TimelineSection from '../onboarding/timeline-section';

export default function MiddlePane() {
  return (
    <div className="flex-1 overflow-y-auto bg-white">
      <div className="p-6 space-y-6">
        {/* Profile Section */}
        <ProfileSection />

        {/* Required Fields Checklist */}
        <RequiredFieldsSection />

        {/* Activity Timeline */}
        <TimelineSection />
      </div>
    </div>
  );
}
```

**CSS Breakdown:**
- `flex-1` → Fill remaining space (grows/shrinks as needed)
- `overflow-y-auto` → Vertical scroll when content overflows
- `space-y-6` → Vertical spacing between sections (1.5rem = 24px)

#### Right Pane - Chat & Forms

**File:** `components/layout/right-pane.tsx` (simplified)

```typescript
'use client';

import { useState } from 'react';
import ChatSection from '../chat/chat-section';
import FormOverlay from '../onboarding/form-overlay';

export default function RightPane() {
  const [isFormOpen, setIsFormOpen] = useState(false);

  return (
    <div className="w-[476px] flex-shrink-0 border-l border-gray-200 bg-white relative">
      {/* Chat Interface */}
      <ChatSection onOpenForm={() => setIsFormOpen(true)} />

      {/* Form Overlay (slides in from right) */}
      {isFormOpen && (
        <FormOverlay onClose={() => setIsFormOpen(false)} />
      )}
    </div>
  );
}
```

**CSS Breakdown:**
- `w-[476px]` → Fixed width (476 pixels)
- `flex-shrink-0` → Never shrink below 476px
- `relative` → Positioning context for absolute overlay
- `border-l` → Left border to separate from middle pane

#### Form Overlay Pattern

**File:** `components/onboarding/form-overlay.tsx` (simplified)

```typescript
'use client';

interface FormOverlayProps {
  onClose: () => void;
}

export default function FormOverlay({ onClose }: FormOverlayProps) {
  return (
    <>
      {/* Backdrop (darkens background) */}
      <div
        className="absolute inset-0 bg-black/30 z-10"
        onClick={onClose} // Close on backdrop click
      />

      {/* Overlay Panel (slides in from right) */}
      <div className="absolute inset-0 bg-white z-20 overflow-y-auto shadow-xl animate-slide-in-right">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex justify-between items-center">
          <h2 className="text-lg font-semibold">Contact Information</h2>

          {/* Close Button */}
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            ✕
          </button>
        </div>

        {/* Form Content */}
        <div className="p-6">
          {/* Dynamic form rendered here */}
        </div>
      </div>
    </>
  );
}
```

**CSS Breakdown:**
- `absolute inset-0` → Cover entire parent (right pane)
- `bg-black/30` → Semi-transparent black (30% opacity)
- `z-10` → Layer backdrop above chat
- `z-20` → Layer form above backdrop
- `animate-slide-in-right` → CSS animation (slide in from right)

**Custom Tailwind Animation** (`tailwind.config.ts`):
```typescript
export default {
  theme: {
    extend: {
      animation: {
        'slide-in-right': 'slideInRight 0.3s ease-out',
      },
      keyframes: {
        slideInRight: {
          '0%': { transform: 'translateX(100%)' },
          '100%': { transform: 'translateX(0)' },
        },
      },
    },
  },
};
```

---

## API Endpoints Explained

### 1. `/api/workflows` - Load Workflow Machine

**Purpose:** Fetch compiled workflow based on client profile

**Method:** GET

**Query Parameters:**
- `client_type` (string) - Client type (e.g., 'corporate', 'individual')
- `jurisdiction` (string) - Jurisdiction code (e.g., 'US', 'UK')

**Response:**
```json
{
  "machine": {
    "workflow_id": "corporate_onboarding_v1",
    "name": "Corporate Client Onboarding",
    "description": "Workflow for onboarding corporate clients",
    "stages": [...],
    "steps": [...],
    "stepIndex": {...},
    "initial_step": "contact_info"
  }
}
```

**Example Request:**
```typescript
const response = await fetch(
  '/api/workflows?client_type=corporate&jurisdiction=US'
);
const data = await response.json();
console.log(data.machine);
```

### 2. `/api/client-state` - Persist Client State

**Purpose:** Load, save, update, or delete client workflow state

**Methods:** GET, POST, DELETE

#### GET - Load Client State

**Query Parameters:**
- `clientId` (string, optional) - Load specific client state
- If omitted, returns list of all client states

**Response (single client):**
```json
{
  "clientId": "client-123",
  "workflowId": "corporate_onboarding_v1",
  "currentStepId": "beneficial_ownership",
  "inputs": {
    "company_name": "Acme Corp",
    "company_email": "contact@acme.com",
    "phone_number": "+1234567890"
  },
  "completedSteps": ["contact_info"],
  "createdAt": "2025-01-15T10:30:00Z",
  "updatedAt": "2025-01-15T11:45:00Z"
}
```

**Example Request:**
```typescript
const response = await fetch('/api/client-state?clientId=client-123');
const state = await response.json();
console.log(state.currentStepId); // 'beneficial_ownership'
```

#### POST - Save/Update Client State

**Body:**
```json
{
  "action": "save", // or 'update', 'initialize'
  "clientId": "client-123",
  "state": {
    "workflowId": "corporate_onboarding_v1",
    "currentStepId": "beneficial_ownership",
    "inputs": {...},
    "completedSteps": [...]
  }
}
```

**Response:**
```json
{
  "success": true,
  "clientId": "client-123"
}
```

**Example Request:**
```typescript
await fetch('/api/client-state', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    action: 'update',
    clientId: 'client-123',
    state: {
      currentStepId: 'corporate_documents',
      inputs: updatedInputs,
      completedSteps: ['contact_info', 'beneficial_ownership'],
    },
  }),
});
```

#### DELETE - Remove Client State

**Query Parameters:**
- `clientId` (string) - Client to remove

**Response:**
```json
{
  "success": true
}
```

**Example Request:**
```typescript
await fetch('/api/client-state?clientId=client-123', {
  method: 'DELETE',
});
```

### 3. `/api/copilotkit` - AI Runtime

**Purpose:** Self-hosted CopilotKit AI runtime for chat

**Method:** POST

**Configuration:**
- Runtime: Next.js Route Handler
- AI Model: GPT-4o (via OpenAI API)
- Streaming: Yes (SSE - Server-Sent Events)
- Max Duration: 600s (Vercel limit)

**Request Body:**
- CopilotKit internal format (handled by SDK)

**Response:**
- Streaming AI responses

**Example (handled by CopilotKit SDK):**
```typescript
import { CopilotKit } from '@copilotkit/react-core';

<CopilotKit runtimeUrl="/api/copilotkit">
  {/* Your app */}
</CopilotKit>
```

**Backend Implementation:**
```typescript
// app/api/copilotkit/route.ts
import { CopilotRuntime, OpenAIAdapter } from '@copilotkit/runtime';
import { NextRequest } from 'next/server';

export const runtime = 'edge'; // Edge runtime for streaming
export const maxDuration = 600; // 10 minutes

export async function POST(req: NextRequest): Promise<Response> {
  const copilotKit = new CopilotRuntime();

  return copilotKit.response(req, new OpenAIAdapter({
    model: process.env.OPENAI_MODEL || 'gpt-4o',
  }));
}
```

---

## Workflow Engine Mechanics

### Engine Architecture

```
┌───────────────────────────────────────────────────────────────┐
│                    WORKFLOW ENGINE                            │
├───────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌─────────────┐    ┌──────────────┐    ┌─────────────────┐  │
│  │  loader.ts  │───▶│  engine.ts   │───▶│ state-store.ts  │  │
│  │             │    │              │    │                 │  │
│  │ - Load YAML │    │ - Step       │    │ - Load state    │  │
│  │ - Compile   │    │   lookup     │    │ - Save state    │  │
│  │ - Resolve   │    │ - Validate   │    │ - Update state  │  │
│  │   tasks     │    │ - Transition │    │                 │  │
│  │ - Build     │    │ - Evaluate   │    │                 │  │
│  │   index     │    │   conditions │    │                 │  │
│  └─────────────┘    └──────────────┘    └─────────────────┘  │
│                                                               │
└───────────────────────────────────────────────────────────────┘
```

### Core Engine Functions

#### 1. Step Lookup

**File:** `lib/workflow/engine.ts`

```typescript
import { RuntimeMachine, WorkflowStep } from './schema';

/**
 * Get step by ID (O(1) lookup via Map index)
 */
export function getStepById(
  machine: RuntimeMachine,
  stepId: string
): WorkflowStep | null {
  return machine.stepIndex.get(stepId) || null;
}
```

**Why Use a Map?**
- Array lookup: O(n) - must iterate to find
- Map lookup: O(1) - instant hash lookup
- Performance critical for large workflows

#### 2. Validation

**File:** `lib/workflow/engine.ts`

```typescript
/**
 * Check if all required fields are filled
 */
export function missingRequiredFields(
  step: WorkflowStep,
  inputs: Record<string, unknown>
): string[] {
  const missing: string[] = [];

  for (const field of step.schema?.fields || []) {
    if (field.required) {
      const value = inputs[field.id];

      // Check if value is empty
      if (value === undefined || value === null || value === '') {
        missing.push(field.id);
      }
    }
  }

  return missing;
}

/**
 * Check if can transition from current step
 */
export function canTransitionFrom(
  step: WorkflowStep,
  inputs: Record<string, unknown>
): { canTransition: boolean; errors: string[] } {
  const errors: string[] = [];

  // Check required fields
  const missing = missingRequiredFields(step, inputs);
  if (missing.length > 0) {
    errors.push(`Missing required fields: ${missing.join(', ')}`);
  }

  // Check field validations (email format, min/max length, patterns)
  for (const field of step.schema?.fields || []) {
    const value = inputs[field.id];
    if (!value) continue; // Skip if empty (already caught by required check)

    // Email validation
    if (field.type === 'email' && typeof value === 'string') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(value)) {
        errors.push(`Invalid email format: ${field.label}`);
      }
    }

    // Pattern validation
    if (field.validation?.pattern && typeof value === 'string') {
      const regex = new RegExp(field.validation.pattern);
      if (!regex.test(value)) {
        errors.push(`Invalid format: ${field.label}`);
      }
    }

    // Min/max length validation
    if (typeof value === 'string') {
      if (field.validation?.min_length && value.length < field.validation.min_length) {
        errors.push(`${field.label} must be at least ${field.validation.min_length} characters`);
      }
      if (field.validation?.max_length && value.length > field.validation.max_length) {
        errors.push(`${field.label} must be at most ${field.validation.max_length} characters`);
      }
    }
  }

  return {
    canTransition: errors.length === 0,
    errors,
  };
}
```

#### 3. Transition Execution

**File:** `lib/workflow/engine.ts`

```typescript
/**
 * Execute transition from current step to next step
 */
export function executeTransition(
  machine: RuntimeMachine,
  currentStepId: string,
  inputs: Record<string, unknown>
): {
  success: boolean;
  nextStepId: string | null;
  errors: string[];
} {
  // Get current step
  const currentStep = getStepById(machine, currentStepId);
  if (!currentStep) {
    return {
      success: false,
      nextStepId: null,
      errors: ['Current step not found'],
    };
  }

  // Validate before transition
  const validation = canTransitionFrom(currentStep, inputs);
  if (!validation.canTransition) {
    return {
      success: false,
      nextStepId: null,
      errors: validation.errors,
    };
  }

  // Compute next step
  const nextId = nextStepId(currentStep, inputs);

  // Check if next step exists (except 'END')
  if (nextId !== 'END') {
    const nextStep = getStepById(machine, nextId);
    if (!nextStep) {
      return {
        success: false,
        nextStepId: null,
        errors: [`Next step '${nextId}' not found`],
      };
    }
  }

  return {
    success: true,
    nextStepId: nextId,
    errors: [],
  };
}
```

#### 4. Progress Tracking

**File:** `lib/workflow/engine.ts`

```typescript
/**
 * Calculate workflow completion percentage
 */
export function getWorkflowProgress(
  machine: RuntimeMachine,
  completedSteps: string[]
): number {
  const totalSteps = machine.steps.length;
  const completed = completedSteps.length;

  return totalSteps > 0 ? Math.round((completed / totalSteps) * 100) : 0;
}

/**
 * Calculate stage completion percentage
 */
export function getStageProgress(
  machine: RuntimeMachine,
  stageId: string,
  completedSteps: string[]
): number {
  // Get all steps in this stage
  const stageSteps = machine.steps.filter((step) => step.stage === stageId);

  if (stageSteps.length === 0) return 0;

  // Count completed steps in this stage
  const completed = stageSteps.filter((step) =>
    completedSteps.includes(step.id)
  ).length;

  return Math.round((completed / stageSteps.length) * 100);
}
```

### State Persistence

**File:** `lib/workflow/state-store.ts`

```typescript
import fs from 'fs/promises';
import path from 'path';

const STATE_DIR = path.join(process.cwd(), 'data', 'client_state');

/**
 * Load client state from file
 */
export async function loadClientState(clientId: string): Promise<ClientState | null> {
  try {
    const filePath = path.join(STATE_DIR, `${clientId}.json`);
    const content = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    // File doesn't exist or parse error
    return null;
  }
}

/**
 * Save client state to file
 */
export async function saveClientState(
  clientId: string,
  state: ClientState
): Promise<void> {
  // Ensure directory exists
  await fs.mkdir(STATE_DIR, { recursive: true });

  const filePath = path.join(STATE_DIR, `${clientId}.json`);

  // Atomic write: write to temp file, then rename
  const tempPath = `${filePath}.tmp`;
  await fs.writeFile(tempPath, JSON.stringify(state, null, 2), 'utf-8');
  await fs.rename(tempPath, filePath);
}

/**
 * Update client state (partial update)
 */
export async function updateClientState(
  clientId: string,
  updates: Partial<ClientState>
): Promise<void> {
  const existing = await loadClientState(clientId);

  if (!existing) {
    throw new Error(`Client state not found: ${clientId}`);
  }

  const updated: ClientState = {
    ...existing,
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  await saveClientState(clientId, updated);
}

/**
 * Delete client state
 */
export async function deleteClientState(clientId: string): Promise<void> {
  const filePath = path.join(STATE_DIR, `${clientId}.json`);
  await fs.unlink(filePath);
}
```

**State Schema:**
```typescript
interface ClientState {
  clientId: string;
  workflowId: string;
  currentStepId: string;
  inputs: Record<string, unknown>;
  completedSteps: string[];
  createdAt: string;
  updatedAt: string;
}
```

**Storage Location:**
```
data/client_state/
├── client-123.json
├── client-456.json
└── client-789.json
```

**Example State File** (`client-123.json`):
```json
{
  "clientId": "client-123",
  "workflowId": "corporate_onboarding_v1",
  "currentStepId": "beneficial_ownership",
  "inputs": {
    "company_name": "Acme Corp",
    "company_email": "contact@acme.com",
    "phone_number": "+1234567890",
    "country": "US",
    "industry": "technology"
  },
  "completedSteps": ["contact_info"],
  "createdAt": "2025-01-15T10:30:00.000Z",
  "updatedAt": "2025-01-15T11:45:00.000Z"
}
```

---

## How to Navigate and Extend

### Quick Start Guide

#### 1. Run the Development Server

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Open browser
# Navigate to http://localhost:3000
```

#### 2. Key Entry Points

- **Root Page:** `app/page.tsx` (redirects to `/onboarding`)
- **Onboarding Page:** `app/onboarding/page.tsx`

#### 3. Key Files to Understand

**Architecture:**
1. `lib/workflow/schema.ts` - Type definitions
2. `lib/workflow/loader.ts` - YAML loading
3. `lib/workflow/engine.ts` - Execution logic
4. `lib/hooks/useWorkflowState.tsx` - State management hook

**UI:**
1. `components/layout/three-pane-layout.tsx` - Main layout
2. `components/workflow/GenericForm.tsx` - Dynamic form renderer
3. `lib/ui/component-registry.ts` - Component registry

**Data:**
1. `data/workflows/corporate_onboarding_v1.yaml` - Example workflow
2. `data/tasks/contact_info/corporate.yaml` - Example task

### How to Add a New Workflow

**Step 1:** Create workflow YAML

```bash
# Create file: data/workflows/my_workflow.yaml
```

```yaml
workflow_id: my_workflow_v1
name: My Custom Workflow
description: Description of workflow
client_type: custom
jurisdiction: US

stages:
  - id: stage1
    name: Stage 1
    steps:
      - step1
      - step2

steps:
  - id: step1
    stage: stage1
    task_ref: my_tasks/step1
    next:
      default: step2

  - id: step2
    stage: stage1
    task_ref: my_tasks/step2
    next:
      default: END
```

**Step 2:** Create task definitions

```bash
# Create directory and file
mkdir -p data/tasks/my_tasks
touch data/tasks/my_tasks/step1.yaml
```

```yaml
task_id: my_task_step1
name: Step 1
description: First step of workflow
component_id: form

schema:
  fields:
    - id: field1
      label: Field 1
      type: text
      required: true
```

**Step 3:** Test workflow

```typescript
// In app/onboarding/page.tsx or test page
const profile = {
  client_type: 'custom',
  jurisdiction: 'US',
};

const { currentStep, inputs, goToNextStep } = useWorkflowState(
  'test-client-id',
  profile
);
```

### How to Add a New Component to Registry

**Step 1:** Create component

```bash
# Create file: components/workflow/MyCustomComponent.tsx
```

```typescript
'use client';

import { RegistryComponentProps } from '@/lib/ui/component-registry';

export default function MyCustomComponent({
  schema,
  inputs,
  onInputChange,
  onSubmit,
}: RegistryComponentProps) {
  return (
    <div>
      <h2>My Custom Component</h2>
      {/* Your custom UI */}
      <button onClick={onSubmit}>Continue</button>
    </div>
  );
}
```

**Step 2:** Register component

```typescript
// In lib/ui/registry-init.ts

import MyCustomComponent from '@/components/workflow/MyCustomComponent';

export function initializeRegistry() {
  // ... existing registrations ...

  registerComponent('my-custom-component', MyCustomComponent);
}
```

**Step 3:** Reference in YAML

```yaml
# In task definition
component_id: my-custom-component
```

### How to Add a New API Endpoint

**Step 1:** Create route handler

```bash
# Create file: app/api/my-endpoint/route.ts
```

```typescript
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const param = searchParams.get('param');

  // Your logic here

  return NextResponse.json({ result: 'success' });
}

export async function POST(request: NextRequest) {
  const body = await request.json();

  // Your logic here

  return NextResponse.json({ result: 'success' });
}
```

**Step 2:** Call from frontend

```typescript
// In component or hook
const response = await fetch('/api/my-endpoint?param=value');
const data = await response.json();
```

### How to Debug

#### 1. Check Browser Console

```typescript
// Add console logs in components
console.log('Current step:', currentStep);
console.log('Inputs:', inputs);
```

#### 2. Check Network Tab

- Open DevTools → Network tab
- Look for API calls (`/api/workflows`, `/api/client-state`)
- Check request/response payloads

#### 3. Check Server Logs

```bash
# Terminal running `npm run dev`
# Logs appear here for API routes
```

#### 4. Use React DevTools

- Install React DevTools browser extension
- Inspect component state and props
- Check hook values

### Common Issues and Solutions

**Issue:** "Component not found in registry"

**Solution:**
- Check `lib/ui/registry-init.ts` - is component registered?
- Check `app/layout.tsx` - is `registry-init` imported?
- Check component ID spelling in YAML matches registry

---

**Issue:** "Workflow not loading"

**Solution:**
- Check YAML syntax (use online YAML validator)
- Check file location: `data/workflows/*.yaml`
- Check `client_type` and `jurisdiction` match

---

**Issue:** "Step transition not working"

**Solution:**
- Check required fields are filled
- Check validation rules (email format, etc.)
- Check `next.conditions` logic in YAML
- Add console logs in `lib/workflow/engine.ts`

---

**Issue:** "State not persisting"

**Solution:**
- Check `data/client_state/` directory exists
- Check file permissions (write access)
- Check API calls to `/api/client-state` in Network tab

---

## Summary

This project demonstrates a **YAML-driven workflow system** with:

✅ **Separation of Concerns** - UI, logic, and data are cleanly separated

✅ **Component Registry** - Decouples workflows from UI components

✅ **YAML Configuration** - Business users can edit workflows without code changes

✅ **AI Integration** - CopilotKit provides conversational workflow guidance

✅ **Type Safety** - TypeScript ensures correctness across the codebase

✅ **Testable Architecture** - Pure functions and clear interfaces

### Key Takeaways for React/Next.js Beginners

1. **React Components** are reusable UI pieces (like custom HTML tags)
2. **Props** pass data from parent to child (one-way flow)
3. **Hooks** add state and effects to function components
4. **Next.js** handles routing via file structure (`app/*/page.tsx`)
5. **API Routes** are server-side endpoints (`app/api/*/route.ts`)
6. **TypeScript** adds type safety and catches errors early
7. **Tailwind CSS** provides utility classes for styling

### Next Steps

1. **Explore the code** - Start with `app/onboarding/page.tsx`
2. **Follow a workflow** - Trace from UI → API → Engine → State
3. **Make small changes** - Add a field, modify a step, create a workflow
4. **Read the docs** - [React](https://react.dev), [Next.js](https://nextjs.org), [CopilotKit](https://copilotkit.ai)
5. **Experiment** - Break things, fix them, learn by doing

---

**Happy Coding!** 🚀

For questions or issues, refer to:
- Project Style Guide: `CODE_STYLE_GUIDE.md`
- Project Rules: `CLAUDE.md`
- Task Documentation: `task_composable_onboarding/`
