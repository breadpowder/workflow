# Feature Planning Status: client_data_file_based

**Feature Name**: Migrate Client Data to File-Based Storage
**Workspace**: `task_client_data_file_based/`
**Started**: 2025-10-23
**Status**: PLANNING

---

## Timeline & Activity Log

### 2025-10-23 19:55:00 - Context Gathering Complete
**Activity**: Analyzed current implementation
**Tools Used**: Read, Grep
**Findings**:
- Current implementation uses hard-coded mock data in `lib/mock-data/clients.ts`
- 5 files import from `clients.ts`: page.tsx, test-layout/page.tsx, profile-section.tsx, client-list.tsx, client-folder.tsx
- Existing `ClientState` interface in `state-store.ts` (lines 16-25) has workflow data only
- Current `ClientState` fields: clientId, workflowId, currentStepId, currentStage, collectedInputs, completedSteps, completedStages, lastUpdated

**Next Step**: Requirements analysis and options evaluation

---

## Requirements Analysis

### User Intent (Reflected)
User wants to:
1. **Remove hard-coded client data** from `lib/mock-data/clients.ts`
2. **Store client data in file-based JSON** alongside workflow state
3. **Add `data` attribute** to `ClientState` interface for client profile information
4. **Migrate existing mock clients** to JSON files (one per client)
5. **Update all UI components** to read from file-based storage instead of imports

### Clarifying Questions (PENDING USER RESPONSE)

**Q1: Client Data Model**
- Should we keep the existing `Client` interface structure exactly as is?
- Current fields: id, name, type, status, email, risk, entityType, jurisdiction, createdAt, lastActivity
- Should `data` in `ClientState` match this structure, or should it be flexible (Record<string, any>)?

**Q2: Migration Strategy**
- Should we auto-migrate the 5 existing mock clients (corp-001, corp-002, corp-003, ind-001, ind-002) to JSON files on first run?
- Or should we provide a migration script that the user runs manually?

**Q3: Client Creation**
- How should new clients be created? Via:
  - A. UI form (add "New Client" button to ClientList)
  - B. API endpoint only (manual JSON file creation)
  - C. Both

**Q4: Backward Compatibility**
- Should we keep `lib/mock-data/clients.ts` temporarily with a deprecation warning?
- Or delete it immediately and update all imports?

**Q5: API Endpoint Changes**
- Current `/api/client-state` handles workflow state only
- Should we:
  - A. Extend `/api/client-state` to handle client data updates (add `data` field)
  - B. Create separate `/api/clients` endpoint for CRUD operations
  - C. Both (recommended for separation of concerns)

---

## Assumptions (UNCONFIRMED - Awaiting User Approval)

1. **Data Model**: `ClientState.data` will use existing `Client` interface structure
2. **Migration**: Auto-migrate 5 mock clients to JSON files in `data/client_state/`
3. **Client Creation**: Defer to future feature (not in this scope)
4. **Backward Compatibility**: Delete `clients.ts` and update all imports (clean break)
5. **API Design**: Extend existing `/api/client-state` endpoint to handle `data` field

---

## Human Review Gate - APPROVED

**Status**: ✅ USER APPROVED (2025-10-23)

User Response: "proceed with assumption, update docs and then proceed with implementation, use subagents to speed up"

**Approved Decisions**:
1. ✅ Data Model: `ClientState.data: Client` (typed interface)
2. ✅ Migration: Auto-migrate 5 mock clients on first API call
3. ✅ Creation: Defer new client creation to future feature
4. ✅ Compatibility: Delete `clients.ts` data, keep type definitions
5. ✅ API: Extend existing `/api/client-state` to handle `data` field

---

### 2025-10-23 20:00:00 - Planning Complete
**Activity**: Created comprehensive task breakdown
**Artifacts Created**:
- `plan/tasks/tasks.md` - 7 tasks with acceptance criteria
- `plan/tasks/tasks_details.md` - Implementation patterns and integration guides
- `plan/decision-log.md` - 6 architectural decisions with rationale

**Task Breakdown Summary**:
- **TASK-1**: Extend ClientState schema (30 min)
- **TASK-2**: Create migration utility (1 hour)
- **TASK-3**: Update API endpoint (1 hour)
- **TASK-4**: Create useClientData hook (1 hour)
- **TASK-5**: Update 5 UI components (1.5 hours)
- **TASK-6**: Cleanup and documentation (30 min)
- **TASK-7**: End-to-end testing (1 hour)

**Total**: 6 hours sequential, ~3 hours with parallel execution

---

### 2025-10-23 20:01:00 - Ready for Implementation
**Activity**: Planning docs committed to git
**Next Step**: Launch subagents for parallel implementation

**Parallel Execution Plan**:
- **Phase 1** (Parallel): Subagents for TASK-1+2, TASK-3, TASK-4
- **Phase 2** (Sequential): TASK-5 (UI updates)
- **Phase 3** (Sequential): TASK-6 + TASK-7 (cleanup & test)

**Guardrails**:
- All subagents must complete Phase 1 before Phase 2 starts
- Build must pass after each phase
- E2E test must pass before final commit

---
