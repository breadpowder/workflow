# CLAUDE.md - Project-Specific Development Guidelines

## Overview
This project implements composable, YAML-driven workflow systems for React applications with AI capabilities using CopilotKit. All code must follow the established patterns and conventions.

---

## Code Style & Structure

**CRITICAL**: All React + AI application development MUST follow the comprehensive style guide:

📖 **[CODE_STYLE_GUIDE.md](./CODE_STYLE_GUIDE.md)**

This guide covers:
- Project structure and directory organization
- Naming conventions for files, components, hooks
- TypeScript patterns and type organization
- React component patterns and hook usage
- CopilotKit integration patterns
- State management with Context + Hooks
- Component organization and separation of concerns
- Import order and path aliases
- Code documentation standards
- Testing organization

**Before writing any code**, review the style guide to ensure consistency.

---

## Project-Specific Rules

### 1. Technology Stack

**Core Framework:**
- Next.js 14+ (App Router)
- TypeScript 5+
- React 18+

**AI Integration:**
- CopilotKit (@copilotkit/react-core, @copilotkit/runtime)
- Self-hosted runtime (no cloud keys)

**Styling:**
- Tailwind CSS 3+
- clsx + tailwind-merge for class utilities

**Workflow Engine:**
- YAML for workflow definitions
- TypeScript engine for interpretation

**Testing:**
- Vitest for unit tests
- React Testing Library for component tests

### 2. Architecture Principles

**Separation of Concerns:**
```
lib/        → Business logic, workflow engine, state management (NO UI)
components/ → UI components only (NO business logic)
app/        → Routes, pages, API endpoints, layout
data/       → YAML workflows, static configuration
tests/      → Mirror source structure
```

**Component Registry Pattern:**
- Actions DO NOT directly import UI components
- Use component registry: `componentId → React.ComponentType`
- YAML specifies `component_id` for each workflow step

**YAML-Driven Workflows:**
- Workflow definitions live in `data/workflows/*.yaml`
- Business users can edit YAML without code changes
- Engine interprets YAML at runtime (no code generation)

### 3. Workflow Engine Requirements

**Schema Definition** (`lib/workflow/schema.ts`):
```typescript
export interface WorkflowStep {
  id: string;
  task_ref: string;
  component_id?: string;  // Registry component to render
  required_fields?: string[];
  next: {
    conditions?: WorkflowStepNextCondition[];
    default: string;
  };
}
```

**Engine Functions** (`lib/workflow/engine.ts`):
- `compileRuntimeMachine(def)` - Transform YAML → runtime machine
- `evaluateExpression(expr, inputs)` - Evaluate conditions (>, >=, <, <=, ==, !=)
- `nextStepId(step, inputs)` - Compute next step based on conditions
- `missingRequiredFields(step, inputs)` - Validate required fields
- `getStepById(machine, stepId)` - Fast step lookup

**Loader** (`lib/workflow/loader.ts`):
- `loadWorkflows()` - Read all YAML files from `data/workflows/`
- `pickApplicableWorkflow(defs, profile)` - Select by client_type/jurisdiction

### 4. State Management Pattern

**Use Context + Hooks (NOT Redux, Zustand, etc.):**

```typescript
// lib/workflow/use-workflow-state.ts
export function useWorkflowState() {
  const [machine, setMachine] = useState<RuntimeMachine | null>(null);
  const [currentStepId, setCurrentStepId] = useState<string>('');
  const [collectedInputs, setCollectedInputs] = useState<Record<string, any>>({});

  // Methods
  const loadWorkflow = useCallback(async (profile) => { }, []);
  const updateInputs = useCallback((data) => { }, []);
  const progressToNextStep = useCallback(() => { }, []);

  return {
    machine,
    currentStep,
    collectedInputs,
    loadWorkflow,
    updateInputs,
    progressToNextStep
  };
}
```

### 5. CopilotKit Integration Patterns

**Self-Hosted Runtime** (`app/api/copilotkit/route.ts`):
```typescript
import { CopilotRuntime, OpenAIAdapter } from '@copilotkit/runtime';

const serviceAdapter = new OpenAIAdapter();
const runtime = new CopilotRuntime();

export const POST = async (req: NextRequest) => {
  const { handleRequest } = copilotRuntimeNextJSAppRouterEndpoint({
    runtime,
    serviceAdapter,
    endpoint: '/api/copilotkit'
  });
  return handleRequest(req);
};
```

**Generic renderUI Action Pattern:**
```typescript
useCopilotAction({
  name: "renderUI",
  description: "Render a UI component from the registry",
  parameters: [
    {
      name: "componentId",
      type: "string",
      enum: Object.keys(COMPONENT_REGISTRY),
      required: false
    }
  ],
  renderAndWaitForResponse: ({ args, status, respond }) => {
    const Component = getComponent(args.componentId || currentStep?.component_id);
    return <Component data={args.data} status={status} onComplete={result => {
      updateInputs(result.data);
      const progression = progressToNextStep();
      respond?.(JSON.stringify(progression));
    }} />;
  }
});
```

**Conditional Availability:**
- Actions must use `available: stage === "current" ? "enabled" : "disabled"`
- Provide context via `useCopilotReadable` with current step requirements
- Use `useCopilotAdditionalInstructions` for stage-specific guidance

### 6. Component Registry Pattern

**Registry Definition** (`lib/ui/component-registry.ts`):
```typescript
export interface RegistryComponentProps {
  data: any;
  status: RenderFunctionStatus;
  onComplete: (result: any) => void;
}

const UI_COMPONENT_REGISTRY: Record<string, React.ComponentType<RegistryComponentProps>> = {
  'contact-form': ContactFormWrapper,
  'document-upload': DocumentUploadWrapper,
  'edd-questionnaire': EDDQuestionnaireWrapper,
  'review-summary': ReviewSummaryWrapper
};

export function getComponent(componentId: string): React.ComponentType<RegistryComponentProps> | null {
  return UI_COMPONENT_REGISTRY[componentId] ?? null;
}
```

**Wrapper Pattern:**
```typescript
// Thin adapter layer
export function ContactFormWrapper({ data, status, onComplete }: RegistryComponentProps) {
  return (
    <ContactForm
      initialData={data}
      status={status}
      onSubmit={(formData) => onComplete({ action: 'submit', data: formData })}
    />
  );
}
```

### 7. YAML Workflow Structure

```yaml
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
    required_fields: ["business_registration", "tax_id", "proof_of_address"]
    next:
      conditions:
        - when: "risk_score > 70"
          then: enhancedDueDiligence
      default: review
```

### 8. Testing Requirements

**Unit Tests:**
- Workflow engine functions (expression evaluation, field validation)
- Component registry lookup and error handling
- Workflow loader and selection logic

**Integration Tests:**
- End-to-end workflow completion
- Conditional branching (e.g., risk_score triggers)
- Required field validation blocking

**Test Coverage:**
- Minimum 80% for core modules
- 100% for workflow engine

**Test Organization:**
```
tests/
├── workflow/
│   ├── engine.test.ts
│   ├── loader.test.ts
│   └── use-workflow-state.test.ts
├── ui/
│   └── component-registry.test.ts
└── integration/
    └── workflow-e2e.test.ts
```

### 9. Environment Configuration

**Required Environment Variables:**
```bash
# .env.local (server-side only)
OPENAI_API_KEY=sk-proj-...

# DO NOT use NEXT_PUBLIC_* for API keys
# Keep all secrets server-side
```

**Environment Setup:**
```typescript
// Check for required env vars at startup
if (!process.env.OPENAI_API_KEY) {
  throw new Error('OPENAI_API_KEY is required');
}
```

### 10. Error Handling Strategy

**YAML Loading:**
- Invalid syntax → Skip file, log warning, continue
- Schema validation failure → Skip file, log warning
- No workflows found → Return 404 from API

**Workflow Selection:**
- No matching workflow → Fallback to first available
- No workflows at all → Return 404 with clear message

**Component Registry:**
- Unknown component_id → Render error component, respond to AI
- Missing component_id → Use default error component

**Transition Failures:**
- Missing required fields → Block progression, return specific fields
- Invalid expression → Log error, treat as false, use default

### 11. API Endpoints

**Workflow Query** (`app/api/workflows/route.ts`):
```typescript
GET /api/workflows?client_type=corporate&jurisdiction=US

Response:
{
  "workflowId": "wf_corporate_v1",
  "version": 1,
  "initialStepId": "collectContactInfo",
  "stepIndexById": { ... },
  "steps": [ ... ]
}
```

**CopilotKit Runtime** (`app/api/copilotkit/route.ts`):
```typescript
POST /api/copilotkit
Content-Type: application/json

Body: { messages: [...], actions: [...] }
```

### 12. Git Workflow

**Branch Naming:**
- Features: `feature/<descriptive-name>`
- Bugs: `bugfix/<issue-name>`

**Commit Messages:**
```bash
# Format: <type>: <subject>

feat: implement component registry pattern
fix: resolve race condition in workflow loading
docs: update CODE_STYLE_GUIDE with hook patterns
test: add unit tests for expression evaluator
refactor: extract workflow loader into separate module
```

**Pre-Commit Checklist:**
- [ ] Code follows CODE_STYLE_GUIDE.md
- [ ] All tests pass (`npm test`)
- [ ] TypeScript compiles without errors
- [ ] No console.log statements (use proper logging)
- [ ] Environment variables not committed

### 13. Documentation Requirements

**JSDoc for Public APIs:**
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
 * console.log(machine.initialStepId); // "collectContactInfo"
 * ```
 */
export function compileRuntimeMachine(def: WorkflowDefinition): RuntimeMachine {
  // implementation
}
```

**Component Documentation:**
```typescript
/**
 * ContactForm - Collects customer contact information
 *
 * This component provides a validated form for collecting:
 * - Legal name (required)
 * - Email address (required, validated)
 * - Phone number (required, format validated)
 */
export function ContactForm({ initialData, status, onSubmit }: ContactFormProps) {
  // implementation
}
```

### 14. Code Review Checklist

Before submitting code for review:

**Structure:**
- [ ] Follows directory layout from CODE_STYLE_GUIDE
- [ ] Business logic in `lib/`, UI in `components/`
- [ ] No circular dependencies

**Naming:**
- [ ] PascalCase for components
- [ ] `use-*` for hook files
- [ ] camelCase for functions
- [ ] kebab-case for files/directories

**TypeScript:**
- [ ] Explicit types on parameters and returns
- [ ] No `any` types (use `unknown` if needed)
- [ ] Shared types exported from `lib/types/`

**React:**
- [ ] Functional components with named exports
- [ ] Hooks in correct order
- [ ] Event handlers extracted (not inline)

**CopilotKit:**
- [ ] Conditional `available` based on state
- [ ] Clear action descriptions
- [ ] Well-structured parameters

**Testing:**
- [ ] Unit tests for business logic
- [ ] Coverage >80% for new code
- [ ] Tests mirror source structure

---

## Quick Reference Commands

```bash
# Development
npm run dev          # Start dev server
npm run build        # Production build
npm run start        # Run production server

# Testing
npm test             # Run all tests
npm run test:watch   # Watch mode
npm run test:coverage # Coverage report

# Code Quality
npm run lint         # ESLint
npm run type-check   # TypeScript check
npm run format       # Prettier format

# Cleanup
npm run clean        # Remove build artifacts
```

---

## Additional Resources

- **CopilotKit Documentation**: https://docs.copilotkit.ai/
- **Next.js Documentation**: https://nextjs.org/docs
- **Tailwind CSS**: https://tailwindcss.com/docs
- **Vitest**: https://vitest.dev/

---

**Last Updated:** 2025-10-21
**Project:** Composable Workflow System with AI Capabilities
