## Workflow Gap Analysis (Exploratory)

This document captures the current end-to-end workflow execution path in the Composable Onboarding POC, contrasts it with the intended flow described in the task plan and user stories, and highlights concrete code touchpoints for remediation.

---

### Current Runtime Flow

```
[UI Components]
     │  (FormOverlay, WorkflowStatusSection)
     ▼
[useWorkflowState hook]
  (client-side state machine)
     │
     │ 1. fetch(`/api/workflows`)
     ▼
[compileWorkflow loader]───────────────┐
     │                                 │
     │ 2. executeTransition() (client)  │
     ▼                                 │
[Browser state updates]                │
     │                                 │
     │ 3. fetch(`/api/client-state`, {action:'update'})
     ▼                                 │
[POST handler @ app/api/client-state]
     │  (blind merge of payload)
     ▼
[state-store.saveClientState]
     │
     ▼
[data/client_state/*.json]
```

**Key behaviors**

- Client-side authority: `useWorkflowState.goToNextStep()` runs `executeTransition` locally before persisting (`explore_copilotkit/lib/hooks/useWorkflowState.tsx:402-458`).
- API trust boundary is thin: `POST /api/client-state` accepts whichever fields arrive and calls `updateClientState`, which simply writes the JSON to disk (`explore_copilotkit/app/api/client-state/route.ts:96-149`, `explore_copilotkit/lib/workflow/state-store.ts:178-206`).
- Migrated client files still contain `"workflowId": null`, so legitimate updates fail validation in `saveClientState` unless the runtime clears the check (see `explore_copilotkit/data/client_state/corp-001.json:1-22` vs. validation at `explore_copilotkit/lib/workflow/state-store.ts:47-83`).
- Stage tracking exists only as read-only metadata. `getStageProgress` tallies completion, but no code writes `completedStages` or blocks stage jumps (`explore_copilotkit/lib/workflow/engine.ts:294-347`).

**Implications**

1. **Security / Integrity gap** – any caller can skip validation by POSTing a desired `currentStepId` to `/api/client-state`.
2. **Data consistency gap** – persisted states may have mismatched `workflowId` or stage data, producing UI drift after refresh.
3. **Stage UX gap** – the UI never sees accurate stage completion, so `StageIndicator` renders an empty progress map (`explore_copilotkit/components/onboarding/workflow-progress.tsx:67-77`).

---

### Target Runtime Flow (from tasks 4E, 6G, and user stories)

```
[UI Components]
     │
     ▼
[useWorkflowState (thin client)]
     │ 1. fetch(`/api/workflows`)
     │
     │ 2. POST `/api/client-state/transition`
     │     ├─ payload: { clientId, inputs, intent }
     ▼     ▼
[Server transition handler]
   ├─ load current ClientState
   ├─ lookup RuntimeMachine
   ├─ validate inputs via validateStepInputs
   ├─ executeTransition(machine, step, inputs)
   ├─ update completedSteps & completedStages
   └─ persist via saveClientState
     ▼
[state-store saves hydrated state]
     │
     ▼
[Response → hook updates local state]
```

**Expected enhancements**

- **Authoritative transitions**: The server executes `executeTransition` and returns the next step, preventing tampering (Tasks 4C & 6G).
- **Stage lifecycle**: Implement `getStageStatus` / `canProgressToNextStage` and persist `completedStages`, enabling UX elements (Task 4E).
- **Data hydration**: Initial state creation includes `workflowId`, `currentStage`, and `data` (client profile), so `/api/client-state` can power the left-pane list and middle-pane summaries.
- **Validation surfaced**: The response carries validation errors; UI only moves forward when the server confirms success (COS-POC-2 acceptance criteria).

---

### Gap Summary and Code References

| Area | Current Behavior | Desired Behavior | Key References |
|------|------------------|------------------|----------------|
| Transition logic | Client-only `executeTransition` (`useWorkflowState.tsx:402-458`) | Dedicated server endpoint wraps validation + transition | new handler under `app/api/client-state` or separate `app/api/workflow-transition` |
| Validation | Browser checks `canTransitionFrom` and still writes optimistic state | Server rejects invalid payload before saving | `explore_copilotkit/lib/workflow/engine.ts:146-236` to reuse on server |
| Stage tracking | `getStageProgress` read-only; `completedStages` unused | Implement `getStageStatus` / persist stage completion | add helpers in `explore_copilotkit/lib/workflow/engine.ts` & update hook |
| State hydration | Migrated files have `workflowId: null`; `initializeClientState` lacks `data` | Populate workflow metadata during init/migration | `explore_copilotkit/lib/workflow/migrate-clients.ts:40-69` and `state-store.ts:218-244` |
| Client list source | `/api/client-state` lists `clients` derived from state files | Same endpoint continues, but relies on accurate stored `data` | `explore_copilotkit/app/api/client-state/route.ts:18-69` |

---

### Recommended Exploratory Experiments

1. **Prototype server transition handler**
   - Duplicate `executeTransition` invocation on the server and log discrepancies between client & server decisions for a sample client.
   - File touchpoints: `explore_copilotkit/app/api/client-state/transition.ts` (new), `explore_copilotkit/lib/workflow/engine.ts`.

2. **Stage completion audit**
   - Instrument `useWorkflowState` to console-log stage progress arrays vs. what the UI renders to confirm missing data.
   - Files: `explore_copilotkit/lib/hooks/useWorkflowState.tsx`, `components/onboarding/workflow-progress.tsx`.

3. **Migration dry-run**
   - Run `migrateClientData()` with a configurable base URL to repopulate `workflowId` fields and validate `saveClientState` constraints.
   - Files: `explore_copilotkit/lib/workflow/migrate-clients.ts`, `data/client_state/*.json`.

4. **Contract tests**
   - Add a test harness under `lib/workflow/__tests__` to simulate API-driven transitions, ensuring server and client hooks stay aligned after refactor.

---

### Corporate Workflow Spec (Expected Behavior)

```
Client selects corporate profile
        │
        ▼
GET /api/workflows?client_type=corporate&jurisdiction=US
  → returns machine with steps [collectContactInfo → review]
        │
        ▼
Render Step: collectContactInfo (component_id=form)
  • Required inputs: legal_name, entity_type, jurisdiction,
    business_email, business_phone
  • Validation: empty check + field-level rules (email/phone patterns)
        │  (enter data, submit)
        ▼
POST /api/client-state (transition intent)
  • Server validates via validateStepInputs
  • executeTransition ⇒ next = review
  • Persist completedSteps += [collectContactInfo]
        │
        ▼
Render Step: review (component_id=review-summary)
  • Shows collected inputs grouped in summary
  • Requires confirmation checkbox before submit
        │  (confirm and submit)
        ▼
POST /api/client-state (transition intent)
  • Server verifies confirmed flag
  • executeTransition ⇒ END
  • Persist currentStepId=END, completedSteps += [review]
        │
        ▼
UI shows completion screen, stage finalization marked complete
```

**Specification details**

- **Workflow definition** – Corporate flow declares three stages with two operational steps: `collectContactInfo` in `information_collection`, and `review` in `finalization` (`explore_copilotkit/data/workflows/corporate_onboarding_v1.yaml:1-60`). Compliance stage currently has no steps; spec should flag this as acceptable placeholder or require a stage stub.
- **Step 1 form** – Task `contact_info/corporate` inherits base email/phone schema and adds corporate-specific fields; `GenericForm` renders the YAML-defined fields and enforces input updates via `onInputChange` (`explore_copilotkit/data/tasks/contact_info/corporate.yaml:1-48`, `explore_copilotkit/components/workflow/GenericForm.tsx:9-119`). Server-side validation must mirror the required field list from the task (`explore_copilotkit/lib/workflow/engine.ts:146-236`).
- **Persistence contract** – Transition success writes a state object containing `workflowId`, `currentStepId`, `currentStage`, `collectedInputs`, `completedSteps`, and timestamp (`explore_copilotkit/lib/workflow/state-store.ts:47-116`). Spec should mandate that `workflowId` is non-null and matches the compiled machine so client refreshes remain consistent.
- **Step 2 review** – `ReviewSummary` expects a confirmation boolean before submission. It currently toggles `_confirmed`, so acceptance criteria must either adapt the task schema (`confirmed`) or document the mapping requirement (`explore_copilotkit/components/workflow/ReviewSummary.tsx:9-122`, `explore_copilotkit/data/tasks/review/summary.yaml:8-31`).
- **Completion state** – After the review step transitions to `END`, the hook sets `isComplete`, clears `currentStage`, and the UI displays the completion screen (`explore_copilotkit/lib/hooks/useWorkflowState.tsx:421-515`). Spec should include the expected response payload (`{ nextStepId: "END", isEnd: true }`) and UI behavior (completion banner + restart button).
- **Stage indicators** – Until Task 4E is implemented, only current stage highlighting is reliable; specs can note that percentage bars will reflect `completedSteps` but not yet enforce stage gating (`explore_copilotkit/components/onboarding/workflow-progress.tsx:67-88`).

---

### Takeaways

- The current implementation satisfies the UI demo needs but leaves the backend without enforcement; every progression decision must shift to the server to meet the “deterministic, auditable workflow” goal.
- Completing Task 4E (stage modeling) unlocks richer progress feedback and stage-level gating, which Task 6G expects for the middle-pane UI.
- Once authoritative transitions and stage tracking land, `useWorkflowState` can be simplified: it becomes a thin cache over server state rather than the primary workflow engine.
