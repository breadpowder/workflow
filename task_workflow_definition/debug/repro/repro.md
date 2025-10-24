# Bug Reproduction: Form Rendering Issue

**Bug ID**: workflow_definition-form-rendering
**Severity**: Medium (affects user experience but workflow is functional)
**Reported**: 2025-10-24
**Environment**: localhost:3002

---

## Issue Description

After clicking "Open Current Step Form" button, the form overlay opens but displays either:
1. **Wrong form content** - Shows a form for a different step than the client's `currentStepId`
2. **Empty form** - No form fields, labels, or submit buttons render at all

**Expected Behavior**:
- If client is on step `collectContactInfo` → Should show Contact Info form with 5 fields and "Continue" button
- If client is on step `collectDocuments` → Should show Document Upload form with 2 file upload fields and "Continue to Review" button
- If client is on step `review` → Should show Review Summary with approval table

**Actual Behavior**:
- Form overlay opens but appears empty or shows incorrect form content
- Form may close immediately (auto-close effect triggers incorrectly)
- Submit buttons may not render or have wrong labels

---

## Reproduction Steps

### Prerequisites
```bash
# Start dev server
cd explore_copilotkit
PORT=3002 npm run dev
```

### Manual Reproduction (from user's screenshot)
1. Navigate to `http://localhost:3002/onboarding`
2. Wait 30 seconds for full UI load
3. Select "Acme Corp" from client list (left pane)
4. Verify Workflow Status section shows "0 of 5 fields" (pending)
5. Click "Open Current Step Form" button (bottom right, blue)
6. **OBSERVE**: Form overlay should show "Corporate Contact Information" with 5 fields
7. Fill out all required fields (legal_name, entity_type, jurisdiction, business_email, business_phone)
8. Click "Continue to Documents" button
9. **BUG**: Form should show document upload fields BUT instead shows wrong content or empty form

### Automated Reproduction (Playwright Test)
```bash
# Test reproduces the issue automatically
cd ~/.claude/skills/playwright-skill/skills/playwright-skill
node run.js /tmp/playwright-test-form-rendering-bug-v2.js
```

**Test Results**:
- ✅ Client selection works
- ✅ Workflow Status section visible
- ✅ "Open Current Step Form" button clickable
- ❌ **CRITICAL ISSUE**: Form overlay opens but NO form content visible
  - No form title found
  - No labels visible (expected: 5 labels for contact info fields)
  - No submit buttons visible (expected: "Continue" button)
  - Only strange UUID button: "×bd5c9079-929b-4d55-bdc9-16d1c8181b71!"

**Client State at Time of Bug**:
```json
{
  "clientId": "corp-001",
  "currentStepId": "collectContactInfo",  // Should show contact form
  "currentStage": null,
  "completedSteps": [],
  "collectedInputs": {}
}
```

---

## Evidence

### Screenshots
- **Pre-bug**: `/home/zineng/workspace/workflow/ui-capture/bug-test-01-acme-selected.png`
  - Shows Workflow Status with 5 pending fields (correct)
  - "Open Current Step Form" button visible (correct)

- **Bug state**: `/home/zineng/workspace/workflow/ui-capture/bug-test-02-form-overlay.png`
  - Form overlay is open (backdrop visible)
  - NO form content visible (BUG!)
  - Chat shows "Form closed" message

- **User screenshot**: `/home/zineng/Pictures/Screenshots/2_continue_docs.png`
  - Shows "Corporate Contact Information" form (correct initial render)
  - Form has all 5 fields visible (correct)
  - Submit button says "Continue to Documents" (correct label)
  - **Issue occurs AFTER clicking this button**

### API State Verification
```bash
# Fetch client state via API
curl "http://localhost:3002/api/client-state?clientId=corp-001"

# Result:
{
  "currentStepId": "collectContactInfo",  // Correct step
  "currentStage": null,                   // NULL stage (potential issue?)
  "completedSteps": [],
  "collectedInputs": {}
}
```

**Observation**: `currentStage` is `null` but workflow expects `"information_collection"` (from YAML definition)

---

## Affected Components

### Frontend Components
- `app/onboarding/page.tsx:324-404` - FormOverlay rendering logic
- `components/workflow/GenericForm.tsx` - Form component that renders fields
- `components/onboarding/form-overlay.tsx` - Overlay container

### State Management
- `lib/hooks/useWorkflowState.tsx:115-460` - Workflow state hook
  - `currentStep` derivation (line 322-324)
  - `goToNextStep()` transition logic (line 402-460)
  - Auto-close effect (app/onboarding/page.tsx:204-211)

### Data Loading
- `app/api/workflows/route.ts` - Workflow compilation endpoint
- `lib/workflow/loader.ts:343-392` - Workflow compilation logic
- `lib/workflow/engine.ts` - Step transition execution

---

## Hypothesis

Based on code analysis, potential root causes:

### Theory 1: Race Condition in Step Transition
**Symptom**: Form closes immediately after opening
**Possible Cause**: The `useEffect` at `app/onboarding/page.tsx:204-211` auto-closes overlay when `workflow.currentStepId` changes:

```typescript
useEffect(() => {
  if (overlayOpen && !workflow.isTransitioning && workflow.currentStepId &&
      workflow.currentStepId !== previousStepIdRef.current) {
    previousStepIdRef.current = workflow.currentStepId;
    handleCloseOverlay();  // BUG: Closes overlay prematurely?
  }
}, [workflow.currentStepId, workflow.isTransitioning, overlayOpen]);
```

**Issue**: If `currentStepId` updates during form submission, overlay closes before new form renders

### Theory 2: Schema Not Loading for New Step
**Symptom**: Form renders but shows no fields/buttons
**Possible Cause**: When transitioning from `collectContactInfo` → `collectDocuments`, the `workflow.currentStep.schema` may be stale or undefined

**Critical Code Path**:
```typescript
// app/onboarding/page.tsx:349
schema={workflow.currentStep.schema || { fields: [] }}
```

If `workflow.currentStep.schema` is `undefined` or hasn't updated yet, form renders with `{ fields: [] }` (empty form!)

### Theory 3: Stage Initialization Issue
**Symptom**: `currentStage` is `null` instead of `"information_collection"`
**Possible Cause**: Client state initialization doesn't set `currentStage` properly

**Evidence**:
- Workflow YAML defines: `stage: information_collection` for `collectContactInfo` step
- Client state shows: `"currentStage": null`
- Hook initialization (line 250): `const initialStage = loadedMachine.steps[0]?.stage;` should work

**Potential Issue**: When client state is loaded from disk (existing client), the `currentStage` isn't updated to match the step's stage

---

## Impact Assessment

**User Impact**: MEDIUM
- Users can complete workflows if they don't encounter the bug path
- If bug occurs, users are stuck (form doesn't render, can't proceed)
- No data loss (client state persists)
- Workaround exists: Reload page to reset state

**Frequency**: UNKNOWN (needs more testing)
- Reproduced consistently in automated tests
- User reported issue with screenshot evidence
- May affect all corporate clients at certain steps

**Affected Users**:
- All corporate clients transitioning between workflow steps
- Potentially affects individual clients too (not tested yet)

---

## Next Steps

See `debug/analysis/rca.md` for root cause analysis.
See `debug/plan/plan.md` for fix strategy and implementation tasks.
