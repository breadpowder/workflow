# Code Style Guide - React Applications with AI Capabilities

**Version:** 1.0.0
**Based on:** CopilotKit state-machine example
**Target:** React + Next.js + CopilotKit applications

---

## Table of Contents

1. [Project Structure](#project-structure)
2. [Naming Conventions](#naming-conventions)
3. [TypeScript Patterns](#typescript-patterns)
4. [React Patterns](#react-patterns)
5. [CopilotKit Integration Patterns](#copilotkit-integration-patterns)
6. [State Management](#state-management)
7. [Component Organization](#component-organization)
8. [File Structure & Imports](#file-structure--imports)
9. [Code Documentation](#code-documentation)
10. [Testing Organization](#testing-organization)

---

## 1. Project Structure Example

### Standard Directory Layout

```
project-root/
├── app/                          # Next.js App Router (if using App Router)
│   ├── api/                      # API routes
│   │   ├── copilotkit/          # Self-hosted CopilotKit runtime
│   │   │   └── route.ts
│   │   └── workflows/            # Domain-specific APIs
│   │       └── route.ts
│   ├── layout.tsx                # Root layout with providers
│   ├── page.tsx                  # Main page component
│   └── globals.css               # Global styles
│
├── lib/                          # Core business logic (no UI)
│   ├── workflow/                 # Workflow engine (domain logic)
│   │   ├── schema.ts            # TypeScript types/interfaces
│   │   ├── engine.ts            # Business logic functions
│   │   ├── loader.ts            # Data loading utilities
│   │   └── use-workflow-state.ts # React hooks for workflow
│   │
│   ├── stages/                   # Stage-specific logic (for state machines)
│   │   ├── use-stage-*.tsx      # One hook per stage
│   │   ├── use-global-state.tsx # Global state management
│   │   └── index.ts             # Barrel export
│   │
│   ├── types/                    # Shared TypeScript types
│   │   ├── index.ts             # Main types barrel export
│   │   ├── workflow.ts          # Workflow-related types
│   │   └── client.ts            # Client/domain types
│   │
│   └── utils/                    # Utility functions
│       ├── cn.ts                # Class name utilities (clsx + twMerge)
│       └── helpers.ts           # Generic helper functions
│
├── components/                   # React components (UI only)
│   ├── ui/                      # Reusable UI components
│   │   ├── component-registry.ts # Component registry (if using)
│   │   └── components/          # Actual UI components
│   │       ├── contact-form.tsx
│   │       ├── document-upload.tsx
│   │       └── review-summary.tsx
│   │
│   ├── chat/                     # Chat-specific components
│   │   ├── main-chat.tsx        # Main chat orchestrator
│   │   ├── user-message.tsx     # Message display components
│   │   └── assistant-message.tsx
│   │
│   └── visualizers/              # Visualization components
│       └── state-visualizer.tsx
│
├── data/                         # Static data / configuration
│   └── workflows/               # YAML workflow definitions
│       ├── corporate_v1.yaml
│       └── individual_v1.yaml
│
├── tests/                        # Test files (mirrors src structure)
│   ├── workflow/
│   │   ├── engine.test.ts
│   │   └── loader.test.ts
│   ├── ui/
│   │   └── component-registry.test.ts
│   └── integration/
│       └── workflow-e2e.test.ts
│
├── public/                       # Static assets
│   ├── images/
│   └── assets/
│
├── .env.local                    # Environment variables (gitignored)
├── .env.example                  # Example environment config
├── package.json
├── tsconfig.json
├── tailwind.config.ts
├── postcss.config.mjs
└── next.config.js
```

### Key Principles

✅ **Separation of Concerns:**
- `lib/` = Business logic, no UI imports
- `components/` = UI components, no business logic
- `app/` = Routing and page-level orchestration

✅ **Feature-Based Organization:**
- Group related code by feature/domain (e.g., `workflow/`, `stages/`)
- Each feature is self-contained with types, logic, and hooks

✅ **Flat Directory Structure:**
- Avoid excessive nesting (max 3 levels in `lib/`)
- Use barrel exports (`index.ts`) to simplify imports

---

## 2. Naming Conventions

### Files & Directories

| Type | Convention | Example |
|------|-----------|---------|
| **React Components** | PascalCase + `.tsx` | `ContactForm.tsx`, `UserMessage.tsx` |
| **React Hooks** | `use-` prefix + kebab-case + `.ts/.tsx` | `use-workflow-state.ts`, `use-stage-build-car.tsx` |
| **Utility Functions** | kebab-case + `.ts` | `cn.ts`, `helpers.ts`, `validation.ts` |
| **TypeScript Types** | kebab-case + `.ts` | `schema.ts`, `types.ts`, `client.ts` |
| **Business Logic** | kebab-case + `.ts` | `engine.ts`, `loader.ts`, `parser.ts` |
| **API Routes** | kebab-case + `route.ts` | `route.ts` (inside feature folder) |
| **Test Files** | Same as source + `.test.ts` | `engine.test.ts`, `ContactForm.test.tsx` |
| **Directories** | kebab-case | `workflow/`, `contact-form/`, `api-routes/` |

### Code Identifiers

| Type | Convention | Example |
|------|-----------|---------|
| **React Components** | PascalCase | `ContactForm`, `AssistantMessage` |
| **React Hooks** | `use` + PascalCase | `useWorkflowState`, `useStageBuildCar` |
| **Functions** | camelCase | `loadWorkflow`, `compileRuntimeMachine` |
| **Variables** | camelCase | `currentStep`, `collectedInputs` |
| **Constants** | UPPER_SNAKE_CASE | `MAX_RETRIES`, `DEFAULT_TIMEOUT` |
| **Types/Interfaces** | PascalCase | `WorkflowStep`, `RuntimeMachine` |
| **Enum Values** | PascalCase | `enum Status { Pending, Complete }` |
| **Stage Identifiers** | camelCase string | `"buildCar"`, `"getContactInfo"` |

### Specific Patterns

**Stage Hooks:**
```typescript
// Pattern: use-stage-{stageName}.tsx
use-stage-get-contact-info.tsx
use-stage-build-car.tsx
use-stage-confirm-order.tsx
```

**CopilotKit Actions:**
```typescript
// Action names: camelCase, descriptive
useCopilotAction({
  name: "updateCarConfiguration",  // ✅ Good
  name: "update_car",              // ❌ Bad (snake_case)
  name: "car",                     // ❌ Bad (not descriptive)
})
```

**Component IDs (Registry):**
```typescript
// Pattern: kebab-case for component IDs
'contact-form'          // ✅ Good
'document-upload'       // ✅ Good
'contactForm'           // ❌ Bad (camelCase)
'CONTACT_FORM'          // ❌ Bad (UPPER_CASE)
```

---

## 3. TypeScript Patterns

### Type Organization

**Principle:** Co-locate types with their usage, export shared types from `lib/types/`

```typescript
// lib/workflow/schema.ts - Types for workflow domain
export interface WorkflowStep {
  id: string;
  task_ref: string;
  component_id?: string;
  required_fields?: string[];
  next: {
    conditions?: WorkflowStepNextCondition[];
    default: string;
  };
}

export interface WorkflowDefinition {
  id: string;
  name: string;
  version: number;
  applies_to?: ClientProfile;
  steps: WorkflowStep[];
}

// Export discriminated unions for state
export type Stage =
  | "getContactInfo"
  | "buildCar"
  | "sellFinancing"
  | "getFinancingInfo"
  | "getPaymentInfo"
  | "confirmOrder";
```

### Type Naming Patterns

```typescript
// ✅ Good: Descriptive interface names
export interface WorkflowStepNextCondition { }
export interface RuntimeMachine { }
export interface ClientProfile { }

// ❌ Bad: Generic or unclear names
export interface Condition { }  // Too generic
export interface Data { }       // Too vague
export interface WF { }          // Abbreviated
```

### Type vs Interface

**Use `interface` when:**
- Defining object shapes
- Creating public APIs
- Extending/merging is expected

```typescript
export interface WorkflowStep {
  id: string;
  task_ref: string;
}

// Can be extended
export interface ExtendedWorkflowStep extends WorkflowStep {
  metadata?: Record<string, any>;
}
```

**Use `type` when:**
- Creating unions or intersections
- Defining primitive aliases
- Using mapped/conditional types

```typescript
export type Stage = "buildCar" | "getContactInfo" | "sellFinancing";
export type Inputs = Record<string, unknown>;
export type StepId = string;
```

### Function Type Signatures

```typescript
// ✅ Good: Explicit parameter and return types
export function compileRuntimeMachine(
  def: WorkflowDefinition
): RuntimeMachine {
  // implementation
}

export function nextStepId(
  step: WorkflowStep,
  inputs: Inputs
): string {
  // implementation
}

// ✅ Good: Type parameters for generic functions
export function getComponent<T extends RegistryComponentProps>(
  componentId: string
): React.ComponentType<T> | null {
  // implementation
}
```

### React Component Props

```typescript
// ✅ Good: Explicit props interface
interface ContactFormProps {
  initialData?: {
    legal_name?: string;
    contact_email?: string;
    contact_phone?: string;
  };
  status: RenderFunctionStatus;
  onSubmit: (data: ContactFormData) => void;
}

export function ContactForm({
  initialData,
  status,
  onSubmit
}: ContactFormProps) {
  // implementation
}

// ❌ Bad: Inline props without interface
export function ContactForm({ data, onSubmit }: {
  data: any,
  onSubmit: Function
}) {
  // Avoid: 'any', 'Function', no reusable type
}
```

---

## 4. React Patterns

### Component Structure

**Order of elements in a component:**

```typescript
'use client'; // 1. Directives (if needed)

import { } from ''; // 2. Imports

interface ComponentProps { } // 3. Types/Interfaces

export function Component({ }: ComponentProps) { // 4. Component function

  // 5. Hooks (in order)
  const [state, setState] = useState();
  const { data } = useContext();
  const customHook = useCustomHook();
  useEffect(() => {}, []);

  // 6. Event handlers
  const handleClick = () => { };
  const handleSubmit = () => { };

  // 7. Derived values
  const computedValue = useMemo(() => { }, []);
  const isValid = checkValidity();

  // 8. Early returns
  if (loading) return <Loading />;
  if (error) return <Error />;

  // 9. Main render
  return (
    <div>
      {/* JSX */}
    </div>
  );
}
```

### Functional Components

```typescript
// ✅ Good: Named export with explicit props
export function ContactForm({ initialData, status, onSubmit }: ContactFormProps) {
  return <form>{/* ... */}</form>;
}

// ✅ Good: Arrow function for simple components
export const ErrorMessage = ({ message }: { message: string }) => (
  <div className="text-red-500">{message}</div>
);

// ❌ Bad: Default export (harder to refactor)
export default function ContactForm() { }

// ❌ Bad: Function declaration then export
function ContactForm() { }
export { ContactForm };
```

### Hook Patterns

**Custom Hook Structure:**

```typescript
// lib/workflow/use-workflow-state.ts

export function useWorkflowState() {
  // 1. Local state
  const [machine, setMachine] = useState<RuntimeMachine | null>(null);
  const [currentStepId, setCurrentStepId] = useState<string>('');

  // 2. Derived state
  const currentStep = machine?.steps.find(s => s.id === currentStepId) ?? null;
  const missingFields = currentStep
    ? missingRequiredFields(currentStep, collectedInputs)
    : [];

  // 3. Functions (use useCallback for performance)
  const loadWorkflow = useCallback(async (profile) => {
    // implementation
  }, []);

  const updateInputs = useCallback((newData) => {
    setCollectedInputs(prev => ({ ...prev, ...newData }));
  }, []);

  // 4. Effects (if any)
  useEffect(() => {
    // side effects
  }, [dependencies]);

  // 5. Return public API
  return {
    // State
    machine,
    currentStep,
    currentStepId,

    // Methods
    loadWorkflow,
    updateInputs,
  };
}
```

### Event Handlers

```typescript
// ✅ Good: Named handler with clear intent
const handleSubmit = (e: React.FormEvent) => {
  e.preventDefault();
  onSubmit(formData);
};

const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  setFormData({ ...formData, [e.target.name]: e.target.value });
};

// ❌ Bad: Inline handlers (hard to test, read)
<form onSubmit={(e) => { e.preventDefault(); /* ... */ }}>

// ❌ Bad: Generic names
const onClick = () => { }  // Too generic
const handler = () => { }  // Not descriptive
```

---

## 5. CopilotKit Integration Patterns

### Action Registration

**Pattern:** One hook file per stage, register actions conditionally

```typescript
// lib/stages/use-stage-build-car.tsx

export function useStageBuildCar() {
  const { stage, setStage, setSelectedCar } = useGlobalState();

  // Provide context to AI
  useCopilotReadable({
    description: "Current stage and user selections",
    value: {
      stage,
      selectedCar,
      availableOptions: carOptions
    },
    available: stage === "buildCar" ? "enabled" : "disabled"
  });

  // Provide instructions for this stage
  useCopilotAdditionalInstructions({
    instructions: `
      You are helping the user build their dream car.
      Ask about preferences for model, color, and features.
      Do not proceed until the user has made all selections.
    `,
    available: stage === "buildCar" ? "enabled" : "disabled"
  });

  // Register action for this stage
  useCopilotAction({
    name: "showCar",
    description: "Show a single car configuration to the user",

    // Only available in this stage
    available: stage === "buildCar" ? "enabled" : "disabled",

    parameters: [
      {
        name: "car",
        type: "object",
        description: "The car configuration to display",
        attributes: [
          { name: "make", type: "string", required: true },
          { name: "model", type: "string", required: true },
          { name: "year", type: "number", required: true },
          { name: "color", type: "string" },
        ]
      }
    ],

    renderAndWaitForResponse: ({ args, status, respond }) => {
      return (
        <ShowCar
          car={args.car}
          status={status}
          onSelect={() => {
            setSelectedCar(args.car);
            respond?.("User selected the car. Move to next stage.");
            setStage("sellFinancing");
          }}
          onReject={() => {
            respond?.("User wants different options. Show more cars.");
          }}
        />
      );
    }
  }, [stage]); // Dependencies: re-register when stage changes
}
```

### Action Naming & Documentation

```typescript
// ✅ Good: Clear name and description
useCopilotAction({
  name: "updateCarConfiguration",
  description: "Update the car configuration with user's selected model, color, and features. Only call this when the user has made explicit choices.",
  // ...
});

// ❌ Bad: Vague or unclear
useCopilotAction({
  name: "update",  // Too generic
  description: "Updates stuff",  // Not helpful
});
```

### Parameter Definitions

```typescript
// ✅ Good: Well-structured parameters
parameters: [
  {
    name: "contactInfo",
    type: "object",
    description: "Customer contact information for order processing",
    required: true,
    attributes: [
      {
        name: "name",
        type: "string",
        description: "Full legal name of the customer",
        required: true
      },
      {
        name: "email",
        type: "string",
        description: "Email address for order confirmation",
        required: true
      },
      {
        name: "phone",
        type: "string",
        description: "Phone number for delivery coordination",
        required: false
      }
    ]
  }
]

// ❌ Bad: Minimal or missing descriptions
parameters: [
  { name: "data", type: "object" }  // No description, no structure
]
```

### Conditional Availability

```typescript
// ✅ Good: Conditionally enable based on stage
useCopilotAction({
  name: "transitionToNextStep",
  available: canProgress() ? "enabled" : "disabled",  // Dynamic
  // ...
});

useCopilotAction({
  name: "collectContactInfo",
  available: stage === "getContactInfo" ? "enabled" : "disabled",  // Stage-based
  // ...
});

// ❌ Bad: Always enabled (causes confusion)
useCopilotAction({
  name: "anyAction",
  available: "enabled",  // Might trigger at wrong time
});
```

---

## 6. State Management

### Context + Hooks Pattern

**Global State Provider:**

```typescript
// lib/stages/use-global-state.tsx

import { createContext, useContext, useState } from 'react';

// 1. Define types
type Stage = "getContactInfo" | "buildCar" | "sellFinancing";

interface GlobalState {
  // State values
  stage: Stage;
  selectedCar: Car | null;
  contactInfo: ContactInfo | null;

  // State setters
  setStage: React.Dispatch<React.SetStateAction<Stage>>;
  setSelectedCar: React.Dispatch<React.SetStateAction<Car | null>>;
  setContactInfo: React.Dispatch<React.SetStateAction<ContactInfo | null>>;
}

// 2. Create context
const GlobalStateContext = createContext<GlobalState | undefined>(undefined);

// 3. Provider component
export function GlobalStateProvider({ children }: { children: React.ReactNode }) {
  const [stage, setStage] = useState<Stage>("getContactInfo");
  const [selectedCar, setSelectedCar] = useState<Car | null>(null);
  const [contactInfo, setContactInfo] = useState<ContactInfo | null>(null);

  return (
    <GlobalStateContext.Provider value={{
      stage, setStage,
      selectedCar, setSelectedCar,
      contactInfo, setContactInfo,
    }}>
      {children}
    </GlobalStateContext.Provider>
  );
}

// 4. Hook to consume context
export function useGlobalState(): GlobalState {
  const context = useContext(GlobalStateContext);

  if (!context) {
    throw new Error('useGlobalState must be used within GlobalStateProvider');
  }

  return context;
}
```

**Usage in App:**

```typescript
// app/layout.tsx
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <GlobalStateProvider>
          {children}
        </GlobalStateProvider>
      </body>
    </html>
  );
}

// components/main-chat.tsx
export function MainChat() {
  const { stage, setStage, selectedCar } = useGlobalState();

  return <div>{/* Use state */}</div>;
}
```

### Local State Patterns

```typescript
// ✅ Good: Descriptive state names with clear types
const [formData, setFormData] = useState<ContactFormData>({
  legal_name: '',
  contact_email: '',
  contact_phone: ''
});

const [errors, setErrors] = useState<Record<string, string>>({});
const [loading, setLoading] = useState<boolean>(false);

// ✅ Good: Derived state with useMemo for performance
const isValid = useMemo(() => {
  return validateForm(formData);
}, [formData]);

// ❌ Bad: Generic or unclear names
const [data, setData] = useState();
const [value, setValue] = useState();
const [state, setState] = useState();
```

---

## 7. Component Organization

### UI Components

**Principle:** UI components should be presentational (no business logic)

```typescript
// components/ui/components/contact-form.tsx

interface ContactFormProps {
  initialData?: ContactFormData;
  status: RenderFunctionStatus;
  onSubmit: (data: ContactFormData) => void;
}

export function ContactForm({ initialData, status, onSubmit }: ContactFormProps) {
  // Local UI state only
  const [formData, setFormData] = useState(initialData ?? DEFAULT_DATA);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // UI logic only (validation, formatting)
  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.legal_name) {
      newErrors.legal_name = 'Name is required';
    }

    // Email validation
    if (!formData.contact_email) {
      newErrors.contact_email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.contact_email)) {
      newErrors.contact_email = 'Invalid email format';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) {
      onSubmit(formData);  // Delegate to parent
    }
  };

  const isDisabled = status === 'executing' || status === 'complete';

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Form fields */}
    </form>
  );
}
```

### Component Wrappers (Registry Pattern)

```typescript
// components/ui/components/contact-form-wrapper.tsx

import { RegistryComponentProps } from '../component-registry';
import { ContactForm } from './contact-form';

export function ContactFormWrapper({
  data,
  status,
  onComplete
}: RegistryComponentProps) {
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
```

### Orchestrator Components

```typescript
// components/chat/main-chat.tsx

export function MainChat() {
  const { stage } = useGlobalState();

  // Register all stage hooks
  useStageGetContactInfo();
  useStageBuildCar();
  useStageSellFinancing();
  useStageGetFinancingInfo();
  useStageGetPaymentInfo();
  useStageConfirmOrder();

  // Provide system-level instructions
  useCopilotAdditionalInstructions({
    instructions: `
      You are Fio, an AI car sales assistant.

      The sales process has 6 stages:
      1. getContactInfo - Collect customer name, email, phone
      2. buildCar - Help customer configure their vehicle
      3. sellFinancing - Present financing options
      4. getFinancingInfo - Collect financing details
      5. getPaymentInfo - Collect payment information
      6. confirmOrder - Finalize the purchase

      Always complete the current stage before moving to the next.
      Be friendly, professional, and helpful.
    `
  });

  return (
    <div className="chat-container">
      <CopilotChat />
    </div>
  );
}
```

---

## 8. File Structure & Imports

### Import Order

```typescript
// 1. External libraries (React, Next.js, third-party)
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useCopilotAction, useCopilotReadable } from '@copilotkit/react-core';

// 2. Internal libraries (aliased imports from @/)
import { WorkflowStep, RuntimeMachine } from '@/lib/workflow/schema';
import { compileRuntimeMachine, nextStepId } from '@/lib/workflow/engine';
import { useWorkflowState } from '@/lib/workflow/use-workflow-state';

// 3. UI components
import { ContactForm } from '@/components/ui/components/contact-form';
import { ErrorMessage } from '@/components/ui/error-message';

// 4. Types (if not imported with code)
import type { ContactFormData } from '@/lib/types';

// 5. Styles (if using CSS modules)
import styles from './component.module.css';
```

### Path Aliases

**Configure in `tsconfig.json`:**

```json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./src/*"],
      "@/lib/*": ["./src/lib/*"],
      "@/components/*": ["./src/components/*"]
    }
  }
}
```

**Usage:**

```typescript
// ✅ Good: Use @ alias
import { useWorkflowState } from '@/lib/workflow/use-workflow-state';
import { ContactForm } from '@/components/ui/contact-form';

// ❌ Bad: Relative paths (hard to refactor)
import { useWorkflowState } from '../../../lib/workflow/use-workflow-state';
```

### Barrel Exports

**Use `index.ts` to simplify imports:**

```typescript
// lib/workflow/index.ts
export * from './schema';
export * from './engine';
export * from './loader';
export { useWorkflowState } from './use-workflow-state';

// Usage:
import { WorkflowStep, compileRuntimeMachine, useWorkflowState } from '@/lib/workflow';
```

**Don't overuse:** Only create barrel exports for logical groupings, not every directory.

---

## 9. Code Documentation

### JSDoc Comments

```typescript
/**
 * Compiles a workflow definition into an optimized runtime machine.
 *
 * @param def - The workflow definition from YAML
 * @returns A compiled runtime machine with step index and initial state
 *
 * @example
 * ```typescript
 * const machine = compileRuntimeMachine(workflowDef);
 * console.log(machine.initialStepId); // "getContactInfo"
 * ```
 */
export function compileRuntimeMachine(def: WorkflowDefinition): RuntimeMachine {
  // implementation
}

/**
 * Evaluates a simple expression against collected inputs.
 *
 * Supported operators: ==, !=, >, >=, <, <=
 *
 * @param expr - Expression string like "risk_score > 70"
 * @param inputs - Collected input values
 * @returns True if expression evaluates to true
 *
 * @internal This is a simple evaluator, not a full expression parser
 */
function evaluateExpression(expr: string, inputs: Inputs): boolean {
  // implementation
}
```

### Component Documentation

```typescript
/**
 * ContactForm - Collects customer contact information
 *
 * This component provides a validated form for collecting:
 * - Legal name (required)
 * - Email address (required, validated)
 * - Phone number (required, format validated)
 *
 * @param initialData - Pre-filled form values (optional)
 * @param status - CopilotKit execution status
 * @param onSubmit - Callback when form is successfully submitted
 */
export function ContactForm({ initialData, status, onSubmit }: ContactFormProps) {
  // implementation
}
```

### Inline Comments

```typescript
// ✅ Good: Explain "why", not "what"
// Check if user can progress - required fields must be collected
const canProgress = missingRequiredFields.length === 0;

// Fallback to first workflow if no exact match
const selected = exactMatch ?? workflows[0];

// ❌ Bad: Stating the obvious
// Set the name variable
const name = user.name;

// Loop through items
items.forEach(item => { });
```

### TODO Comments

```typescript
// TODO(username): Add support for conditional field requirements
// TODO(username): URGENT - Fix race condition in workflow loading
// FIXME: This breaks when user navigates back

// ❌ Bad: Vague TODOs
// TODO: fix this
// TODO: make better
```

---

## 10. Testing Organization

### Test File Location

**Mirror source structure in `tests/` directory:**

```
lib/workflow/engine.ts       → tests/workflow/engine.test.ts
lib/workflow/loader.ts       → tests/workflow/loader.test.ts
components/ui/contact-form.tsx → tests/ui/contact-form.test.tsx
```

### Test Organization

```typescript
// tests/workflow/engine.test.ts

import { describe, test, expect } from 'vitest';
import { evaluateExpression, nextStepId, missingRequiredFields } from '@/lib/workflow/engine';

describe('evaluateExpression', () => {
  test('handles numeric greater than', () => {
    expect(evaluateExpression('risk_score > 70', { risk_score: 80 })).toBe(true);
    expect(evaluateExpression('risk_score > 70', { risk_score: 60 })).toBe(false);
  });

  test('handles string equality', () => {
    expect(evaluateExpression("decision == 'yes'", { decision: 'yes' })).toBe(true);
    expect(evaluateExpression("decision == 'yes'", { decision: 'no' })).toBe(false);
  });

  test('returns false for invalid expressions', () => {
    expect(evaluateExpression('invalid expression', {})).toBe(false);
  });
});

describe('nextStepId', () => {
  const step: WorkflowStep = {
    id: 'test',
    task_ref: 'test_task',
    next: {
      conditions: [
        { when: "decision == 'yes'", then: 'stepA' }
      ],
      default: 'stepB'
    }
  };

  test('returns conditional step when condition matches', () => {
    expect(nextStepId(step, { decision: 'yes' })).toBe('stepA');
  });

  test('returns default step when no condition matches', () => {
    expect(nextStepId(step, { decision: 'no' })).toBe('stepB');
  });
});
```

### Test Naming

```typescript
// ✅ Good: Descriptive test names
test('compiles workflow definition into runtime machine', () => { });
test('throws error when workflow directory does not exist', () => { });
test('blocks progression when required fields are missing', () => { });

// ❌ Bad: Vague test names
test('works', () => { });
test('test1', () => { });
test('edge case', () => { });
```

---

## Summary Checklist

When writing code for React + AI applications:

### Structure
- [ ] Follow the standard directory layout
- [ ] Separate business logic (`lib/`) from UI (`components/`)
- [ ] Use feature-based organization
- [ ] Keep directories flat (max 3 levels)

### Naming
- [ ] PascalCase for components
- [ ] `use-*` prefix for hooks (kebab-case files)
- [ ] camelCase for functions and variables
- [ ] kebab-case for files and directories

### TypeScript
- [ ] Explicit types on function parameters and returns
- [ ] Use `interface` for object shapes
- [ ] Use `type` for unions and primitives
- [ ] Export shared types from `lib/types/`

### React
- [ ] Functional components with named exports
- [ ] Use hooks in correct order
- [ ] Extract event handlers
- [ ] Use `useCallback` for functions passed as props

### CopilotKit
- [ ] One hook file per stage
- [ ] Conditional `available` based on stage
- [ ] Clear action names and descriptions
- [ ] Well-structured parameters with descriptions

### State
- [ ] Use Context + hooks for global state
- [ ] Local state for UI-only concerns
- [ ] Derived state with `useMemo`

### Code Quality
- [ ] Meaningful comments (explain "why")
- [ ] JSDoc for public APIs
- [ ] Consistent import order
- [ ] Mirror test structure to source

---

**This guide should be referenced for all React + AI application development and can be added to CLAUDE.md for consistent code generation.**
