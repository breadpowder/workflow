# Decision Log: Client Data File-Based Migration

**Feature**: client_data_file_based
**Date**: 2025-10-23
**Status**: APPROVED

---

## Decision 1: Data Model Structure

**Question**: Should `ClientState.data` match the existing `Client` interface exactly, or use flexible `Record<string, any>`?

**Options Considered**:
- **Option A**: Use exact `Client` interface (typed, validated)
- **Option B**: Use `Record<string, any>` (flexible, extensible)

**Decision**: **Option A** - Use exact `Client` interface

**Rationale**:
- Type safety prevents runtime errors
- IDE autocomplete and refactoring support
- Consistent with existing codebase patterns
- Easy to extend interface later if needed
- Validation enforced at compile time

**Trade-offs**:
- ✅ Type safety and validation
- ✅ Better developer experience
- ❌ Requires interface updates for schema changes
- ❌ Less flexible than Record<string, any>

---

## Decision 2: Migration Strategy

**Question**: How should we migrate the 5 existing mock clients to file-based storage?

**Options Considered**:
- **Option A**: Auto-migrate on first API call (seamless, automated)
- **Option B**: Manual migration script user runs (explicit, controlled)
- **Option C**: No migration - user creates clients manually (clean slate)

**Decision**: **Option A** - Auto-migrate on first API call

**Rationale**:
- Best user experience (zero manual steps)
- Maintains data continuity
- Idempotent (safe to re-run)
- Runs only when `data/client_state/` is empty
- No breaking changes for existing workflows

**Implementation**:
```typescript
// In GET /api/client-state handler
const clientIds = await listClients();
if (clientIds.length === 0) {
  await migrateClientData();
}
```

**Trade-offs**:
- ✅ Zero manual steps
- ✅ Seamless upgrade path
- ❌ Runs on server (adds ~100ms to first request)
- ❌ May surprise users who expect empty state

---

## Decision 3: Client Creation Scope

**Question**: Should this feature include creating new clients, or just migrate existing ones?

**Options Considered**:
- **Option A**: Include "New Client" button in UI (full CRUD)
- **Option B**: API endpoint only for creation (backend-ready, no UI)
- **Option C**: Defer to future feature (minimal scope)

**Decision**: **Option C** - Defer to future feature

**Rationale**:
- Keeps scope focused on migration
- Client creation is complex (validation, workflows, permissions)
- Current 5 clients sufficient for POC
- Can add CRUD later without breaking changes
- Reduces risk and implementation time

**Future Work**:
- Add "New Client" modal in ClientList
- Form with validation for all Client fields
- POST `/api/clients` endpoint for creation
- Auto-initialize workflow on client creation

**Trade-offs**:
- ✅ Focused scope
- ✅ Lower risk
- ✅ Faster implementation
- ❌ Users can't create clients via UI yet
- ❌ Need manual JSON editing to add clients

---

## Decision 4: Backward Compatibility

**Question**: Should we keep `lib/mock-data/clients.ts` temporarily with a deprecation warning, or delete it immediately?

**Options Considered**:
- **Option A**: Delete immediately, update all 5 imports (clean break)
- **Option B**: Keep with deprecation warning temporarily (gradual migration)

**Decision**: **Option A** - Delete immediately and update all imports

**Rationale**:
- Cleaner codebase (no deprecated code)
- Forces complete migration (no half-baked state)
- TypeScript catches any missed imports
- Simpler to maintain (one source of truth)
- POC project allows breaking changes

**Migration Path**:
1. Update all 5 components to use `useClientData()`
2. Verify no remaining imports via `rg "from.*mock-data/clients"`
3. Delete `lib/mock-data/clients.ts`
4. Build and test

**Trade-offs**:
- ✅ Clean codebase
- ✅ No confusion about data source
- ✅ Forces complete migration
- ❌ Breaking change (requires all components updated)
- ❌ No gradual rollout

---

## Decision 5: API Endpoint Design

**Question**: Should we extend `/api/client-state` or create a new `/api/clients` endpoint?

**Options Considered**:
- **Option A**: Extend `/api/client-state` POST to accept `data` field
- **Option B**: Create new `/api/clients` endpoint for CRUD
- **Option C**: Both endpoints (separation of concerns)

**Decision**: **Option A** - Extend existing `/api/client-state` endpoint

**Rationale**:
- Client data is part of ClientState (embedded in same JSON file)
- Fewer files to maintain
- Simpler API surface
- Atomic updates (workflow + client data together)
- Aligns with existing architecture

**API Operations**:
```typescript
// GET all clients
GET /api/client-state → { clients: Client[] }

// GET specific client state (including data)
GET /api/client-state?clientId=corp-001 → ClientState

// UPDATE client data
POST /api/client-state
  { action: "update", clientId: "corp-001", updates: { data: {...} } }
```

**Future Consideration**:
- If client CRUD becomes complex, can split to `/api/clients` later
- Current approach works for POC scope

**Trade-offs**:
- ✅ Simpler architecture
- ✅ Fewer files
- ✅ Atomic updates
- ❌ Mixes workflow and client data concerns
- ❌ Harder to split later if needed

---

## Decision 6: Client Type Import Location

**Question**: Where should components import the `Client` type from after deleting `clients.ts`?

**Options Considered**:
- **Option A**: Keep `Client` interface in `clients.ts`, only delete mock data
- **Option B**: Move `Client` interface to `state-store.ts`
- **Option C**: Create new `lib/types/client.ts` for shared types

**Decision**: **Option A** - Keep `Client` interface in `clients.ts`

**Rationale**:
- Minimal disruption (imports stay the same)
- File renamed to `lib/mock-data/client-types.ts` for clarity
- Clear separation: types vs data
- Avoids circular dependencies with state-store

**Implementation**:
```bash
# Rename file
mv lib/mock-data/clients.ts lib/mock-data/client-types.ts

# Keep: interfaces, types, type aliases
# Remove: MOCK_CLIENTS arrays, mock functions
```

**Trade-offs**:
- ✅ No import changes needed
- ✅ Avoid circular dependencies
- ❌ Keeps file that was supposed to be "deleted"
- ❌ Name may confuse (suggests mock data)

**REVISED DECISION** (during implementation):
Actually keep file as `lib/mock-data/clients.ts` but remove only the data arrays and functions. This keeps imports unchanged and avoids confusion.

---

## Decision Summary Table

| Decision | Option Selected | Rationale Summary |
|----------|----------------|-------------------|
| Data Model | Option A: Exact `Client` interface | Type safety, validation, better DX |
| Migration | Option A: Auto-migrate on first call | Seamless UX, zero manual steps |
| Client Creation | Option C: Defer to future | Focused scope, lower risk |
| Backward Compatibility | Option A: Delete immediately | Clean codebase, no confusion |
| API Design | Option A: Extend `/api/client-state` | Simpler, fewer files, atomic updates |
| Type Location | Option A: Keep in `clients.ts` | Minimal disruption, avoid circular deps |

---

## Approved By

**User**: Approved all assumptions on 2025-10-23
**Approach**: Proceed with assumptions, update docs, implement with subagents

---
