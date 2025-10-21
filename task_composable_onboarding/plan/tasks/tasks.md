# Composable Onboarding POC - Task Breakdown

**Project**: Composable Onboarding Proof of Concept
**Architecture**: Two-Level YAML + Schema-Driven Components + Self-Hosted CopilotKit
**Total Tasks**: 14
**Total Estimated Time**: 18-20 hours
**Status**: Ready for Implementation

---

## Task 1: Self-Hosted CopilotKit Runtime

**ID**: COMP-001
**Priority**: High (Critical Path)
**Estimated Time**: 2 hours
**Dependencies**: None

### Description

Set up Next.js 14+ project with App Router and implement self-hosted CopilotKit runtime endpoint. Configure OpenAI adapter for AI-powered assistance without exposing API keys to the client.

This is the foundation task that enables all AI-powered features in the application.

### Objectives

- Initialize Next.js project with TypeScript and Tailwind CSS
- Install CopilotKit dependencies (@copilotkit/react-core, @copilotkit/runtime)
- Create API route for self-hosted runtime
- Configure environment variables securely
- Test AI response streaming

### Acceptance Criteria

- ✅ Next.js project initialized with App Router
- ✅ `/api/copilotkit` endpoint responds to POST requests
- ✅ OpenAI adapter configured with `OPENAI_API_KEY` from environment
- ✅ Streaming responses work correctly
- ✅ API key NOT exposed to client-side code
- ✅ `.env.example` file created with required variables
- ✅ Endpoint tested manually with valid API key
- ✅ Error handling for missing/invalid API key

### Files to Create

- `app/api/copilotkit/route.ts` - Runtime endpoint
- `.env.local` - Local environment variables (git-ignored)
- `.env.example` - Environment variable template
- `package.json` - Updated with dependencies

### Files to Modify

- `.gitignore` - Ensure `.env.local` is ignored

### Testing Requirements

- **Manual Test**: Send POST request to `/api/copilotkit`, verify response
- **Environment Test**: Confirm API key not accessible from client
- **Error Test**: Test behavior with missing API key

### Technical Notes

- Use `copilotRuntimeNextJSAppRouterEndpoint` for App Router compatibility
- Set request timeout to 120 seconds for long-running operations
- Use `maxDuration` export for Vercel deployment compatibility

### References

- implement_plan.md: Section 3, Task 1
- Context7: CopilotKit runtime setup (/copilotkit/copilotkit)
- Context7: Next.js API routes (/vercel/next.js)

---

## Task 2: Two-Stage YAML Workflow Loader

**ID**: COMP-002
**Priority**: High (Critical Path)
**Estimated Time**: 2 hours
**Dependencies**: None

### Description

Implement two-stage YAML loading system that separates workflow orchestration from field schema definitions (ground truth). This enables task reusability across workflows and supports task inheritance.

**Key Innovation**: Two-level architecture where workflows reference tasks, and tasks contain schemas.

### Objectives

- Define TypeScript schemas for workflows and tasks
- Implement workflow file loader
- Implement task file loader with inheritance resolution
- Create workflow selection logic by client_type/jurisdiction
- Add validation for task references and circular inheritance

### Acceptance Criteria

- ✅ Workflow files loaded from `data/workflows/*.yaml`
- ✅ Task files loaded from `data/tasks/**/*.yaml`
- ✅ Task inheritance resolved correctly (extends base tasks)
- ✅ Circular inheritance detected and prevented
- ✅ `task_ref` validation ensures all references exist
- ✅ `required_fields` validation against task's `expected_output_fields`
- ✅ Workflow selection works by `client_type` and `jurisdiction`
- ✅ Compiled workflow includes resolved schemas from tasks
- ✅ GET `/api/workflows?client_type=...&jurisdiction=...` returns compiled workflow

### Files to Create

- `lib/workflow/schema.ts` - TypeScript type definitions
- `lib/workflow/loader.ts` - YAML loading functions
- `app/api/workflows/route.ts` - API endpoint
- `data/workflows/corporate_onboarding_v1.yaml` - Example workflow
- `data/workflows/individual_onboarding_v1.yaml` - Example workflow
- `data/tasks/_base/contact_info_base.yaml` - Base task
- `data/tasks/contact_info/corporate.yaml` - Corporate task
- `data/tasks/contact_info/individual.yaml` - Individual task

### Testing Requirements

- **Unit Tests**:
  - Test task inheritance resolution
  - Test circular inheritance detection
  - Test validation of task references
- **Integration Test**: Load complete workflow with tasks
- **API Test**: Test `/api/workflows` endpoint

### Technical Notes

- Use `yaml` npm package for parsing
- Implement recursive inheritance resolution
- Cache loaded workflows for performance
- Validate that task's `component_id` exists in registry

### References

- implement_plan.md: Section 3, Task 2
- strategy.md: Two-Level YAML Architecture
- implement_plan.md: Section 2.2 (Two-Level YAML Architecture)

---

## Task 3: Component Registry

**ID**: COMP-003
**Priority**: High (Critical Path)
**Estimated Time**: 2 hours
**Dependencies**: None

### Description

Create component registry pattern that decouples CopilotKit actions from UI components. Registry maps `component_id` → React component, enabling YAML to control which UI renders.

**Key Principle**: Keep registry lean (3-5 generic components) by using schema-driven components.

### Objectives

- Define `RegistryComponentProps` interface
- Create component registry with lookup functions
- Implement generic `renderUI` CopilotKit action
- Add error handling for unknown components

### Acceptance Criteria

- ✅ `RegistryComponentProps` interface defined with `data`, `status`, `onComplete`
- ✅ Registry contains 3-5 generic component mappings
- ✅ `getComponent(componentId)` returns component or null
- ✅ `getAvailableComponentIds()` returns array of valid IDs
- ✅ `renderUI` action successfully renders components by ID
- ✅ Action passes schema from workflow to component via `data.schema`
- ✅ No action directly imports UI components (all via registry)
- ✅ Error component shown for unknown `component_id`
- ✅ Unit tests verify registry lookup and error handling

### Files to Create

- `lib/ui/component-registry.ts` - Registry and lookup functions
- `components/onboarding/error-component.tsx` - Error fallback UI

### Testing Requirements

- **Unit Tests**:
  - Test `getComponent()` with valid/invalid IDs
  - Test `getAvailableComponentIds()`
  - Test error handling for missing components
- **Integration Test**: Verify `renderUI` action integration

### Technical Notes

- Use `React.ComponentType<RegistryComponentProps>` for type safety
- Registry is a static object (no runtime modification)
- Components must implement standard interface for consistency

### References

- implement_plan.md: Section 3, Task 3
- strategy.md: Component Registry Strategy
- implement_plan.md: Section 2.1 (Schema-Driven Components)

---

## Task 4A: Runtime Machine Compilation

**ID**: COMP-004A
**Priority**: High (Critical Path)
**Estimated Time**: 1.5 hours
**Dependencies**: Task 2 (YAML Loader)

### Description

Implement runtime machine compilation that transforms loaded workflow definitions into optimized runtime state machines. Creates step index for fast lookups and validates workflow structure.

### Objectives

- Define `RuntimeMachine` interface
- Implement `compileRuntimeMachine()` function
- Build step index (Map) for O(1) step lookups
- Validate transitions reference valid steps
- Identify orphaned steps

### Acceptance Criteria

- ✅ `RuntimeMachine` interface includes `workflowId`, `version`, `initialStepId`, `steps`, `stepIndexById`
- ✅ `compileRuntimeMachine()` creates step index Map
- ✅ All task references resolved and schemas merged
- ✅ Transitions validated (all `next` references exist or are "END")
- ✅ Orphaned steps detected and reported
- ✅ Initial step set correctly
- ✅ Unit tests for compilation edge cases

### Files to Create

- `lib/workflow/engine.ts` - Engine functions (start here)

### Testing Requirements

- **Unit Tests**:
  - Test valid workflow compilation
  - Test detection of invalid transitions
  - Test orphaned step detection
  - Test step index correctness

### Technical Notes

- Use `Map<string, CompiledWorkflowStep>` for fast lookups
- Validate during compilation, not at runtime
- Include all resolved task data in compiled steps

### References

- implement_plan.md: Section 3, Task 4
- implement_plan.md: Section 2.2.5 (Workflow Compilation Process)

---

## Task 4B: Expression Evaluation Engine

**ID**: COMP-004B
**Priority**: High (Critical Path)
**Estimated Time**: 1 hour
**Dependencies**: None

### Description

Implement expression evaluation engine for conditional workflow transitions. Supports operators: `>`, `>=`, `<`, `<=`, `==`, `!=`, `in`.

**Example**: `"risk_score > 70"` → evaluates to boolean based on collected inputs.

### Objectives

- Implement `evaluateExpression()` function
- Support all required operators
- Handle type coercion (string/number/boolean)
- Add error handling for malformed expressions

### Acceptance Criteria

- ✅ Supports comparison operators: `>`, `>=`, `<`, `<=`
- ✅ Supports equality operators: `==`, `!=`
- ✅ Supports `in` operator for array membership
- ✅ Handles string comparisons correctly
- ✅ Handles number comparisons correctly
- ✅ Returns `false` for malformed expressions (safe default)
- ✅ Unit tests cover all operators
- ✅ Unit tests cover type coercion cases

### Files to Modify

- `lib/workflow/engine.ts` - Add evaluation function

### Testing Requirements

- **Unit Tests**:
  - Test each operator with various data types
  - Test malformed expressions return false
  - Test undefined variables return false
  - Test array membership with `in`

### Technical Notes

- Simple expression parser (no complex AST needed)
- Split expression: `leftVar operator rightValue`
- Type coercion: convert strings to numbers for numeric comparison
- Whitespace handling: trim all parts

### References

- implement_plan.md: Section 3, Task 4
- strategy.md: Workflow interpreter expressions

---

## Task 4C: State Transition Logic

**ID**: COMP-004C
**Priority**: High (Critical Path)
**Estimated Time**: 1 hour
**Dependencies**: Task 4A (Machine Compilation), Task 4B (Expression Evaluation)

### Description

Implement state transition logic that determines next workflow step based on conditions and collected inputs. Validates required fields before allowing transitions.

### Objectives

- Implement `nextStepId()` function
- Implement `missingRequiredFields()` function
- Handle conditional transitions
- Handle default transitions
- Support END state

### Acceptance Criteria

- ✅ `nextStepId()` evaluates conditions in order
- ✅ Returns first matching condition's `then` step
- ✅ Returns `default` step if no conditions match
- ✅ Returns `null` for END state
- ✅ `missingRequiredFields()` returns array of missing field names
- ✅ Validates against task's `required_fields` (ground truth)
- ✅ Unit tests for conditional branching
- ✅ Unit tests for required field validation

### Files to Modify

- `lib/workflow/engine.ts` - Add transition functions

### Testing Requirements

- **Unit Tests**:
  - Test conditional evaluation order
  - Test default fallback
  - Test END state handling
  - Test required field detection
  - Test empty vs undefined field values

### Technical Notes

- Evaluate conditions sequentially (first match wins)
- Use task's `required_fields` as ground truth
- Handle missing/undefined inputs gracefully

### References

- implement_plan.md: Section 3, Task 4
- Two-level YAML: required_fields at task level

---

## Task 4D: Workflow State Hook

**ID**: COMP-004D
**Priority**: High
**Estimated Time**: 30 minutes
**Dependencies**: Task 4A, 4B, 4C (All engine functions)

### Description

Create custom React hook (`useWorkflowState`) that manages workflow state, current step, collected inputs, and progression logic. Provides simple API for components to interact with workflow engine.

### Objectives

- Implement `useWorkflowState` hook
- Manage current step state
- Manage collected inputs state
- Provide progression functions
- Expose validation status

### Acceptance Criteria

- ✅ Hook returns `currentStep`, `collectedInputs`, `machine`
- ✅ `canProgress()` checks required fields
- ✅ `progressToNextStep()` validates and transitions
- ✅ `updateInputs()` merges new data
- ✅ `missingFields` array exposed
- ✅ `isComplete` boolean when step is null (END)
- ✅ Hook uses engine functions from Task 4A-4C
- ✅ Unit tests for hook behavior

### Files to Create

- `lib/workflow/hooks.ts` - Custom hook

### Testing Requirements

- **Unit Tests** (using React Testing Library):
  - Test state initialization
  - Test input updates
  - Test progression logic
  - Test validation blocking

### Technical Notes

- Use `useState` for state management
- Keep hook logic simple (delegate to engine functions)
- Expose minimal API surface

### References

- implement_plan.md: Section 3, Task 4
- Context7: React hooks (/websites/react_dev)

---

## Task 5A: Field Schema Type Definitions

**ID**: COMP-005A
**Priority**: High
**Estimated Time**: 30 minutes
**Dependencies**: None

### Description

Define TypeScript types for schema-driven components: `FieldSchema`, `FormSchema`, `DocumentSchema`. These types enable YAML to define UI component configuration without code changes.

**Key Principle**: Schemas = Data, Components = Behavior

### Objectives

- Define `FieldType` union type
- Define `FieldSchema` interface
- Define `FormSchema` interface
- Define `DocumentSchema` interface
- Add comprehensive JSDoc comments

### Acceptance Criteria

- ✅ `FieldType` supports: text, email, tel, number, date, textarea, select, checkbox, radio
- ✅ `FieldSchema` includes: name, label, type, required, validation, options, visible
- ✅ `FormSchema` includes: fields[], layout, submitLabel, cancelLabel
- ✅ `DocumentSchema` includes: documents[], allowMultiple, uploadLabel
- ✅ All properties properly typed (string, boolean, number, arrays, objects)
- ✅ Optional properties marked with `?`
- ✅ JSDoc comments explain each property
- ✅ Types exported for use across project

### Files to Create

- `lib/types/field-schema.ts` - All schema type definitions

### Testing Requirements

- **Type Tests**: Ensure TypeScript compilation passes
- **Usage Test**: Import and use types in test file

### Technical Notes

- Keep types simple and extensible
- Support conditional visibility via `visible` expression string
- Validation rules should be type-specific (pattern for text, min/max for number)

### References

- implement_plan.md: Section 2.1.5 (Schema Types)
- strategy.md: Schema-Driven Components

---

## Task 5B: Generic Form Component

**ID**: COMP-005B
**Priority**: High (Critical Path)
**Estimated Time**: 2 hours
**Dependencies**: Task 5A (Schema Types)

### Description

Build generic form component that renders ANY form based on `FormSchema`. This single component replaces 50+ specific form components through schema-driven rendering.

**Key Innovation**: One component serves unlimited form variations via schemas.

### Objectives

- Implement `GenericForm` component (~300 lines)
- Dynamic field rendering based on schema
- Validation logic (required, pattern, length, range)
- Conditional field visibility
- Layout support (single/two-column, grid)
- Error display with field-level messages
- Initial data population
- Loading states

### Acceptance Criteria

- ✅ Renders all field types from schema
- ✅ Validates required fields on submit
- ✅ Validates patterns (regex) for text fields
- ✅ Validates min/max for number fields
- ✅ Validates minLength/maxLength for text
- ✅ Conditional visibility works (evaluates `visible` expressions)
- ✅ Layout options work (single/two-column/grid)
- ✅ Displays field-level error messages
- ✅ Pre-populates with `initialData`
- ✅ Shows loading state during submission
- ✅ Calls `onSubmit` with form data
- ✅ Calls `onCancel` if provided
- ✅ Unit tests for validation logic
- ✅ Integration test with mock schema

### Files to Create

- `components/ui/generic-form.tsx` - Main form component

### Testing Requirements

- **Unit Tests**:
  - Test field visibility evaluation
  - Test validation for each field type
  - Test form submission
  - Test error display
- **Integration Test**: Render form with complex schema

### Technical Notes

- Use `useState` for form data and errors
- Implement `isFieldVisible()` function for conditional rendering
- Implement `validateField()` function for field-level validation
- Use `handleChange()` to clear errors on input
- Use `handleSubmit()` to validate all fields before submit

### References

- implement_plan.md: Section 2.1.6 (Generic Form Implementation)
- Context7: React forms and state (/websites/react_dev)

---

## Task 5C: FormField Renderer Component

**ID**: COMP-005C
**Priority**: High
**Estimated Time**: 1 hour
**Dependencies**: Task 5A (Schema Types)

### Description

Build `FormField` component that renders individual form fields based on `FieldSchema.type`. Handles all input types with consistent styling and error display.

### Objectives

- Implement `FormField` component
- Support all field types from `FieldType`
- Consistent styling across field types
- Error and help text display
- Accessibility (labels, ARIA attributes)

### Acceptance Criteria

- ✅ Renders text, email, tel, number, date inputs
- ✅ Renders textarea with configurable rows
- ✅ Renders select dropdown with options
- ✅ Renders checkbox with label
- ✅ Renders radio group with options
- ✅ Shows label with required indicator (`*`)
- ✅ Shows help text if provided
- ✅ Shows error message with red styling
- ✅ Focus states styled correctly
- ✅ Disabled state works
- ✅ Unit tests for each field type

### Files to Create

- `components/ui/form-field.tsx` - Field renderer

### Testing Requirements

- **Unit Tests**: Render each field type and verify output
- **Accessibility Test**: Check labels and ARIA attributes

### Technical Notes

- Use Tailwind CSS for styling
- Consistent focus ring: `focus:ring-2 focus:ring-blue-500`
- Error border: `border-red-500`
- Disabled styles: `disabled:bg-gray-100 disabled:cursor-not-allowed`

### References

- implement_plan.md: Section 2.1.6 (FormField component)
- design-system.md: Form styling guidelines

---

## Task 5D: Three-Pane Layout Components

**ID**: COMP-005D
**Priority**: Medium
**Estimated Time**: 1.5 hours
**Dependencies**: None

### Description

Implement three-pane layout based on approved mockup: LeftPane (clients), MiddlePane (presentation), RightPane (form + chat). Provides professional, context-rich interface for onboarding.

### Objectives

- Create layout wrapper component
- Build LeftPane with client list
- Build MiddlePane with profile, required fields, timeline sections
- Build RightPane container for form and chat
- Apply design system (colors, typography, spacing)
- Ensure responsive behavior

### Acceptance Criteria

- ✅ `ThreePaneLayout` wrapper created with flex layout
- ✅ LeftPane: 316px width, client list with folders
- ✅ MiddlePane: Flex-1, profile/required fields/timeline sections
- ✅ RightPane: 476px width, container for form + chat
- ✅ ProfileSection displays client data
- ✅ RequiredFieldsSection shows field status (completed/pending)
- ✅ TimelineSection displays events
- ✅ Professional Financial color scheme applied
- ✅ Responsive: panes collapsible on < 1024px
- ✅ Matches mockup structure and spacing

### Files to Create

- `components/layout/three-pane-layout.tsx` - Layout wrapper
- `components/layout/left-pane.tsx` - Clients list
- `components/layout/middle-pane.tsx` - Presentation pane
- `components/layout/right-pane.tsx` - Form + chat container
- `components/onboarding/profile-section.tsx` - Profile display
- `components/onboarding/required-fields-section.tsx` - Field status
- `components/onboarding/field-status.tsx` - Individual field status
- `components/onboarding/timeline-section.tsx` - Timeline display

### Testing Requirements

- **Visual Test**: Compare with mockup
- **Responsive Test**: Test on mobile/tablet/desktop viewports
- **Unit Tests**: Component rendering

### Technical Notes

- Use Tailwind classes: `flex`, `h-screen`, `border-r`, `overflow-y-auto`
- Color scheme: Primary `#1e40af`, Accent `#14b8a6`, Success `#10b981`
- Spacing: 8px grid system (p-4, p-5, p-6, etc.)
- Font sizes: text-xs (12px), text-sm (14px), text-base (16px), text-lg (18px)

### References

- design-system.md: Complete design specification
- onboarding-mockup-with-form.excalidraw: UI mockup
- implement_plan.md: Section 3, Task 5

---

## Task 5E: Registry Wrapper Components

**ID**: COMP-005E
**Priority**: High
**Estimated Time**: 1 hour
**Dependencies**: Task 3 (Registry), Task 5B (GenericForm)

### Description

Create wrapper components that adapt schema-driven UI components to the registry interface. Wrappers extract schemas from `data` prop and pass to generic components.

### Objectives

- Implement `GenericFormWrapper`
- Implement `GenericDocumentUploadWrapper` (placeholder)
- Implement `GenericDataTableWrapper` (placeholder)
- Implement `ReviewSummaryWrapper` (placeholder)
- Register all wrappers in registry

### Acceptance Criteria

- ✅ `GenericFormWrapper` extracts `schema` and `initialValues` from `data`
- ✅ Wrapper passes schema to `GenericForm`
- ✅ Wrapper handles `onSubmit` → `onComplete({ action: 'submit', data })`
- ✅ Wrapper handles `onCancel` → `onComplete({ action: 'cancel', data: {} })`
- ✅ Wrapper passes `status` to enable loading states
- ✅ All 4 wrappers registered in registry
- ✅ Placeholder wrappers return "Coming soon" message
- ✅ Integration test: Registry → Wrapper → Component flow

### Files to Create

- `components/onboarding/generic-form-wrapper.tsx` - Form wrapper
- `components/onboarding/generic-document-upload-wrapper.tsx` - Document wrapper (placeholder)
- `components/onboarding/generic-data-table-wrapper.tsx` - Table wrapper (placeholder)
- `components/onboarding/review-summary-wrapper.tsx` - Review wrapper (placeholder)

### Files to Modify

- `lib/ui/component-registry.ts` - Add wrapper imports and registry entries

### Testing Requirements

- **Integration Test**: Test registry lookup → wrapper → component chain
- **Unit Test**: Test wrapper data extraction and prop passing

### Technical Notes

- Wrappers are thin adapters (< 30 lines each)
- Extract `data.schema` with fallback to empty schema
- Extract `data.initialValues` with fallback to `{}`
- Pass `status === 'executing'` as `isLoading` boolean

### References

- implement_plan.md: Section 2.1.6 (Wrapper pattern)
- strategy.md: Component Registry Strategy

---

## Task 6: End-to-End Integration

**ID**: COMP-006
**Priority**: High (Critical Path)
**Estimated Time**: 1 hour
**Dependencies**: All previous tasks (1-5E)

### Description

Wire all components together for end-to-end workflow execution. Connect UI to workflow state, integrate CopilotKit actions, and test complete user flow.

### Objectives

- Create main page with three-pane layout
- Connect `useWorkflowState` hook
- Implement `renderUI` CopilotKit action with registry
- Wire MiddlePane to workflow state
- Test complete onboarding flow

### Acceptance Criteria

- ✅ Main page (`app/page.tsx`) renders three-pane layout
- ✅ Workflow loads on page mount
- ✅ `useWorkflowState` hook manages state
- ✅ `renderUI` action retrieves component from registry
- ✅ Action passes resolved schema to component
- ✅ Form submission updates `collectedInputs`
- ✅ Required fields display in MiddlePane updates in real-time
- ✅ Step progression works on valid submission
- ✅ Conditional branching works (e.g., risk_score > 70)
- ✅ END state reached and displayed
- ✅ Integration test: Complete workflow end-to-end

### Files to Create

- `app/page.tsx` - Main onboarding page
- `components/workflow-chat.tsx` - CopilotKit action integration

### Files to Modify

- `app/layout.tsx` - Wrap with CopilotKit provider

### Testing Requirements

- **Integration Test**:
  - Load workflow
  - Fill form
  - Submit
  - Verify state update
  - Verify progression
  - Complete workflow to END
- **Manual Test**: Full user flow in browser

### Technical Notes

- Use `CopilotKit` provider with `runtimeUrl="/api/copilotkit"`
- `useCopilotAction` with `renderAndWaitForResponse`
- `useCopilotReadable` to expose current step context to AI
- Handle `status` prop for loading states

### References

- implement_plan.md: Section 3, Task 6
- Context7: useCopilotAction with renderAndWaitForResponse (/copilotkit/copilotkit)

---

## Task 7: Documentation

**ID**: COMP-007
**Priority**: Medium
**Estimated Time**: 1 hour
**Dependencies**: Task 6 (Integration complete)

### Description

Create comprehensive documentation for setup, usage, and architecture. Ensure new contributors can run POC end-to-end.

### Objectives

- Write README with setup instructions
- Document YAML schema format
- Document component registry pattern
- Add architecture diagrams
- Document design system

### Acceptance Criteria

- ✅ README.md with:
  - Project overview
  - Setup instructions (npm install, env vars)
  - Running locally (npm run dev)
  - Project structure explanation
  - Key concepts (two-level YAML, schema-driven components)
- ✅ docs/yaml-schema.md with:
  - Workflow file format
  - Task file format
  - Inheritance rules
  - Examples
- ✅ docs/component-guide.md with:
  - How to use GenericForm
  - How to add new component types
  - Registry pattern explanation
- ✅ docs/architecture.md with:
  - Four-layer architecture diagram
  - Data flow explanation
  - Technology stack
- ✅ New contributor can follow docs to run POC

### Files to Create

- `README.md` - Main documentation
- `docs/yaml-schema.md` - YAML format guide
- `docs/component-guide.md` - Component usage guide
- `docs/architecture.md` - Architecture overview

### Testing Requirements

- **Documentation Test**: Have someone unfamiliar follow setup instructions
- **Accuracy Test**: Verify all commands work as documented

### Technical Notes

- Use clear, concise language
- Include code examples
- Add screenshots/diagrams where helpful
- Link to relevant files in codebase

### References

- implement_plan.md: Section 3, Task 7
- All planning documents for reference

---

## Dependency Graph

```
Task 1 (CopilotKit Runtime) ─────────────────────┐
                                                  ├─→ Task 6 (Integration)
Task 2 (YAML Loader) ────────→ Task 4A ─┐        │
                                         │        │
Task 3 (Registry) ───────────────────────┼────────┤
                                         │        │
Task 5A (Schema Types) ──→ Task 5B ──────┼────────┤
                      └──→ Task 5C ──────┤        │
                                         │        │
Task 5D (Layout) ────────────────────────┤        │
                                         │        │
Task 4A (Machine) ──→ Task 4C ──→ Task 4D┼────────┤
                      ↑                   │        │
Task 4B (Expression) ─┘                  │        │
                                         │        │
Task 5E (Wrappers) ──────────────────────┼────────┘
                                         │
                                         ↓
                                    Task 7 (Docs)
```

### Parallel Work Opportunities

**Phase 1** (Can work in parallel):
- Task 1: CopilotKit Runtime
- Task 2: YAML Loader
- Task 3: Component Registry
- Task 4B: Expression Evaluation
- Task 5A: Schema Types
- Task 5D: Layout Components

**Phase 2** (After Phase 1):
- Task 4A: Runtime Machine (needs Task 2)
- Task 5B: Generic Form (needs Task 5A)
- Task 5C: FormField (needs Task 5A)

**Phase 3** (After Phase 2):
- Task 4C: State Transition (needs Task 4A, 4B)
- Task 5E: Wrappers (needs Task 3, 5B)

**Phase 4** (After Phase 3):
- Task 4D: Workflow Hook (needs Task 4A, 4B, 4C)

**Phase 5** (Final):
- Task 6: Integration (needs all previous)

**Phase 6** (Post-implementation):
- Task 7: Documentation

---

## Success Metrics

### POC Completion Criteria

- ✅ All 14 tasks completed
- ✅ 2+ workflows execute successfully (corporate, individual)
- ✅ Task inheritance works
- ✅ Conditional branching works
- ✅ Forms validate and collect data
- ✅ AI assistant responds appropriately
- ✅ 80%+ test coverage
- ✅ Documentation complete
- ✅ New contributor can run POC end-to-end

### Performance Targets

- Workflow loading: < 100ms
- Step transition: < 50ms
- Form rendering: < 100ms
- AI response: < 3s

### Code Quality Standards

- TypeScript strict mode: ✅
- ESLint no errors: ✅
- All tests passing: ✅
- No console errors: ✅

---

## Notes

**Total Estimated Time**: 18-20 hours
- Critical path: Tasks 1, 2, 3, 4A-D, 5A-E, 6 (16-18 hours)
- Parallel work can reduce calendar time to ~10-12 hours

**Key Architectural Principles**:
1. Two-level YAML: Workflows = orchestration, Tasks = ground truth
2. Schema-driven components: One component, unlimited variations
3. Component registry: Decouple actions from UI
4. Self-hosted runtime: No cloud API keys

**Testing Strategy**:
- Unit tests: 80%+ coverage
- Integration tests: End-to-end workflow execution
- Manual testing: UI/UX verification
