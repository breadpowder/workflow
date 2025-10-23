# Composable Onboarding POC - Task Breakdown

**Project**: Composable Onboarding Proof of Concept
**Architecture**: Two-Level YAML + Schema-Driven Components + Self-Hosted CopilotKit + Stages + Persistence + Chat-First Overlay UI + Three-Pane Layout
**Total Tasks**: 26
- Original: 14 tasks (Tasks 1-7)
- Added: Task 2B (Persistence), Task 4E (Stages)
- Added: Tasks 5F-5J (Chat-First Overlay UI: 5 tasks)
- Added: Tasks 6A-6E (Three-Pane Layout: 5 tasks)
- Renumbered: Task 6 → Task 7, Task 7 → Task 8
**Total Estimated Time**: 43-47 hours
**Status**: Phase 1 Complete (Tasks 1-5), Phase 2 In Progress (Tasks 6A-6E)

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
- ✅ Caching strategy: dev mode (NODE_ENV=development) disables cache, prod mode enables with mtime invalidation
- ✅ YAML validation errors include file:line context for easy debugging
- ✅ Compiled workflow includes `stages` array and step `stage` fields

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

## Task 2B: Client State Persistence

**ID**: COMP-002B
**Priority**: Medium
**Estimated Time**: 30 minutes
**Dependencies**: None

### Description

Implement file-based key-value storage for persisting client workflow state across sessions. Each client's state is stored in a JSON file with atomic write operations.

**Key Innovation**: Simple file-based persistence for POC with clear migration path to database in P1.

### Objectives

- Create `lib/workflow/state-store.ts` with persistence functions
- Implement atomic write operations (temp file + rename pattern)
- Support save, load, list, and delete operations
- Integrate with `useWorkflowState` hook for automatic persistence
- Store state in `data/client_state/{clientId}.json`

### Acceptance Criteria

- ✅ `saveClientState(clientId, state)` writes JSON file atomically
- ✅ `loadClientState(clientId)` reads and parses JSON file
- ✅ `listClients()` returns array of all client IDs
- ✅ `deleteClientState(clientId)` removes state file
- ✅ State directory created automatically if missing
- ✅ Handles missing files gracefully (returns null for loadClientState)
- ✅ State includes: clientId, workflowId, currentStepId, currentStage, collectedInputs, completedSteps, lastUpdated
- ✅ `useWorkflowState` hook loads state on mount
- ✅ `useWorkflowState` hook saves state on changes (currentStepId, collectedInputs)
- ✅ Unit tests for all state-store functions

### Files to Create

- `lib/workflow/state-store.ts` - State persistence functions
- `data/client_state/.gitkeep` - Ensure directory tracked by git

### Testing Requirements

- **Unit Tests**:
  - Test save operation creates file
  - Test load operation reads file correctly
  - Test load returns null for non-existent file
  - Test list operation returns all client IDs
  - Test delete operation removes file
  - Test atomic write (temp file → rename)
- **Integration Test**: Test hook load/save cycle

### Technical Notes

- Use `fs/promises` for async file operations
- Atomic writes: write to `{path}.tmp`, then `fs.rename()` to final path
- JSON format with 2-space indentation for readability
- Create `data/client_state/` directory on first write
- Error handling: ENOENT → null (not found), other errors → throw

### References

- implement_plan.md: Section 2.3 (Client State Persistence)
- strategy.md: Data Persistence Strategy

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

## Task 4E: Stage Modeling and Progression

**ID**: COMP-004E
**Priority**: Medium
**Estimated Time**: 1 hour
**Dependencies**: Task 4A (Machine Compilation), Task 4B (Expression Evaluation)

### Description

Implement stage support for grouping workflow steps into major phases. Stages provide higher-level progress tracking and enable "complete all tasks in a stage → advance to next stage" semantics.

### Objectives

- Add `stages` array to WorkflowDefinition schema
- Add optional `stage` field to WorkflowStep schema
- Implement `getStageStatus()` function to compute stage completion
- Implement `canProgressToNextStage()` function
- Update `RuntimeMachine` to include stage definitions
- Expose stage information in `useWorkflowState` hook

### Acceptance Criteria

- ✅ `WorkflowDefinition` includes optional `stages: StageDefinition[]`
- ✅ `StageDefinition` interface includes: id, name, description
- ✅ `WorkflowStep` includes optional `stage: string` field
- ✅ `RuntimeMachine` includes `stages` array
- ✅ `getStageStatus(machine, stageId, completedSteps)` returns completion percentage
- ✅ `canProgressToNextStage(machine, currentStage, completedSteps)` validates all non-optional steps complete
- ✅ `useWorkflowState` hook exposes `currentStage`, `stageProgress`, and `completedStages`
- ✅ MiddlePane UI displays stage headers with progress indicators
- ✅ Stage progression logic: all required steps in stage → next stage
- ✅ Unit tests for stage computation functions

### Files to Modify

- `lib/workflow/schema.ts` - Add StageDefinition interface and update WorkflowDefinition
- `lib/workflow/engine.ts` - Add getStageStatus and canProgressToNextStage functions
- `lib/workflow/hooks.ts` - Add stage-related state and computed values

### Files to Create

- `components/onboarding/stage-header.tsx` - Stage progress indicator component

### Testing Requirements

- **Unit Tests**:
  - Test getStageStatus with all steps complete
  - Test getStageStatus with partial completion
  - Test canProgressToNextStage returns true when stage complete
  - Test canProgressToNextStage returns false when steps missing
  - Test stage ordering and transitions
- **Integration Test**: Test complete workflow with stage transitions

### Technical Notes

- Stages are optional; workflows without stages still work
- Step `stage` field references `stages[].id`
- Stage completion = all non-optional steps in stage are completed
- Optional steps (conditional paths) don't block stage progression
- UI shows current stage highlighted, completed stages marked, future stages dimmed

### References

- feature-spec.md: Lines 10-12, 49-53 (stage requirements)
- implement_plan.md: Section 2.2.2 (stages in workflow schema)
- strategy.md: Stage Progress Tracking

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

- Implement `GenericFormWrapper` (fully functional)
- Implement `GenericDocumentUploadWrapper` (placeholder - P1)
- Implement `GenericDataTableWrapper` (placeholder - P1)
- Implement `ReviewSummaryWrapper` (fully functional - REQUIRED for POC)
- Register all wrappers in registry

### Acceptance Criteria

- ✅ `GenericFormWrapper` extracts `schema` and `initialValues` from `data`
- ✅ Wrapper passes schema to `GenericForm`
- ✅ Wrapper handles `onSubmit` → `onComplete({ action: 'submit', data })`
- ✅ Wrapper handles `onCancel` → `onComplete({ action: 'cancel', data: {} })`
- ✅ Wrapper passes `status` to enable loading states
- ✅ All 4 wrappers registered in registry
- ✅ **ReviewSummaryWrapper is fully functional** (NOT placeholder):
  - Reads all collected inputs from workflow state
  - Displays data organized by sections (from YAML task schema)
  - Shows field-level validation/completion status
  - Provides "Edit" and "Confirm" action buttons
  - Handles onEdit → `onComplete({ action: 'edit', data: {} })`
  - Handles onConfirm → `onComplete({ action: 'confirm', data: { confirmed: true } })`
- ✅ Placeholder wrappers (document-upload, data-table) return "Coming soon" message
- ✅ Integration test: Registry → Wrapper → Component flow
- ✅ **POC acceptance met: 2 fully functional components (form + review-summary)**

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

## Task 5F: Chat Section Component

**ID**: COMP-005F
**Priority**: High
**Estimated Time**: 2 hours
**Dependencies**: None

### Description

Create chat interface component with message display, input box, and system message support. This is the primary interface in the right panel.

### Objectives

- Create `components/chat/chat-section.tsx`
- Display message list (user, AI, system messages)
- Input box at bottom with send button
- Auto-scroll to latest message
- Support for system messages (success, error, info, warning)
- Handle dimmed state when overlay active

### Acceptance Criteria

- ✅ Displays all messages in scrollable list
- ✅ User messages right-aligned, AI messages left-aligned
- ✅ System messages styled distinctly (icons, colored backgrounds)
- ✅ Input box fixed at bottom
- ✅ Auto-scrolls to new messages
- ✅ Supports `className` prop for conditional styling (dimmed when overlay)
- ✅ Accessible: proper ARIA labels, keyboard navigation
- ✅ Unit tests for message rendering and auto-scroll

### Files to Create

- `components/chat/chat-section.tsx` - Main chat interface
- `components/chat/message.tsx` - Individual message component
- `components/chat/system-message.tsx` - System message component

### Technical Notes

- Use flexbox with flex-direction: column-reverse for auto-scroll
- Message list in `<div>` with `overflow-y-auto`
- Input box in `<form>` with onSubmit handler
- System messages: different icon per type (✓ success, ✗ error, ⓘ info, ⚠ warning)
- Support markdown in messages (optional P1)

### References

- implement_plan.md: Section 2.2.8 (Chat-First Dynamic UI Architecture)
- strategy.md: Chat-First Dynamic UI Pattern

---

## Task 5G: Form Overlay Component

**ID**: COMP-005G
**Priority**: High (Critical Path)
**Estimated Time**: 2.5 hours
**Dependencies**: Task 3 (Component Registry), Task 5F (Chat Section)

### Description

Create form overlay component that renders forms on top of chat with backdrop, animations, and close triggers. Core component of the chat-first UI pattern.

### Objectives

- Create `components/onboarding/form-overlay.tsx`
- Render form component from registry by componentId
- Backdrop with click-to-close
- Close button (X) and Cancel action
- Escape key handler
- Slide-in/fade-in animation (200-300ms)
- Mobile-responsive (full-screen on mobile, 80% width desktop)
- Accessibility: focus trap, ARIA labels

### Acceptance Criteria

- ✅ Renders component from registry by componentId
- ✅ Backdrop dims background (opacity 0.4-0.6)
- ✅ Click backdrop closes overlay
- ✅ X button closes overlay
- ✅ Escape key closes overlay
- ✅ Slide-in animation on entrance
- ✅ Form container centered, 80% width desktop, full-screen mobile
- ✅ Form container scrollable if content exceeds viewport
- ✅ Focus trapped within overlay when open
- ✅ ARIA: `role="dialog"`, `aria-modal="true"`
- ✅ onSubmit callback with form data
- ✅ onClose callback without data
- ✅ Unit tests for open/close behavior and accessibility

### Files to Create

- `components/onboarding/form-overlay.tsx` - Overlay container

### Technical Notes

- Fixed positioning: `position: fixed; inset: 0;`
- Backdrop: `bg-black/50 backdrop-blur-sm`
- Animation: CSS keyframes for slideIn
- Focus trap: use `useEffect` with `tabIndex` management
- Z-index: `z-50` to ensure overlay above other content
- Error handling: Show error if component not found in registry

### References

- implement_plan.md: Section 2.2.8 (FormOverlay Component)
- strategy.md: Chat-First Dynamic UI Pattern (Overlay Behavior)

---

## Task 5H: Right Panel Refactor (Chat-First)

**ID**: COMP-005H
**Priority**: High (Critical Path)
**Estimated Time**: 1.5 hours
**Dependencies**: Task 5F (Chat Section), Task 5G (Form Overlay)

### Description

Refactor right panel component to implement chat-first pattern with overlay state management. Remove static form section; chat now full-height by default.

### Objectives

- Update `components/layout/right-pane.tsx`
- Remove static form section
- Add overlay state management
- Render ChatSection as default (full height)
- Conditionally render FormOverlay when overlay state active
- Pass overlay props (onSubmit, onClose) to FormOverlay

### Acceptance Criteria

- ✅ Static form section removed
- ✅ ChatSection renders full height by default
- ✅ Overlay state: `{ visible: boolean, componentId: string | null, data: any }`
- ✅ FormOverlay renders conditionally when `visible === true`
- ✅ ChatSection receives `className` prop to dim when overlay active
- ✅ onSubmit handler updates workflow state and closes overlay
- ✅ onClose handler closes overlay without submitting
- ✅ Integration with `useWorkflowState` hook for overlay state
- ✅ Unit tests for state transitions (chat-only → overlay → chat-only)

### Files to Modify

- `components/layout/right-pane.tsx` - Refactor to chat-first

### Technical Notes

- State structure: `{ visible, componentId, data, step }`
- Chat className: `overlayState.visible ? 'opacity-50 pointer-events-none' : 'h-full'`
- onSubmit: update inputs → mark step complete → close overlay → add system message → progress workflow
- onClose: close overlay → add system message ("Form closed. You can resume...")

### References

- implement_plan.md: Section 2.2.8 (Right Panel Component Structure)
- strategy.md: Right Panel Component Structure

---

## Task 5I: Update Workflow Hook for Overlay State

**ID**: COMP-005I
**Priority**: High (Critical Path)
**Estimated Time**: 1 hour
**Dependencies**: Task 4 (Workflow Engine), Task 5H (Right Panel)

### Description

Update `useWorkflowState` hook to expose overlay state management functions and integrate with chat system messages.

### Objectives

- Add overlay state to `useWorkflowState` hook
- Add `showFormOverlay(componentId, data, step)` function
- Add `handleFormSubmit(formData)` function
- Add `handleFormClose()` function
- Add `addSystemMessage(message, type)` function
- Integrate with workflow progression

### Acceptance Criteria

- ✅ Hook exports `overlayState`, `showFormOverlay`, `handleFormSubmit`, `handleFormClose`
- ✅ `showFormOverlay` sets overlay state and adds system message
- ✅ `handleFormSubmit` updates inputs, marks step complete, closes overlay, adds success message, progresses workflow
- ✅ `handleFormClose` closes overlay and adds informational message
- ✅ `addSystemMessage` adds message to chat with type (info, success, error, warning)
- ✅ System messages included in message state
- ✅ Unit tests for overlay state transitions
- ✅ Integration test: full flow (show overlay → submit → progress workflow)

### Files to Modify

- `lib/workflow/hooks.ts` - Add overlay state and handlers

### Technical Notes

- Overlay state: `useState<OverlayState>({ visible: false, componentId: null, data: null, step: null })`
- System messages: Add to messages array with `role: 'system'` and `type: 'info' | 'success' | 'error' | 'warning'`
- handleFormSubmit: sequential operations (update → close → message → progress)
- Error handling: If workflow progression fails, show error message but keep overlay closed

### References

- implement_plan.md: Section 2.2.8 (Overlay State Management)
- strategy.md: Implementation Strategy

---

## Task 5J: Update renderUI Action for Overlay

**ID**: COMP-005J
**Priority**: High (Critical Path)
**Estimated Time**: 30 minutes
**Dependencies**: Task 5I (Workflow Hook Update)

### Description

Update CopilotKit `renderUI` action to trigger overlay instead of inline rendering. Change from `renderAndWaitForResponse` to `handler` pattern.

### Objectives

- Update `renderUI` action in main app component
- Change from returning component to calling `showFormOverlay`
- Return text message instead of JSX
- Remove inline component rendering

### Acceptance Criteria

- ✅ `renderUI` action uses `handler` instead of `renderAndWaitForResponse`
- ✅ Handler calls `showFormOverlay(componentId, data, currentStep)`
- ✅ Handler returns text message: "Opening [component] form. Please complete and submit."
- ✅ No inline JSX rendering
- ✅ Integration test: AI calling renderUI triggers overlay
- ✅ Form opens in overlay, not inline

### Files to Modify

- `app/page.tsx` (or wherever renderUI action is defined)

### Technical Notes

- Old pattern: `renderAndWaitForResponse: ({ args, status }) => <Component />`
- New pattern: `handler: async ({ args }) => { showFormOverlay(...); return "message"; }`
- Ensure `getCurrentStep()` available in scope
- Ensure `showFormOverlay` imported from workflow hook

### References

- implement_plan.md: Section 2.2.8 (Updated renderUI Action Flow)
- CopilotKit docs: Action handlers

---

## Task 6A: Three-Pane Layout Foundation

**ID**: COMP-006A
**Priority**: High
**Estimated Time**: 2 hours
**Dependencies**: None

### Description

Create the base three-pane layout structure with proper flex layout, responsive behavior, and design system styling. This establishes the foundation for the professional context-rich interface.

### Objectives

- Create `ThreePaneLayout` wrapper component with flex structure
- Implement three pane containers: LeftPane, MiddlePane, RightPane
- Apply correct widths (316px | flex-1 | 476px)
- Implement responsive behavior (collapse on < 1024px)
- Apply design system styling (borders, shadows, backgrounds)

### Acceptance Criteria

- ✅ `ThreePaneLayout` component renders three panes side-by-side
- ✅ LeftPane has fixed width of 316px
- ✅ MiddlePane has flex-1 (takes remaining space)
- ✅ RightPane has fixed width of 476px
- ✅ Full viewport height (`h-screen`) layout
- ✅ Responsive: panes collapse on mobile/tablet (< 1024px)
- ✅ Border styling per design system applied
- ✅ No console errors or TypeScript warnings
- ✅ Layout renders empty panes successfully

### Files to Create

- `components/layout/three-pane-layout.tsx` - Main layout wrapper
- `components/layout/left-pane.tsx` - Left pane container (316px)
- `components/layout/middle-pane.tsx` - Middle pane container (flex-1)
- `components/layout/right-pane.tsx` - Right pane container (476px)

### Testing Requirements

- **Visual Test**: Three panes render with correct widths
- **Responsive Test**: Test on mobile (< 768px), tablet (768-1024px), desktop (> 1024px)
- **Component Test**: Each pane accepts children and renders correctly

### Technical Notes

- Use Tailwind classes: `flex h-screen overflow-hidden`
- LeftPane: `w-[316px] border-r border-gray-200 overflow-y-auto`
- MiddlePane: `flex-1 overflow-y-auto bg-gray-50`
- RightPane: `w-[476px] border-l border-gray-200 overflow-hidden flex flex-col`
- Responsive: `lg:flex hidden` for side panes, collapsible on mobile

### References

- design-system.md: Lines 156-176 (Three-Pane Layout Structure)
- Decision D10: Three-Pane Layout decision
- Decision D14: Phased Implementation approach

---

## Task 6B: LeftPane Client List Component

**ID**: COMP-006B
**Priority**: Medium
**Estimated Time**: 2 hours
**Dependencies**: Task 6A (Three-Pane Foundation)

### Description

Implement client list component with folder structure, search functionality, and selection state. This provides context switching between multiple clients.

### Objectives

- Create client list component with folder structure
- Implement search/filter functionality
- Add client selection state management
- Create mock client data for POC
- Apply folder expand/collapse behavior

### Acceptance Criteria

- ✅ Displays "Corporate" and "Individual" folder categories
- ✅ Shows mock clients (Acme Corp, GreenTech Industries) under Corporate
- ✅ Search box filters clients by name
- ✅ Selected client highlighted with background color
- ✅ Folder expand/collapse functionality works
- ✅ Integrates with ThreePaneLayout LeftPane
- ✅ Proper styling per design system (icons, spacing, typography)

### Files to Create

- `components/onboarding/client-list.tsx` - Main client list component
- `components/onboarding/client-folder.tsx` - Folder component with expand/collapse
- `lib/mock-data/clients.ts` - Mock client data for POC

### Testing Requirements

- **Interaction Test**: Click folder to expand/collapse
- **Search Test**: Type in search box, verify filtering
- **Selection Test**: Click client, verify highlight and state update

### Technical Notes

- Mock data structure: `{ id, name, type: 'corporate' | 'individual', status, email, risk }`
- Use `useState` for expanded folders and selected client
- Icons: 📁 for folders, company icon for corporate clients
- Search: Case-insensitive filter on client name
- Colors: Selected = `bg-blue-50`, Hover = `bg-gray-50`

### References

- design-system.md: LeftPane Client List specifications
- Mockup: Left pane showing folder structure

---

## Task 6C: MiddlePane Presentation Layer

**ID**: COMP-006C
**Priority**: High
**Estimated Time**: 3 hours
**Dependencies**: Task 6A (Three-Pane Foundation)

### Description

Create presentation layer components for the middle pane: Profile section, Required Fields section, and Timeline section. These display workflow state and provide context during onboarding.

### Objectives

- Implement ProfileSection showing client info and current status
- Implement RequiredFieldsSection with field completion status
- Implement TimelineSection with workflow events
- Wire all sections to workflow state data
- Apply proper styling and icons

### Acceptance Criteria

- ✅ ProfileSection displays: client name, status, email, risk level, entity type, jurisdiction
- ✅ RequiredFieldsSection shows list of required fields with ☐/☑ status icons
- ✅ Color coding: Green (☑) for complete, Yellow (☐) for pending
- ✅ TimelineSection displays workflow events with timestamps
- ✅ All sections update in real-time with workflow state changes
- ✅ Proper spacing and typography per design system
- ✅ Integrates with ThreePaneLayout MiddlePane

### Files to Create

- `components/onboarding/profile-section.tsx` - Client profile display
- `components/onboarding/required-fields-section.tsx` - Field status list
- `components/onboarding/field-status.tsx` - Individual field status component
- `components/onboarding/timeline-section.tsx` - Event timeline display
- `components/onboarding/timeline-event.tsx` - Individual event component

### Testing Requirements

- **State Update Test**: Change workflow state, verify UI updates
- **Field Status Test**: Complete a field, verify ☐ → ☑ transition
- **Timeline Test**: Progress workflow, verify new events appear

### Technical Notes

- ProfileSection reads from `workflow.machine` and `workflow.inputs`
- RequiredFieldsSection maps over `currentStep.required_fields`
- Field status: Check if field exists in `workflow.inputs` (complete) or not (pending)
- TimelineSection maintains event history in state or derives from `workflow.completedSteps`
- Icons: ☑ (`text-success`), ☐ (`text-warning`)
- Typography: Section headers = `text-lg font-semibold`, Body = `text-sm`

### References

- design-system.md: MiddlePane Presentation Layer specifications
- Mockup: Middle pane showing Profile, Required Fields, Timeline
- useWorkflowState hook: Provides workflow state data

---

## Task 6D: RightPane Chat + Form Overlay

**ID**: COMP-006D
**Priority**: High (Critical Path)
**Estimated Time**: 4 hours
**Dependencies**: Task 6A (Three-Pane Foundation)

### Description

Refactor RightPane to implement chat-first pattern with form overlay. Chat is the default full-height interface; forms appear as modal overlays when triggered by workflow.

### Objectives

- Create ChatSection component with message display and input
- Create FormOverlay component for modal form rendering
- Update RightPane to support overlay state
- Implement overlay animations (slide-in, backdrop)
- Add overlay state management to useWorkflowState hook

### Acceptance Criteria

- ✅ ChatSection displays messages (AI, user, system types)
- ✅ Message input box fixed at bottom of chat
- ✅ Auto-scroll to latest message on new message
- ✅ FormOverlay slides in from right with backdrop
- ✅ Click backdrop or ESC closes overlay
- ✅ Form in overlay renders via component registry
- ✅ Form submission updates workflow state and closes overlay
- ✅ Chat dimmed (`opacity-50`) when overlay active
- ✅ System messages show success/error with icons

### Files to Create

- `components/chat/chat-section.tsx` - Chat interface with messages and input
- `components/chat/message.tsx` - Individual message component
- `components/chat/system-message.tsx` - System message with icons
- `components/onboarding/form-overlay.tsx` - Modal overlay for forms

### Files to Modify

- `lib/hooks/useWorkflowState.tsx` - Add overlay state management
- `components/layout/right-pane.tsx` - Support chat + overlay pattern

### Testing Requirements

- **Chat Test**: Send message, verify it appears in list
- **Overlay Test**: Trigger overlay, verify it opens and form renders
- **Close Test**: Click backdrop, press ESC, verify overlay closes
- **Submission Test**: Submit form, verify workflow state updates

### Technical Notes

- Overlay state: `{ visible: boolean, componentId: string | null, data: any }`
- Chat messages: `{ role: 'ai' | 'user' | 'system', content: string, timestamp: Date, type?: 'info' | 'success' | 'error' }`
- Overlay animations: `transition-transform duration-300 ease-in-out`
- Backdrop: `fixed inset-0 bg-black/50 backdrop-blur-sm z-40`
- Overlay: `fixed right-0 top-0 bottom-0 w-[600px] bg-white shadow-2xl z-50`
- Focus trap: When overlay open, trap focus within overlay

### References

- design-system.md: Chat-First Overlay UI pattern
- Mockup: Right pane showing chat interface
- implement_plan.md: Section 2.2.8 (Chat-First Dynamic UI Architecture)

---

## Task 6E: Integration & Migration ✅ COMPLETED (Simplified Approach)

**ID**: COMP-006E
**Priority**: Critical
**Estimated Time**: 5 hours → Actual: 3 hours
**Dependencies**: Tasks 6A, 6B, 6C, 6D (All three-pane components)
**Status**: ✅ COMPLETED (UI structure only, data integration deferred to Phase 6)

### Description

~~Replace single-pane onboarding page with three-pane layout, migrate form rendering to overlay pattern, implement root page redirect, and conduct comprehensive end-to-end testing.~~

**REVISED APPROACH** (Implemented):
- Phase 1-2: Root redirect ✅
- Phase 3-4: Component foundations ✅
- Phase 5B: Copy working `/test-layout` to `/onboarding` ✅ (Simplified approach)
- Phase 6: Real workflow integration ⏳ (Next task)

**Migration Strategy**: Option A - Root Redirect ✅
- `/` → Redirect to `/onboarding` ✅
- `/onboarding` → Three-pane layout with mock data ✅ (real workflow deferred)
- `/test-layout` → Kept as demo/reference page ✅

### What Was Completed

✅ **Root Page**: Redirect implemented (`app/page.tsx`)
✅ **Onboarding Page**: Three-pane layout structure working
✅ **LeftPane**: Client list with search (uses mock data)
✅ **MiddlePane**: Profile, RequiredFields, Timeline sections (uses mock data)
✅ **RightPane**: Chat + FormOverlay pattern functional
✅ **Form Overlay**: Slides in from right, dims chat, demo form visible
✅ **Build**: Successful with no errors
✅ **Browser Verification**: Screenshots captured, UI working

### What Was Deferred to Phase 6

⏳ Wire client selector to real `useWorkflowState`
⏳ Integrate WorkflowProgress component with real data
⏳ Connect FormOverlay to component registry
⏳ Wire chat messages to workflow events
⏳ End-to-end workflow testing

### Acceptance Criteria (Task 6E)

**Root Page:**
- ✅ `/` redirects to `/onboarding` (instant, no flicker)
- ✅ Redirect component is simple and lightweight

**Onboarding Page - Layout:**
- ✅ Three-pane layout renders correctly
- ✅ LeftPane: Client selector with corporate/individual options
- ✅ MiddlePane: Workflow progress, stage indicator, step info
- ✅ RightPane: Chat + FormOverlay integration

**Onboarding Page - Workflow:**
- ✅ All existing workflow features work (progression, validation, navigation)
- ✅ Stage indicator updates correctly
- ✅ Form submission updates collected inputs
- ✅ Required fields validation works
- ✅ Forms render in overlay (not inline)
- ✅ Chat shows workflow status via system messages

**Client Selection:**
- ✅ Can switch between corporate and individual clients
- ✅ Workflow reloads with appropriate steps for client type
- ✅ Current progress preserved when switching (or cleared with warning)

**Testing:**
- ✅ Complete workflow executes from start to END
- ✅ No console errors or warnings
- ✅ Performance acceptable (60fps scrolling, smooth animations)
- ✅ Layout matches mockup structure

### Files to Create

- `app/page.tsx` - New: Simple redirect component to `/onboarding`
- `components/onboarding/client-selector.tsx` - Client type selector for LeftPane
- `components/onboarding/workflow-progress.tsx` - Workflow progress display for MiddlePane

### Files to Modify

- `app/onboarding/page.tsx` - Replace with ThreePaneLayout
- `lib/hooks/useWorkflowState.tsx` - Add overlay state management (if not already present)

### Files to Backup

- `app/page.tsx` → `app/page-copilotkit-test.tsx.backup` (keep old test page)
- `app/onboarding/page.tsx` → `app/onboarding/page-single-column.tsx.backup`

### Testing Requirements (Modified for Simplified Approach)

- ✅ **Smoke Test**: App loads without errors
- ✅ **UI Test**: Three-pane layout renders correctly
- ✅ **Interaction Test**: Form overlay opens/closes correctly
- ⏳ **Workflow Test**: Complete onboarding flow (deferred to Task 6F)

---

## Task 6F: CSS Loading Verification & Visual QA

**ID**: COMP-006F
**Priority**: Critical
**Estimated Time**: 30 minutes
**Dependencies**: Task 6E (Three-pane UI structure)
**Status**: ⏳ NOT STARTED

### Description

Verify that Tailwind CSS is properly configured, loading, and rendering the design system styles. This task addresses the gap identified between implemented styling and actual runtime rendering.

**Issue Context**: Gap analysis revealed discrepancy between extensive Tailwind CSS code and unstyled screenshot. This task verifies CSS loading and documents actual visual state.

### Objectives

1. Verify Tailwind CSS configuration is correct
2. Confirm CSS files are loading in browser
3. Take screenshots of actual styled UI
4. Document any CSS loading or rendering issues
5. Compare actual vs. expected visual appearance

### Acceptance Criteria

**Configuration**:
- [ ] `app/layout.tsx` imports `globals.css`
- [ ] `globals.css` contains Tailwind directives (`@tailwind base`, `@tailwind components`, `@tailwind utilities`)
- [ ] `tailwind.config.ts` includes correct content paths
- [ ] `postcss.config.mjs` is properly configured

**Runtime Verification**:
- [ ] Development server starts without CSS errors
- [ ] Browser Network tab shows `globals.css` loaded (200 OK)
- [ ] Browser DevTools shows Tailwind classes applied to elements
- [ ] No console errors related to CSS

**Visual Verification**:
- [ ] `/test-layout` route displays with proper styling
- [ ] `/onboarding` route displays with proper styling
- [ ] Screenshot taken of `/onboarding` showing styled UI
- [ ] Screenshot matches design system specifications:
  - Blue/gray color scheme visible
  - Borders between panes rendered
  - Rounded corners on inputs/buttons
  - Shadows on overlays
  - Hover states work

**Documentation**:
- [ ] Screenshots added to `task_composable_onboarding/debug/screenshots/`
- [ ] `changes.md` updated with verification results
- [ ] Any CSS issues documented in gap analysis

### Implementation Steps

1. **Verify Configuration Files** (5 min):
   ```bash
   # Check layout imports CSS
   grep -n "globals.css" explore_copilotkit/app/layout.tsx

   # Check Tailwind directives
   cat explore_copilotkit/app/globals.css | grep "@tailwind"

   # Check Tailwind config content paths
   grep -A 5 "content:" explore_copilotkit/tailwind.config.ts
   ```

2. **Start Development Server** (5 min):
   ```bash
   cd explore_copilotkit
   npm run dev
   ```

3. **Browser Inspection** (10 min):
   - Open http://localhost:3000/test-layout
   - Open Browser DevTools (F12)
   - Network tab → Filter CSS → Verify `globals.css` loads
   - Elements tab → Inspect components → Verify Tailwind classes present
   - Console tab → Check for errors

4. **Visual Documentation** (10 min):
   - Take screenshot of `/test-layout` page
   - Take screenshot of `/onboarding` page
   - Take screenshot of form overlay opened
   - Save to `task_composable_onboarding/debug/screenshots/`
   - Name format: `YYYY-MM-DD_route-name_description.png`

### Files to Check

**Configuration Files**:
- `explore_copilotkit/app/layout.tsx` - CSS import
- `explore_copilotkit/app/globals.css` - Tailwind directives
- `explore_copilotkit/tailwind.config.ts` - Content paths
- `explore_copilotkit/postcss.config.mjs` - PostCSS config

**Route Files**:
- `explore_copilotkit/app/test-layout/page.tsx` - Test page
- `explore_copilotkit/app/onboarding/page.tsx` - Main page

### Common Issues & Solutions

**Issue 1: CSS Not Loading**
- **Symptom**: Network tab shows 404 for CSS file
- **Solution**: Check `import './globals.css'` in `app/layout.tsx`

**Issue 2: Tailwind Classes Not Applied**
- **Symptom**: Classes in DOM but no styles rendered
- **Solution**: Check `tailwind.config.ts` content paths include `app/**/*.{js,ts,jsx,tsx}`

**Issue 3**: Purged Classes**
- **Symptom**: Some Tailwind classes missing in production
- **Solution**: Check if dynamic classes are in safelist

**Issue 4: PostCSS Not Processing**
- **Symptom**: Raw Tailwind directives in CSS
- **Solution**: Verify `postcss.config.mjs` includes `tailwindcss` and `autoprefixer`

### Expected vs. Actual Comparison

**Expected Appearance** (from code):
- Three panes with borders: `border-r border-gray-200`, `border-l border-gray-200`
- Blue primary buttons: `bg-blue-600 hover:bg-blue-700`
- Gray backgrounds: `bg-gray-50`, `bg-white`
- Rounded corners: `rounded-md`, `rounded-lg`
- Shadows: `shadow-lg`, `shadow-xl`
- Typography: `text-2xl font-bold`, `text-lg font-semibold`

**Document Actual Appearance**:
- [ ] Borders visible between panes?
- [ ] Button colors correct (blue-600)?
- [ ] Backgrounds colored (not white everywhere)?
- [ ] Rounded corners visible?
- [ ] Shadows appear on overlays?
- [ ] Font sizes/weights correct?

### Rollback Plan

If CSS loading is broken:
1. Check git history for last working CSS configuration
2. Compare current vs. working configuration files
3. Restore working configuration if needed
4. Document changes that broke CSS

### References

- Gap Analysis: `task_composable_onboarding/debug/analysis/ui_styling_gap_analysis.md`
- Design System: `task_composable_onboarding/plan/design-system.md`
- Tailwind Docs: https://tailwindcss.com/docs/configuration

---

## Task 6F-BUG: CSS Styling Fix (Tailwind v4 Migration)

**ID**: COMP-006F-BUG
**Priority**: P0 Critical (Blocker)
**Estimated Time**: 1.5 hours
**Actual Time**: 1 hour
**Dependencies**: Task 6E (Three-pane UI structure)
**Status**: ✅ COMPLETE

### Description

**Bug**: Tailwind CSS utility classes not applying (0% success rate). Analysis revealed Tailwind v4 packages installed with v3 configuration format.

**Root Cause**: v4 requires CSS-based configuration (`@import`, `@theme`, `@source`) instead of `tailwind.config.ts`.

### Fix Applied

**Changes**:
1. Migrated `app/globals.css` to v4 format
2. Deleted obsolete `tailwind.config.ts`
3. Verified PostCSS config (already correct)

### Verification Results

**Playwright Testing**:
- Before: 0/7 Tailwind classes working (0%)
- After: 7/7 Tailwind classes working (100%) ✅
- CSS size: 3.4KB → 8.4KB (+147%)

**Visual QA**: ✅ All 33 planned styles now apply correctly

### Files Changed

- `explore_copilotkit/app/globals.css` (updated to v4)
- `explore_copilotkit/tailwind.config.ts` (deleted)

### References

- Bug workspace: `task_styling_apply/`
- Implementation: `task_styling_apply/debug/fix/fix.md`
- Branch: `feature/fix-tailwind-v4-config`
- Commit: `20c4d6c`

---

## Task 6G: Real Workflow Integration

**ID**: COMP-006G
**Priority**: High
**Estimated Time**: 3-4 hours
**Dependencies**: Task 6F-BUG (CSS Fix)
**Status**: ⏳ NOT STARTED

### Description

Integrate real workflow state and component registry with the three-pane layout UI. Replace mock data with actual workflow execution, connect form overlay to component registry, and enable end-to-end workflow progression.

### Objectives

1. **Wire Client Selector** (1 hour)
   - Remove ClientList mock component
   - Add simple client type toggle (Corporate/Individual)
   - Connect to `useWorkflowState({ client_type })`
   - System messages on type switch

2. **Integrate Real Workflow State** (1 hour)
   - Replace ProfileSection/RequiredFieldsSection/TimelineSection
   - Use WorkflowProgress component (already created in Task 6E Phase 3-4)
   - Display real workflow steps, progress, completion status
   - Show current step title and description

3. **Connect Form Overlay to Registry** (1-2 hours)
   - Replace demo form with component from registry
   - Use `getComponent(currentStep.component_id)`
   - Wire `workflow.inputs`, `workflow.updateInput`
   - Connect Submit button to `workflow.goToNextStep()`
   - Display real `workflow.validationErrors`
   - Show `workflow.missingFields`

4. **Workflow Event Messages** (30 minutes)
   - Add system messages for workflow events
   - Message on step completion
   - Message on validation failure
   - Message on client type switch

5. **End-to-End Testing** (30 minutes)
   - Test complete workflow from start to finish
   - Verify client type switching works
   - Verify form validation prevents progression
   - Verify state persistence (auto-save)
   - Verify completion screen appears

### Acceptance Criteria

**Workflow State:**
- [ ] `useWorkflowState` hook integrated and working
- [ ] Client type selector switches between corporate/individual workflows
- [ ] Workflow reloads correctly on client type change
- [ ] Progress bars show correct percentages
- [ ] Step list highlights current step

**Form Integration:**
- [ ] Forms load from component registry
- [ ] Form inputs update `workflow.inputs`
- [ ] Submit button progresses workflow
- [ ] Validation errors display correctly
- [ ] Required fields prevent progression

**End-to-End:**
- [ ] Can complete full corporate workflow
- [ ] Can complete full individual workflow
- [ ] Completion screen appears at end
- [ ] Can restart workflow
- [ ] No console errors

**Testing:**
- [ ] Build passes with no errors
- [ ] All TypeScript types correct
- [ ] Browser testing confirms functionality
- [ ] Performance acceptable

### Files to Modify

- `app/onboarding/page.tsx` - Replace mock data with real workflow state
- Remove/cleanup mock data imports

### Definition of Done

- [ ] `/onboarding` uses real workflow (not mocks)
- [ ] Forms from component registry render in overlay
- [ ] Complete workflow progression works
- [ ] Client type switching functional
- [ ] Build successful, no errors
- [ ] Browser tested and verified
- **Validation Test**: Submit form with missing fields, verify validation
- **Navigation Test**: Use Back/Next buttons, verify state consistency
- **Responsive Test**: Test on mobile, tablet, desktop viewports
- **Performance Test**: Check frame rate during scroll and animations
- **Visual QA**: Compare with mockup, verify spacing, colors, typography

### Technical Notes

**Migration Steps:**
1. **Backup files:**
   ```bash
   cp app/page.tsx app/page-copilotkit-test.tsx.backup
   cp app/onboarding/page.tsx app/onboarding/page-single-column.tsx.backup
   ```

2. **Root Page Redirect:**
   - Create simple redirect component: `redirect('/onboarding')`
   - Use Next.js `redirect()` from `next/navigation`
   - Server component (no 'use client' needed)

3. **Client Selector:**
   - Create `ClientSelector` component with radio buttons or toggle
   - Options: Corporate / Individual
   - Display in LeftPane header area
   - On change: reload workflow with new client_type
   - Warn user if progress exists (optional: preserve state)

4. **Onboarding Page Layout:**
   - Import ThreePaneLayout and all Task 6 components
   - **LeftPane**: ClientSelector + workflow step list
   - **MiddlePane**: Current step info + StageIndicator + ProgressBar
   - **RightPane**: ChatSection + FormOverlay integration

5. **Form Overlay Integration:**
   - Keep existing form rendering logic
   - Wrap rendered component in FormOverlay when step requires form
   - Chat shows system messages for workflow events
   - Form submission triggers overlay close + state update

6. **Rollback Commands:**
   ```bash
   cp app/page-copilotkit-test.tsx.backup app/page.tsx
   cp app/onboarding/page-single-column.tsx.backup app/onboarding/page.tsx
   ```

### Rollback Criteria

- Workflow progression stops working
- Form validation fails
- State management corrupts data
- Performance below 30fps
- Critical functionality broken

### References

- implement_plan.md: Section 4 (Implementation Status Update)
- Decision D14: Risk mitigation and rollback procedures
- ui_layout_gap_analysis.md: Complete gap analysis

---

## Task 7: End-to-End Integration

**ID**: COMP-007
**Priority**: High (Critical Path)
**Estimated Time**: 1 hour
**Dependencies**: All previous tasks (1-6E)

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

## Task 8: Documentation

**ID**: COMP-008
**Priority**: Medium
**Estimated Time**: 1 hour
**Dependencies**: Task 7 (Integration complete)

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
