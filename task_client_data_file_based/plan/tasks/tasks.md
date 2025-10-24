# Task Breakdown: Client Data File-Based Migration

**Feature**: client_data_file_based
**Status**: APPROVED FOR IMPLEMENTATION
**Complexity**: MEDIUM
**Total Estimated Time**: 6 hours

---

## Task 1: Extend ClientState Schema with Client Data

**ID**: TASK-1
**Title**: Add `data` field to ClientState interface
**Priority**: HIGH
**Dependencies**: None
**Estimated Time**: 30 minutes

### Description
Update the `ClientState` interface in `lib/workflow/state-store.ts` to include a `data` field that stores client profile information using the existing `Client` interface structure.

### Acceptance Criteria
- [ ] `ClientState` interface has new `data?: Client` field
- [ ] Import `Client` type from `lib/mock-data/clients.ts`
- [ ] Update all `saveClientState`, `loadClientState`, `initializeClientState` to handle optional `data` field
- [ ] TypeScript compilation passes with no errors
- [ ] Existing workflow state files remain compatible (data field is optional)

### Expected Behavior
- Loading existing client state files works (backward compatible)
- Saving state preserves `data` field if present
- TypeScript enforces `Client` interface structure on `data` field

### Manual Verification
```bash
# Check TypeScript compilation
npm run build

# Verify interface
cat lib/workflow/state-store.ts | grep -A 10 "export interface ClientState"
```

---

## Task 2: Create Client Data Migration Utility

**ID**: TASK-2
**Title**: Build migration function to convert mock clients to JSON files
**Priority**: HIGH
**Dependencies**: TASK-1
**Estimated Time**: 1 hour

### Description
Create a migration utility that reads mock clients from `lib/mock-data/clients.ts` and writes them to individual JSON files in `data/client_state/`, combining client data with minimal workflow state.

### Acceptance Criteria
- [ ] Create `lib/workflow/migrate-clients.ts` with `migrateClientData()` function
- [ ] Function reads `MOCK_CLIENTS` array from `clients.ts`
- [ ] For each client, create `ClientState` with:
  - `clientId`: client.id
  - `workflowId`: "onboarding_v1" (based on client.type)
  - `currentStepId`: "start" (initial step)
  - `data`: full Client object
  - `collectedInputs`: {} (empty)
  - `completedSteps`: [] (empty)
- [ ] Write to `data/client_state/{clientId}.json`
- [ ] Skip if file already exists (idempotent)
- [ ] Function returns count of migrated clients

### Expected Behavior
- Running migration creates 5 JSON files: corp-001.json, corp-002.json, corp-003.json, ind-001.json, ind-002.json
- Each file contains valid `ClientState` with client data in `data` field
- Re-running migration doesn't overwrite existing files
- Migration logs progress to console

### Manual Verification
```bash
# Run migration
node -e "import('./lib/workflow/migrate-clients.js').then(m => m.migrateClientData())"

# Check created files
ls -la data/client_state/*.json

# Verify file structure
cat data/client_state/corp-001.json | jq '.data'
```

---

## Task 3: Update API Endpoint to Handle Client Data

**ID**: TASK-3
**Title**: Extend /api/client-state to support client data operations
**Priority**: HIGH
**Dependencies**: TASK-1, TASK-2
**Estimated Time**: 1 hour

### Description
Update the `/api/client-state` API endpoint to:
1. Return client data in GET responses
2. Accept client data updates in POST requests (update action)
3. Trigger migration on first GET request if no files exist

### Acceptance Criteria
- [ ] GET endpoint returns `ClientState` including `data` field
- [ ] POST with `action: "update"` can update `data` field
- [ ] POST with `action: "initialize"` accepts optional `data` parameter
- [ ] Auto-migration runs once if `data/client_state/` is empty
- [ ] Migration logs to server console
- [ ] API responses include client data when present

### Expected Behavior
- GET `/api/client-state?clientId=corp-001` returns client with `data.name = "Acme Corp"`
- POST `/api/client-state` with `{action: "update", clientId: "corp-001", updates: {data: {...}}}` updates client profile
- First API call to empty `data/client_state/` triggers auto-migration
- Migration runs only once (checks for existing files)

### Manual Verification
```bash
# Start dev server
npm run dev

# Test GET endpoint
curl http://localhost:3009/api/client-state?clientId=corp-001 | jq '.data'

# Test POST update
curl -X POST http://localhost:3009/api/client-state \
  -H "Content-Type: application/json" \
  -d '{"action":"update","clientId":"corp-001","updates":{"data":{"name":"Updated Name"}}}'
```

---

## Task 4: Create Client Data Access Hook

**ID**: TASK-4
**Title**: Build useClientData hook for UI components
**Priority**: HIGH
**Dependencies**: TASK-3
**Estimated Time**: 1 hour

### Description
Create a React hook `useClientData()` that:
1. Fetches all clients from file-based storage
2. Provides filtering and search functions
3. Replaces mock data functions from `clients.ts`
4. Handles loading and error states

### Acceptance Criteria
- [ ] Create `lib/hooks/useClientData.tsx`
- [ ] Hook returns: `{ clients, loading, error, refetch, searchClients, getClientsByType, getClientById }`
- [ ] Fetches from `/api/client-state` (list all clients)
- [ ] Implements client-side search (matches mock behavior)
- [ ] Implements type filtering (corporate/individual)
- [ ] Loading state while fetching
- [ ] Error handling with retry capability

### Expected Behavior
- Hook fetches all clients on mount
- `searchClients(query)` filters by name, email, or ID (case-insensitive)
- `getClientsByType(type)` returns filtered array
- `getClientById(id)` returns single client or undefined
- `refetch()` reloads from API
- Loading spinner shows during initial fetch

### Manual Verification
```bash
# Check hook implementation
cat lib/hooks/useClientData.tsx | grep -A 20 "export function useClientData"

# Test in browser console (after component mount)
# Should see: { clients: [...], loading: false, error: null }
```

---

## Task 5: Update UI Components to Use File-Based Data

**ID**: TASK-5
**Title**: Migrate 5 components from mock imports to useClientData hook
**Priority**: HIGH
**Dependencies**: TASK-4
**Estimated Time**: 1.5 hours

### Description
Update all components that import from `lib/mock-data/clients.ts` to use the new `useClientData()` hook instead.

**Files to Update:**
1. `components/onboarding/client-list.tsx`
2. `components/onboarding/client-folder.tsx`
3. `components/onboarding/profile-section.tsx`
4. `app/onboarding/page.tsx`
5. `app/test-layout/page.tsx`

### Acceptance Criteria
- [ ] All 5 files remove imports from `lib/mock-data/clients.ts`
- [ ] Components use `useClientData()` hook for data access
- [ ] Loading states displayed during data fetch
- [ ] Error states handled gracefully
- [ ] Search and filtering functionality preserved
- [ ] Client selection works as before
- [ ] TypeScript compilation passes
- [ ] No runtime errors in browser console

### Expected Behavior
- Client list loads from file-based storage
- Search functionality works identically to mock implementation
- Client selection triggers workflow loading with correct client data
- Loading spinner shows during initial data fetch
- Error message displays if API call fails

### Manual Verification
```bash
# Build check
npm run build

# Visual test in browser
npm run dev
# Navigate to http://localhost:3009/onboarding
# Verify:
# 1. Client list loads (5 clients visible)
# 2. Search works (type "Acme" → shows Acme Corp only)
# 3. Client selection works
# 4. No console errors
```

---

## Task 6: Remove Mock Data File and Update Documentation

**ID**: TASK-6
**Title**: Delete clients.ts and update project documentation
**Priority**: MEDIUM
**Dependencies**: TASK-5
**Estimated Time**: 30 minutes

### Description
Remove the now-unused `lib/mock-data/clients.ts` file and update relevant documentation to reflect the file-based storage architecture.

### Acceptance Criteria
- [ ] Delete `lib/mock-data/clients.ts`
- [ ] Update `CLAUDE.md` (if applicable) to document file-based client storage
- [ ] Update `README.md` to mention client data location (`data/client_state/*.json`)
- [ ] Add comment in `state-store.ts` explaining `data` field purpose
- [ ] Verify no remaining imports of deleted file
- [ ] TypeScript compilation passes

### Expected Behavior
- File deleted successfully
- No broken imports anywhere in codebase
- Documentation clearly explains client data storage approach

### Manual Verification
```bash
# Check file is deleted
ls lib/mock-data/clients.ts  # Should fail

# Search for remaining imports
rg "from.*mock-data/clients" --type tsx --type ts
# Should return 0 results

# Build check
npm run build
```

---

## Task 7: End-to-End Testing

**ID**: TASK-7
**Title**: Verify complete workflow with file-based client data
**Priority**: HIGH
**Dependencies**: TASK-6
**Estimated Time**: 1 hour

### Description
Create and run Playwright test to verify the complete client data migration:
1. Client list loads from files
2. Client selection works
3. Workflow integrates with client data
4. Client data persists across sessions

### Acceptance Criteria
- [ ] Create `/tmp/playwright-test-client-migration.js`
- [ ] Test verifies 5 clients load from file storage
- [ ] Test verifies client search functionality
- [ ] Test verifies client selection triggers workflow
- [ ] Test verifies client data displayed in profile section
- [ ] Test verifies workflow state + client data both persisted
- [ ] Screenshots captured for evidence
- [ ] All test assertions pass

### Expected Behavior
- Playwright test opens onboarding page
- Client list displays 5 clients (from JSON files)
- Search filters clients correctly
- Selecting client loads workflow with client data
- Profile section shows correct client information
- Test passes with no errors

### Manual Verification
```bash
# Run Playwright test
node /tmp/playwright-test-client-migration.js

# Check screenshots
ls -la /tmp/client-migration-*.png

# Verify test output shows all assertions passed
```

---

## Dependencies Graph

```
TASK-1 (ClientState schema)
  ↓
TASK-2 (Migration utility) → TASK-3 (API endpoint)
                                ↓
                              TASK-4 (useClientData hook)
                                ↓
                              TASK-5 (Update UI components)
                                ↓
                              TASK-6 (Cleanup & docs)
                                ↓
                              TASK-7 (E2E testing)
```

---

## Implementation Strategy

### Parallel Execution Plan (Subagents)

**Phase 1 - Backend Foundation** (Parallel: 3 subagents)
- Subagent 1: TASK-1 (Schema) + TASK-2 (Migration)
- Subagent 2: TASK-3 (API endpoint)
- Subagent 3: TASK-4 (Hook)

**Phase 2 - UI Updates** (Sequential)
- Single agent: TASK-5 (Update 5 components)

**Phase 3 - Cleanup & Test** (Sequential)
- Single agent: TASK-6 (Cleanup) + TASK-7 (Testing)

**Total Time**: ~3 hours with parallel execution (vs 6 hours sequential)

---

## Rollback Plan

If issues occur:
```bash
# Revert all changes
git revert <commit_hash>

# Restore mock data file
git checkout HEAD~1 lib/mock-data/clients.ts

# Rebuild
npm run build
```

---
