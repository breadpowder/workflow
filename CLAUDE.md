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

4. to be continued