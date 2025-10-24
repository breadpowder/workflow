# Migration Fix Summary: Fetch Correct Workflow IDs from API

**Date**: 2025-10-23
**Status**: COMPLETE

---

## Problem

The migration utility (`lib/workflow/migrate-clients.ts`) was hardcoding incorrect workflow IDs:

```typescript
// WRONG - Hardcoded values
workflowId: 'corporate_onboarding_v1'  // Should be 'wf_corporate_v1'
currentStepId: 'start'                  // Should be 'collectContactInfo'
```

This caused the "Open Current Step Form" button to not appear because the UI checks:
```typescript
if (currentStepId === 'start') return null; // Button doesn't render
```

The actual workflow API returns:
```json
{
  "workflowId": "wf_corporate_v1",
  "initialStepId": "collectContactInfo"
}
```

---

## Solution

Updated the migration to **fetch workflow IDs from the API** instead of hardcoding them.

### Changes Made

**File**: `/home/zineng/workspace/workflow/explore_copilotkit/lib/workflow/migrate-clients.ts`

#### 1. Added Client Type Import
```typescript
import { MOCK_CLIENTS, type Client } from '@/lib/mock-data/clients';
```

#### 2. Created Helper Function `migrateClient()`
```typescript
async function migrateClient(client: Client): Promise<void> {
  // Check if already exists (idempotent)
  const exists = await clientStateExists(client.id);
  if (exists) {
    console.log(`⊘ Skip: ${client.id} - already exists`);
    return;
  }

  // Fetch actual workflow to get correct IDs
  const params = new URLSearchParams({ client_type: client.type });
  if (client.jurisdiction) {
    params.append('jurisdiction', client.jurisdiction);
  }

  // Call API to get workflow
  const workflowResponse = await fetch(
    `http://localhost:3009/api/workflows?${params.toString()}`
  );

  if (!workflowResponse.ok) {
    throw new Error(
      `Failed to fetch workflow for ${client.type}: ${workflowResponse.statusText}`
    );
  }

  const workflow = await workflowResponse.json();

  // Create ClientState with correct IDs from API
  const state: ClientState = {
    clientId: client.id,
    workflowId: workflow.workflowId,        // ✓ From API
    currentStepId: workflow.initialStepId,  // ✓ From API
    currentStage: undefined,
    collectedInputs: {},
    completedSteps: [],
    completedStages: [],
    lastUpdated: new Date().toISOString(),
    data: client,
  };

  await saveClientState(client.id, state);
  console.log(
    `✓ Migrated: ${client.id} (${client.name}) → workflow.id=${workflow.workflowId}, initialStep=${workflow.initialStepId}`
  );
}
```

#### 3. Refactored Main Function
```typescript
export async function migrateClientData(): Promise<number> {
  console.log('🔄 Starting client data migration...\n');

  let migratedCount = 0;
  let skippedCount = 0;

  for (const client of MOCK_CLIENTS) {
    try {
      await migrateClient(client);
      migratedCount++;
    } catch (error) {
      console.error(
        `✗ Failed to migrate ${client.id}:`,
        error instanceof Error ? error.message : error
      );
      skippedCount++;
    }
  }

  console.log(`\n✓ Migration complete: ${migratedCount} migrated, ${skippedCount} skipped`);
  return migratedCount;
}
```

---

## Key Improvements

1. **API-Driven Configuration**: Workflow IDs are now fetched from the API, ensuring consistency with the actual workflow definitions
2. **Error Handling**: Proper error handling for failed API calls with detailed error messages
3. **Idempotency**: Existing files are skipped, allowing safe re-runs
4. **Better Logging**: Enhanced console output showing actual workflow IDs used
5. **Type Safety**: Added proper TypeScript types with Client interface

---

## Verification

### TypeScript Compilation
✅ TypeScript compilation passes (no errors in migration file)

### Expected Behavior After Re-migration

After deleting old client state files and re-running migration:

```json
// data/client_state/corp-001.json
{
  "workflowId": "wf_corporate_v1",      // ✓ Correct
  "currentStepId": "collectContactInfo", // ✓ Correct
  ...
}
```

This will fix the "Open Current Step Form" button issue because:
- `currentStepId` will be `"collectContactInfo"` (not `"start"`)
- The button render condition will pass
- The correct form will be shown

---

## Next Steps

To complete Fix #2:

1. **Delete old client state files**:
   ```bash
   rm /home/zineng/workspace/workflow/explore_copilotkit/data/client_state/corp-*.json
   rm /home/zineng/workspace/workflow/explore_copilotkit/data/client_state/ind-*.json
   ```

2. **Re-run migration** (will be triggered automatically when visiting `/api/client-state`)

3. **Verify migrated files**:
   ```bash
   cat data/client_state/corp-001.json | jq '.workflowId, .currentStepId'
   # Should show: "wf_corporate_v1", "collectContactInfo"
   ```

4. **Test UI**:
   - Visit `/onboarding`
   - Select "Acme Corp"
   - Verify "Open Current Step Form" button appears at bottom right
   - Click button → form overlay should open with correct fields

---

## Files Modified

- `/home/zineng/workspace/workflow/explore_copilotkit/lib/workflow/migrate-clients.ts`
  - Added Client type import
  - Created `migrateClient()` helper function
  - Refactored `migrateClientData()` to use helper
  - Replaced hardcoded workflow IDs with API fetch

---

## Acceptance Criteria

✅ TypeScript compilation passes
✅ Migration fetches workflow from `http://localhost:3009/api/workflows?client_type=X`
✅ Uses `workflow.workflowId` and `workflow.initialStepId` from API response
✅ Error handling for failed API calls
✅ Existing files are skipped (idempotent)
✅ No UI code changes (as requested)
✅ No component renames (deferred to other task)
