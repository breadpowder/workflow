# Composable Onboarding POC - Implementation Reference

**Companion to**: tasks.md
**Purpose**: Integration patterns, API references, and file locations for each task
**Status**: Simplified Reference (code details in actual files)

---

## Task 1: Self-Hosted CopilotKit Runtime

**Reference**: tasks.md COMP-001
**Status**: ✅ COMPLETED

### Key Integration Pattern

**CopilotKit Self-Hosted Runtime Setup:**
- Initialize `CopilotRuntime` with `OpenAIAdapter`
- Create Next.js API route at `/api/copilotkit`
- Use `copilotRuntimeNextJSAppRouterEndpoint` for request handling
- Set 120s timeout for long-running operations

### Critical API Calls

```typescript
// Runtime initialization pattern
const openai = new OpenAI({ apiKey, timeout: 120000 });
const serviceAdapter = new OpenAIAdapter({ openai });
const runtime = new CopilotRuntime();
```

### 3rd Party References

- **CopilotKit**: `@copilotkit/runtime`, `@copilotkit/react-core`
- **OpenAI**: `openai` package for LLM integration
- **Next.js**: App Router API route handlers

### Implementation Files

- `app/api/copilotkit/route.ts` - Runtime endpoint
- `.env.local` - OPENAI_API_KEY configuration

### Validation

- Dev server runs without errors
- Chat interface connects to runtime
- AI responses stream correctly

---

## Task 2: Two-Stage YAML Workflow Loader

**Reference**: tasks.md COMP-002
**Status**: ✅ COMPLETED

### Key Integration Pattern

**Two-Stage Loading (Workflows → Tasks):**
1. Load workflow YAML from `data/workflows/` (defines step sequence)
2. Load task YAML from `data/tasks/` (defines component + fields per step)
3. Compile into `CompiledWorkflowMachine` with resolved task definitions

**Schema Hierarchy:**
- `WorkflowDefinition` - high-level flow, applies_to, step sequence
- `TaskDefinition` - step-level component_id, required_fields, schema
- `CompiledWorkflowStep` - merged step + task data for runtime use

### Critical API Calls

```typescript
// Loader functions
const workflowDefs = await loadWorkflows();
const workflow = pickApplicableWorkflow(workflowDefs, { client_type, jurisdiction });
const machine = compileRuntimeMachine(workflow);

// Engine functions
const currentStep = machine.steps[currentStepIndex];
const nextId = nextStepId(currentStep, inputs);
const missing = missingRequiredFields(currentStep, inputs);
const canProgress = missing.length === 0;
```

### 3rd Party References

- **yaml**: YAML parsing (`yaml` npm package)
- **Next.js**: File system access with `fs/promises`
- **TypeScript**: Zod for schema validation (optional)

### Implementation Files

- `lib/workflow/schema.ts` - TypeScript interfaces
- `lib/workflow/loader.ts` - YAML file loading
- `lib/workflow/engine.ts` - Runtime compilation and execution
- `data/workflows/*.yaml` - Workflow definitions
- `data/tasks/**/*.yaml` - Task definitions

### Validation

- YAML files parse without errors
- Workflow selects correct flow based on client_type/jurisdiction
- Required fields validation works
- Conditional navigation evaluates correctly

---

## Task 3: Component Registry

**Reference**: tasks.md COMP-003
**Status**: ✅ COMPLETED

### Key Integration Pattern

**Dynamic Component Resolution:**
- YAML specifies `component_id: "form"`, not imports
- Registry maps `component_id → React.ComponentType`
- Actions/UI code calls `getComponent(componentId)` dynamically
- Supports custom components per task without code changes

**Registry Structure:**
```
Registry: { [componentId: string]: React.ComponentType<any> }
└─ "form" → FormRenderer
└─ "document_upload" → DocumentUpload
└─ "verification" → VerificationComponent
```

### Critical API Calls

```typescript
// Registry access
import { getComponent } from '@/lib/components/registry';

// Usage in workflow rendering
const Component = getComponent(currentStep.component_id);
if (!Component) {
  return <ErrorFallback message="Unknown component" />;
}
return <Component {...props} />;
```

### 3rd Party References

- **React**: Dynamic component rendering
- **TypeScript**: Type-safe registry with generics

### Implementation Files

- `lib/components/registry.ts` - Component registry map
- `components/workflow/step-renderer.tsx` - Uses registry to render steps
- `components/forms/form-renderer.tsx` - Example registered component
- `components/documents/document-upload.tsx` - Example registered component

### Validation

- Registry returns correct component for valid IDs
- Unknown component IDs handled gracefully (fallback UI)
- Components receive correct props from workflow engine

---

## Task 6: End-to-End Integration

**Reference**: tasks.md COMP-006
**Status**: 🔄 IN PROGRESS (Task 6E Complete, Task 6F Pending)

### Overview

End-to-end integration combines all previous tasks into a working onboarding flow with three-pane UI layout.

**Completed Phases:**
- ✅ Phase 1-2: Root redirect, basic routing
- ✅ Phase 3-4: ClientSelector and WorkflowProgress components
- ✅ Phase 5: Three-pane layout with mock data (UI/UX proof)

**Pending Phase:**
- ⏳ Phase 6 (Task 6F): Wire real workflow state to UI components

---

### Task 6E: Integration & Migration

**Status**: ✅ COMPLETED (Simplified Approach)

#### Key Integration Pattern

**Three-Pane Layout with Chat + Form Overlay:**

```
┌──────────────┬─────────────────────┬──────────────┐
│  LeftPane    │    MiddlePane       │  RightPane   │
│  (316px)     │    (flex-1)         │  (476px)     │
│              │                     │              │
│ ClientList   │ ProfileSection      │ ChatSection  │
│ + Search     │ RequiredFields      │ + Messages   │
│              │ TimelineSection     │ + Input      │
│              │                     │              │
│              │                     │ FormOverlay  │
│              │                     │ (slides in)  │
└──────────────┴─────────────────────┴──────────────┘
```

**Implementation Approach:**
- Copied working `/test-layout` → `/onboarding` (proven UI structure)
- Uses mock data for client list, fields, timeline, messages
- Root page (`/`) redirects to `/onboarding`

#### Critical Components

**Created:**
- `components/onboarding/client-selector.tsx` - Client type toggle (Corporate/Individual)
- `components/onboarding/workflow-progress.tsx` - Progress display with steps and stages

**Used from test-layout:**
- `components/layout/three-pane-layout.tsx` - Container with fixed widths
- `components/layout/left-pane.tsx`, `middle-pane.tsx`, `right-pane.tsx` - Pane wrappers
- `components/onboarding/client-list.tsx` - Client list with search
- `components/onboarding/profile-section.tsx` - Client profile display
- `components/onboarding/required-fields-section.tsx` - Field status checklist
- `components/onboarding/timeline-section.tsx` - Activity timeline
- `components/chat/chat-section.tsx` - Chat UI with message history
- `components/onboarding/form-overlay.tsx` - Slide-in form overlay pattern

#### Implementation Files

- `app/page.tsx` - Root redirect to `/onboarding`
- `app/onboarding/page.tsx` - Three-pane layout with mock data
- `components/onboarding/client-selector.tsx` - Client type switcher
- `components/onboarding/workflow-progress.tsx` - Progress visualization

**Backup Files:**
- `app/page-copilotkit-test.tsx.backup` - Previous CopilotKit test page
- `app/onboarding/page-single-column.tsx.backup` - Previous single-column layout

#### Validation

**Browser Verification (MCP Browser Tools):**
- ✅ Three-pane layout renders correctly
- ✅ Client list displays with search functionality
- ✅ Client selection updates middle pane
- ✅ Profile, required fields, timeline sections populate
- ✅ Chat section shows messages and input
- ✅ Form overlay slides in from right
- ✅ Chat dims when overlay is open
- ✅ Form overlay closes correctly
- ✅ No console errors

**Build Verification:**
```bash
npm run build  # ✅ Successful
```

#### What's Mock (Deferred to Phase 6)

- Client data (from `lib/mock-data/clients`)
- Required fields (hardcoded list)
- Timeline events (generated from client metadata)
- Form fields (demo contact form)
- Chat AI responses (simulated, not real CopilotKit)

---

### Task 6F: Real Workflow Integration

**Status**: ⏳ READY TO START
**Estimated**: 3-4 hours

#### Objectives

1. **Wire Client Selector** (1 hour)
   - Connect to `useWorkflowState` hook
   - Trigger workflow reload on client type change
   - Pass `client_type` to `pickApplicableWorkflow`

2. **Integrate WorkflowProgress** (1 hour)
   - Replace mock data with real `currentStep`, `machine.steps`
   - Display `currentStep.task_definition.name` as current step
   - Show progress: `currentStepIndex / totalSteps * 100`
   - Map workflow steps to stage indicator

3. **Connect Form Overlay** (1-2 hours)
   - Replace demo form with `getComponent(currentStep.component_id)`
   - Pass workflow state as props to form component
   - Handle form submission → `updateWorkflowInputs(data)`
   - Trigger `progressWorkflow()` on successful validation

4. **Add Workflow Event Messages** (30 min)
   - System messages for step transitions
   - Validation error messages
   - Success messages on completion

5. **End-to-End Testing** (30 min)
   - Complete full workflow from start to END
   - Test both Corporate and Individual flows
   - Verify all required fields prevent progression
   - Verify build passes with no errors

#### Integration Patterns

**Workflow State Hook Usage:**
```typescript
const {
  currentStep,
  machine,
  canProgress,
  progressWorkflow,
  updateWorkflowInputs,
  missingFields,
  currentStepIndex,
} = useWorkflowState({
  client_type: 'corporate',
  jurisdiction: 'us_delaware',
});
```

**Form Component Rendering:**
```typescript
const FormComponent = getComponent(currentStep.component_id);

<FormOverlay isOpen={overlayOpen} onClose={handleClose}>
  <FormComponent
    schema={currentStep.schema}
    requiredFields={currentStep.required_fields}
    onSubmit={(data) => {
      updateWorkflowInputs(data);
      if (canProgress) {
        progressWorkflow();
        handleClose();
      }
    }}
  />
</FormOverlay>
```

**Required Fields Integration:**
```typescript
const requiredFields = currentStep.required_fields?.map((fieldName) => ({
  name: fieldName,
  label: fieldName.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
  completed: !!workflowInputs[fieldName],
  description: currentStep.schema?.properties?.[fieldName]?.description,
})) || [];
```

#### Success Criteria

- [ ] Client type switching triggers correct workflow
- [ ] WorkflowProgress shows real step data
- [ ] Form overlay renders component from registry
- [ ] Form submission updates workflow state
- [ ] Validation prevents progression when fields missing
- [ ] Complete workflow reaches END state
- [ ] Chat shows workflow event messages
- [ ] Build passes with no TypeScript errors
- [ ] No console errors in browser

#### Implementation Files (Phase 6)

Files to modify:
- `app/onboarding/page.tsx` - Replace mock data with `useWorkflowState`
- `components/onboarding/workflow-progress.tsx` - Accept real step data as props
- `components/onboarding/client-selector.tsx` - Wire to workflow state hook

Files to reference:
- `lib/workflow/use-workflow-state.ts` - Workflow state hook
- `lib/components/registry.ts` - Component registry
- `lib/workflow/engine.ts` - Workflow engine functions

---

## Summary

**Implementation Pattern Hierarchy:**

1. **CopilotKit Runtime** → Self-hosted AI integration
2. **YAML Loader** → Business-editable workflows and tasks
3. **Component Registry** → Dynamic UI without code changes
4. **Three-Pane Layout** → Chat-first UI with form overlays
5. **Workflow State Hook** → React state management for workflow execution
6. **End-to-End Integration** → All patterns working together

**Current Status:**

- ✅ Tasks 1-3: Foundation complete (runtime, loader, registry)
- ✅ Task 6E: UI/UX structure complete (three-pane layout with mock data)
- ⏳ Task 6F: Data integration pending (wire real workflow to UI)

**Next Step:** Task 6F - Real Workflow Integration (3-4 hours)

---

*This reference focuses on integration patterns and API calls. For implementation code details, refer to the actual source files listed in each section.*
