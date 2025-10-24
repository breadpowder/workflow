# Task Details: Client Data File-Based Migration

This document provides implementation guidance and integration patterns for migrating from hard-coded mock client data to file-based JSON storage.

---

## Architecture Overview

### Current State
```
UI Components → lib/mock-data/clients.ts (hard-coded arrays)
Workflow State → data/client_state/*.json (file-based)
```

### Target State
```
UI Components → useClientData() hook → /api/client-state → data/client_state/*.json
                                                          ↓
                                                    ClientState {
                                                      ...workflow fields,
                                                      data: Client
                                                    }
```

---

## TASK-1: ClientState Schema Extension

### File: `lib/workflow/state-store.ts`

**Lines to Modify**: 1-25 (interface definition)

**Implementation Pattern**:
```typescript
// Add import at top
import type { Client } from '@/lib/mock-data/clients';

// Update interface (lines 16-25)
export interface ClientState {
  clientId: string;
  workflowId: string;
  currentStepId: string;
  currentStage?: string;
  collectedInputs: Record<string, any>;
  completedSteps: string[];
  completedStages?: string[];
  lastUpdated: string;
  data?: Client;  // NEW: Client profile information
}
```

**Validation Updates**:
- Line 53: Update validation to allow missing `data` field
- Line 97: Ensure loaded state handles missing `data` gracefully

**Backward Compatibility**:
- Optional `data` field ensures existing JSON files load correctly
- No migration needed for workflow-only state files

---

## TASK-2: Migration Utility

### File: `lib/workflow/migrate-clients.ts` (NEW)

**Purpose**: One-time migration from mock data to file-based storage

**Implementation Pattern**:
```typescript
import { MOCK_CLIENTS } from '@/lib/mock-data/clients';
import { saveClientState, clientStateExists, type ClientState } from './state-store';

export async function migrateClientData(): Promise<number> {
  let migratedCount = 0;

  for (const client of MOCK_CLIENTS) {
    // Skip if already exists
    if (await clientStateExists(client.id)) {
      console.log(`Skip: ${client.id} already exists`);
      continue;
    }

    // Determine workflow based on client type
    const workflowId = client.type === 'corporate'
      ? 'corporate_onboarding_v1'
      : 'individual_onboarding_v1';

    // Create initial state with client data
    const state: ClientState = {
      clientId: client.id,
      workflowId,
      currentStepId: 'start',
      currentStage: undefined,
      collectedInputs: {},
      completedSteps: [],
      completedStages: [],
      lastUpdated: new Date().toISOString(),
      data: client,  // Embed full client profile
    };

    await saveClientState(client.id, state);
    console.log(`Migrated: ${client.id} (${client.name})`);
    migratedCount++;
  }

  return migratedCount;
}
```

**Key Decisions**:
- Use existing `saveClientState()` (atomic write guaranteed)
- Idempotent (safe to re-run)
- Logs progress for monitoring
- Returns count for verification

---

## TASK-3: API Endpoint Extension

### File: `app/api/client-state/route.ts`

**Lines to Modify**:
- Line 1: Add migration import
- Line 17-39: Update GET handler
- Line 112-129: Update POST update handler

**GET Handler Pattern** (lines 17-39):
```typescript
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const clientId = searchParams.get('clientId');

    if (clientId) {
      // Load specific client state
      const state = await loadClientState(clientId);

      if (!state) {
        return NextResponse.json(
          { error: 'Client state not found' },
          { status: 404 }
        );
      }

      return NextResponse.json(state);  // Now includes data field
    } else {
      // List all clients with their data
      const clientIds = await listClients();
      const clients = await Promise.all(
        clientIds.map(id => loadClientState(id))
      );

      // Filter out null states and extract client data
      const clientList = clients
        .filter(state => state !== null && state.data)
        .map(state => state!.data!);

      return NextResponse.json({ clients: clientList });
    }
  } catch (error) {
    // ... error handling
  }
}
```

**Auto-Migration Trigger**:
```typescript
// Add at start of GET handler
const clientIds = await listClients();
if (clientIds.length === 0) {
  console.log('No clients found - running migration...');
  const count = await migrateClientData();
  console.log(`Migration complete: ${count} clients migrated`);
}
```

**POST Update Handler Pattern** (lines 112-129):
```typescript
case 'update': {
  const { updates } = body;

  if (!updates) {
    return NextResponse.json(
      { error: 'Missing required field: updates' },
      { status: 400 }
    );
  }

  // Allow updating data field
  await updateClientState(clientId, updates);

  return NextResponse.json({
    success: true,
    message: 'Client state updated',
  });
}
```

**Key Changes**:
- GET with no clientId returns client data only (not full state)
- Auto-migration runs on first empty query
- POST update accepts `data` field changes
- Backward compatible with existing workflow state operations

---

## TASK-4: Client Data Hook

### File: `lib/hooks/useClientData.tsx` (NEW)

**Purpose**: React hook for accessing file-based client data

**Implementation Pattern**:
```typescript
'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import type { Client, ClientType } from '@/lib/mock-data/clients';

export interface UseClientDataReturn {
  clients: Client[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  searchClients: (query: string) => Client[];
  getClientsByType: (type: ClientType) => Client[];
  getClientById: (id: string) => Client | undefined;
}

export function useClientData(): UseClientDataReturn {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchClients = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/client-state');

      if (!response.ok) {
        throw new Error(`Failed to fetch clients: ${response.statusText}`);
      }

      const data = await response.json();
      setClients(data.clients || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      console.error('Error fetching clients:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  const searchClients = useCallback((query: string): Client[] => {
    const lowerQuery = query.toLowerCase().trim();
    if (!lowerQuery) return clients;

    return clients.filter((client) =>
      client.name.toLowerCase().includes(lowerQuery) ||
      client.email.toLowerCase().includes(lowerQuery) ||
      client.id.toLowerCase().includes(lowerQuery)
    );
  }, [clients]);

  const getClientsByType = useCallback((type: ClientType): Client[] => {
    return clients.filter((client) => client.type === type);
  }, [clients]);

  const getClientById = useCallback((id: string): Client | undefined => {
    return clients.find((client) => client.id === id);
  }, [clients]);

  return {
    clients,
    loading,
    error,
    refetch: fetchClients,
    searchClients,
    getClientsByType,
    getClientById,
  };
}
```

**Key Features**:
- Auto-fetches on mount
- Memoized filter functions (same API as mock functions)
- Error handling with retry via `refetch()`
- Loading state for UI feedback

---

## TASK-5: UI Component Updates

### Component Migration Pattern

**Before** (mock import):
```typescript
import { Client, getClientsByType, searchClients } from '@/lib/mock-data/clients';

export function ClientList({ selectedClientId, onClientSelect }: ClientListProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredClients = useMemo(() => {
    if (!searchQuery.trim()) {
      return {
        corporate: getClientsByType('corporate'),
        individual: getClientsByType('individual'),
      };
    }
    const results = searchClients(searchQuery);
    return {
      corporate: results.filter(c => c.type === 'corporate'),
      individual: results.filter(c => c.type === 'individual'),
    };
  }, [searchQuery]);

  // ... rest of component
}
```

**After** (hook-based):
```typescript
import { useClientData } from '@/lib/hooks/useClientData';
import type { Client } from '@/lib/mock-data/clients';

export function ClientList({ selectedClientId, onClientSelect }: ClientListProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const { clients, loading, error, searchClients: searchFn } = useClientData();

  const filteredClients = useMemo(() => {
    const results = searchQuery.trim()
      ? searchFn(searchQuery)
      : clients;

    return {
      corporate: results.filter(c => c.type === 'corporate'),
      individual: results.filter(c => c.type === 'individual'),
    };
  }, [searchQuery, clients, searchFn]);

  // Add loading state
  if (loading) {
    return <div className="flex items-center justify-center h-full">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
    </div>;
  }

  // Add error state
  if (error) {
    return <div className="p-4 text-red-600">
      Error loading clients: {error}
    </div>;
  }

  // ... rest of component (unchanged)
}
```

### Files to Update

1. **`components/onboarding/client-list.tsx`**
   - Lines 10-11: Replace imports
   - Lines 23-39: Update filteredClients logic with hook
   - Lines 41-45: Add loading/error states

2. **`components/onboarding/client-folder.tsx`**
   - Line 2: Update Client type import only
   - No hook needed (receives clients as props)

3. **`components/onboarding/profile-section.tsx`**
   - Line 2: Update Client type import only
   - No hook needed (receives client as prop)

4. **`app/onboarding/page.tsx`**
   - Line 39: Update Client type import
   - Remove any direct client data access if present

5. **`app/test-layout/page.tsx`**
   - Line 2: Update Client type import
   - Add useClientData() if using client list directly

---

## TASK-6: Cleanup

### Files to Delete
- `lib/mock-data/clients.ts` - No longer needed

### Documentation Updates

**`CLAUDE.md`** (add section):
```markdown
## Client Data Storage

Client profile data is stored in file-based JSON format alongside workflow state:
- **Location**: `data/client_state/{clientId}.json`
- **Schema**: `ClientState` interface with embedded `data: Client` field
- **Access**: Via `useClientData()` hook or `/api/client-state` endpoint
- **Migration**: Auto-migrates from mock data on first empty query
```

**`README.md`** (update data section):
```markdown
## Data Storage

### Client State
Client workflow state and profile data:
- **Format**: JSON files per client
- **Location**: `data/client_state/*.json`
- **Schema**: See `lib/workflow/state-store.ts`
- **Fields**: workflow progress + client profile data
```

---

## TASK-7: Testing Strategy

### Test Coverage

**File**: `/tmp/playwright-test-client-migration.js`

**Test Scenarios**:
1. Client list loads from file storage (5 clients)
2. Search filters clients correctly
3. Client type folders work (Corporate/Individual)
4. Client selection loads workflow
5. Profile section displays client data
6. Client data persists across page reloads

**Assertions**:
- Client count === 5
- Search "Acme" returns 1 result
- Corporate folder has 3 clients
- Individual folder has 2 clients
- Selected client data matches JSON file
- No console errors

---

## Integration Reference

### React Component → Hook → API → Storage Flow

```
┌─────────────────────────────────────────────────────┐
│ UI Component (ClientList)                           │
│  └─ useClientData()                                 │
│      ├─ fetch('/api/client-state')                  │
│      ├─ searchClients(query)                        │
│      └─ getClientsByType(type)                      │
└─────────────────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────────┐
│ API Route (/api/client-state)                       │
│  ├─ GET → listClients() → loadClientState()        │
│  ├─ POST update → updateClientState()              │
│  └─ Auto-migration (if empty)                       │
└─────────────────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────────┐
│ File Storage (data/client_state/)                   │
│  ├─ corp-001.json                                   │
│  ├─ corp-002.json                                   │
│  └─ ...                                             │
└─────────────────────────────────────────────────────┘
```

---

## Error Handling

### Scenarios

1. **Migration fails** → Log error, return empty list
2. **API call fails** → Display error message, provide retry button
3. **Invalid JSON file** → Skip file, log warning, continue
4. **Missing client data** → Display placeholder, allow manual entry

---
