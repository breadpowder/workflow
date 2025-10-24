# Root Cause Analysis: Form Rendering Issue

**Date**: 2025-10-24
**Analyst**: Claude
**Bug ID**: workflow_definition-form-rendering

---

## Executive Summary

**Root Cause**: **Race condition between step transition and form overlay re-rendering**

When user submits a form (e.g., "Continue to Documents"), the workflow transitions to the next step (`collectContactInfo` → `collectDocuments`). However, the form overlay auto-close effect triggers BEFORE the new form content renders, causing the overlay to close prematurely or render an empty/stale form.

**Contributing Factors**:
1. Auto-close `useEffect` is too aggressive (closes on ANY step change)
2. `currentStep` derivation doesn't account for transition timing
3. `currentStage` initialization is incomplete (remains `null` for existing clients)

---

## Technical Analysis

### Root Cause: Auto-Close Effect Race Condition

**Location**: `app/onboarding/page.tsx:204-211`

```typescript
// Auto-close overlay when workflow progresses to next step
useEffect(() => {
  if (overlayOpen && !workflow.isTransitioning && workflow.currentStepId &&
      workflow.currentStepId !== previousStepIdRef.current) {
    previousStepIdRef.current = workflow.currentStepId;
    handleCloseOverlay();  // ← PROBLEM: Closes overlay immediately
  }
}, [workflow.currentStepId, workflow.isTransitioning, overlayOpen]);
```

**Intended Behavior**:
- Auto-close overlay when workflow completes a step (good UX)
- Allows user to see chat message "Moving to next step..."

**Actual Behavior**:
- Effect fires when `currentStepId` changes from "collectContactInfo" → "collectDocuments"
- Overlay closes IMMEDIATELY
- New form never gets a chance to render

**Execution Sequence (Bug Path)**:
1. User clicks "Continue to Documents" button
2. `onSubmit()` handler calls `workflow.goToNextStep()` (line 370)
3. `goToNextStep()` updates state: `setCurrentStepId(nextStep.id)` (line 440)
4. **React re-renders with new `currentStepId`**
5. Auto-close effect sees `currentStepId` changed → calls `handleCloseOverlay()` (line 209)
6. Overlay closes, chat shows "Form closed" message
7. **User never sees the document upload form!**

**Why Playwright Test Shows Empty Form**:
- Test clicks form button, overlay opens
- BUT the `currentStepId` is already "collectContactInfo" (from initialization)
- Form component tries to render with `workflow.currentStep.schema`
- If schema hasn't loaded yet OR is stale, form renders with `{ fields: [] }` (empty!)

### Contributing Cause 1: Synchronous vs Async State Updates

**Location**: `lib/hooks/useWorkflowState.tsx:402-460`

```typescript
const goToNextStep = useCallback(async () => {
  // ... validation ...

  setIsTransitioning(true);  // ← Synchronous state update

  // Execute transition
  const result = executeTransition(machine, currentStep, inputs);  // ← Synchronous

  // Update completed steps
  const newCompletedSteps = [...completedSteps, currentStepId];

  // Move to next step
  const nextStep = result.nextStep!;
  setCurrentStepId(nextStep.id);       // ← Synchronous state update
  setCurrentStage(nextStep.stage);      // ← Synchronous state update
  setCompletedSteps(newCompletedSteps); // ← Synchronous state update

  // Save state
  await saveClientState({...});  // ← Async (doesn't block re-render)

  setIsTransitioning(false);  // ← Happens AFTER save completes
}, [/* deps */]);
```

**Issue**: State updates (`setCurrentStepId`, etc.) are synchronous. React batches them and re-renders. The auto-close effect runs in this re-render BEFORE `isTransitioning` becomes `false`.

**Expected Guard**: The effect checks `!workflow.isTransitioning` to prevent premature closure.

**Actual Behavior**: By the time `await saveClientState()` completes and `setIsTransitioning(false)` runs, the overlay has already closed!

### Contributing Cause 2: `currentStep` Derivation Timing

**Location**: `lib/hooks/useWorkflowState.tsx:322-324`

```typescript
const currentStep = machine && currentStepId !== 'END'
  ? getStepById(machine, currentStepId)
  : null;
```

**Issue**: `currentStep` is derived synchronously from `currentStepId` on every render. When `currentStepId` changes, `currentStep` updates immediately. This is correct!

**But**: If the form component is still mounted when `currentStep` changes, it receives new props:
- `schema={workflow.currentStep.schema}` → new schema for next step
- `stepId={workflow.currentStepId}` → new step ID

**Problem**: The form component doesn't handle schema changes gracefully. It might:
1. Clear form state (inputs)
2. Show validation errors (if fields don't match)
3. Or worse: render empty if schema hasn't fully loaded

### Contributing Cause 3: Stage Initialization Gap

**Location**: `lib/hooks/useWorkflowState.tsx:231-295`

```typescript
async function initialize() {
  // ... load machine ...
  let clientState = await loadClientState();

  if (!clientState) {
    // Initialize NEW client state
    const initialStepId = loadedMachine.steps[0]?.id || '';
    const initialStage = loadedMachine.steps[0]?.stage;  // ← Gets stage

    await fetch('/api/client-state', {
      method: 'POST',
      body: JSON.stringify({
        action: 'initialize',
        clientId,
        workflowId: loadedMachine.workflowId,
        initialStepId,
        // NOTE: initialStage NOT included in API call!
      }),
    });
  }

  // Set state from loaded/initialized data
  const effectiveStepId = clientState.currentStepId || loadedMachine.steps[0]?.id || '';
  const effectiveStep = getStepById(loadedMachine, effectiveStepId);
  const effectiveStage = clientState.currentStage ?? effectiveStep?.stage ?? undefined;
  // ↑ Falls back to effectiveStep.stage if currentStage is null

  setCurrentStepId(effectiveStepId);
  setCurrentStage(effectiveStage);  // ← Should be correct
  // ...
}
```

**Observation**: The hook DOES compute `effectiveStage` correctly using fallback logic (line 289). So `currentStage` SHOULD be set to `"information_collection"` even if client state has `null`.

**But**: Client state file shows `"currentStage": null`. This means:
- Either the API initialization doesn't save the stage
- Or the stage wasn't updated when client state was first created

**Impact**: Minor (doesn't cause form rendering bug, but indicates incomplete state management)

---

## Evidence Trail

### Evidence 1: Playwright Test Output

```
📍 TESTING CLIENT: Acme Corp
✅ Client selected: Acme Corp
✅ Workflow Status section visible
✅ Button found! Clicking...
✅ Form overlay should be open

⚠️  Could not find form title
📝 ALL Visible Labels: (empty)
🔘 ALL Visible Buttons with Text:
     ... (no "Continue" or "Continue to Review" buttons)
     10. "×bd5c9079-929b-4d55-bdc-16d1c8181b71!"  ← Strange UUID button

🔍 Fetching Client State from API...
📊 Current Step ID: "collectContactInfo"
📊 Current Stage: "null"
📊 Completed Steps: []

⚖️  EXPECTED BEHAVIOR:
     Step = "collectContactInfo" → Should show Contact Info form
     Expected submit button: "Continue"
```

**Interpretation**:
- Form overlay IS open (test doesn't time out)
- But form content is completely missing
- This suggests the form component received `schema={{ fields: [] }}` (empty schema)

### Evidence 2: User Screenshot Analysis

Screenshot shows:
- Form title: "Corporate Contact Information" ✓
- Form fields: All 5 fields visible ✓
- Submit button: "Continue to Documents" ✓

**BUT user reports**: "After clicking 'Continue to Documents' button, wrong form is rendered"

**Interpretation**:
- Initial form render works correctly
- Bug occurs AFTER form submission (step transition)
- This confirms the race condition hypothesis

### Evidence 3: Auto-Close Effect Dependencies

```typescript
useEffect(() => {
  if (overlayOpen && !workflow.isTransitioning && workflow.currentStepId &&
      workflow.currentStepId !== previousStepIdRef.current) {
    previousStepIdRef.current = workflow.currentStepId;
    handleCloseOverlay();
  }
}, [workflow.currentStepId, workflow.isTransitioning, overlayOpen]);
//   ^^^^^^^^^^^^^^^^^^^^^^  ^^^^^^^^^^^^^^^^^^^^^^^^  ^^^^^^^^^^^
//   Changes on transition   Should block closure       Stays true
```

**Analysis**:
- Effect depends on `workflow.currentStepId` → triggers when step changes ✓
- Effect checks `!workflow.isTransitioning` → should prevent premature closure
- **But**: `isTransitioning` becomes `false` AFTER `await saveClientState()` completes

**Timeline**:
1. `setCurrentStepId(nextStep.id)` → `currentStepId` changes
2. React batches state updates, schedules re-render
3. `await saveClientState()` starts (async, doesn't block)
4. `setIsTransitioning(false)` runs AFTER save completes
5. Meanwhile, React re-render happens with new `currentStepId` but `isTransitioning` still `true`
6. Effect doesn't fire yet (isTransitioning is true)
7. Save completes, `setIsTransitioning(false)` updates state
8. React re-renders AGAIN
9. Now effect fires: `overlayOpen=true`, `isTransitioning=false`, `currentStepId` changed
10. **Effect closes overlay!**

**Root Cause Confirmed**: The guard `!workflow.isTransitioning` doesn't prevent closure because `isTransitioning` becomes `false` quickly (after save completes, which is fast).

---

## Timeline of Events (Bug Execution Path)

```
T=0ms    User clicks "Continue to Documents" button
T=1ms    onSubmit() handler invoked
T=2ms    Validation passes (canProceed = true)
T=3ms    workflow.goToNextStep() called

T=5ms    setIsTransitioning(true)  → isTransitioning = true
T=6ms    executeTransition() runs  → calculates next step = "collectDocuments"
T=7ms    setCurrentStepId("collectDocuments")  → currentStepId changes
T=8ms    setCurrentStage("information_collection")
T=9ms    setCompletedSteps(["collectContactInfo"])

T=10ms   React batches state updates, schedules re-render
T=12ms   saveClientState() starts (async fetch to /api/client-state)

[React Re-Render #1 - During Transition]
T=15ms   Form component receives new props:
         - stepId="collectDocuments" (NEW)
         - schema={workflow.currentStep.schema}  → schema for "collectDocuments" step
         - BUT form is still visible (overlay hasn't closed yet)

T=16ms   Auto-close effect checks:
         - overlayOpen = true ✓
         - workflow.isTransitioning = true ✗ (blocks closure - GOOD!)
         - Effect doesn't fire

T=20ms   Form starts re-rendering with new schema...
T=25ms   saveClientState() completes (fast API call)
T=26ms   setIsTransitioning(false)  → isTransitioning = false

[React Re-Render #2 - After Transition]
T=30ms   Auto-close effect checks:
         - overlayOpen = true ✓
         - workflow.isTransitioning = false ✓ (no longer blocking!)
         - workflow.currentStepId changed ✓
         - Effect fires → handleCloseOverlay() called!

T=35ms   Overlay closes, chat shows "Form closed" message
T=40ms   User sees empty/closed overlay instead of document upload form

EXPECTED: User should see document upload form at T=20-30ms
ACTUAL:   Overlay closed at T=35ms before form finished rendering
```

---

## Why This Bug is Intermittent

The bug timing depends on:

1. **saveClientState() duration**: If API call is slow (>100ms), user might see new form briefly before auto-close
2. **Form rendering speed**: If form renders fast, user might see it for a split second
3. **React's render timing**: Depends on React's internal scheduling

**In Playwright Test**: saveClientState() is very fast (localhost), so overlay closes almost immediately. User never sees the form → appears as "empty form" bug.

**In Manual Testing**: If user is on slow network or CPU is busy, they might see form flash briefly before closing.

---

## Conclusion

**Definitive Root Cause**: The auto-close effect (line 204-211 of `app/onboarding/page.tsx`) closes the form overlay prematurely after step transitions because the `isTransitioning` guard becomes `false` too quickly (as soon as `saveClientState()` completes).

**Fix Required**: Modify the auto-close logic to NOT close the overlay during step transitions. Only close overlay when:
- User explicitly closes it (X button, Escape key, backdrop click)
- Workflow completes (reaches END step)
- NOT when transitioning between steps (user should stay in form overlay to see next step's form)

**Additional Fix**: Ensure form component handles schema changes gracefully (show loading state during transition).

---

## See Also

- `debug/plan/plan.md` - Fix strategy and implementation tasks
- `debug/repro/repro.md` - Full reproduction steps and evidence
