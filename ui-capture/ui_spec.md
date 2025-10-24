# UI Specification: Client Onboarding Workflow

**Generated**: 2025-10-24T06:03:00.000Z (Updated)
**Application**: Client Onboarding System
**Page**: /onboarding
**Test Environment**: http://localhost:3002
**Purpose**: Reference for automated testing and regression validation

---

## 1. Overview

This specification captures the verified working UI behavior for the Client Onboarding page.
All features have been tested and verified on http://localhost:3002.

**Status**: ✅ All critical features verified working

---

## 2. Initial Page Load

### Layout
- Three-panel layout:
  - **Left**: Client list with search
  - **Center**: Client details (shown after selection)
  - **Right**: Chat panel for onboarding assistance
- Page title: "Composable Onboarding POC"

### Verified Elements
- ✅ Client list loads automatically (6 clients total)
- ✅ Search box visible at top
- ✅ Clients grouped by type (Corporate/Individual)

**Screenshot**: `01-initial-load.png`

---

## 3. Client List (Left Panel)

### Elements
- Search input (placeholder: "Search clients...")
- **Corporate Clients** (3 clients):
  - Acme Corp (active)
  - GreenTech Industries (pending, medium risk)
  - TechStart Ventures (review, high risk)
- **Individual Clients** (2 clients):
  - John Smith (active)
  - Sarah Johnson (complete)

### Each Client Button Shows
- Client name
- Status badge (active/pending/review/complete)
- Risk indicator (corporate only)
- Avatar with initial

### Search Functionality
- Real-time filtering
- Searches: name, email, client ID
- Maintains grouping structure

**Screenshot**: `03-search-acme.png` - Shows search filtering

---

## 4. Client Selection

### Behavior
1. Click client → Details load in center panel
2. Selected button highlighted (blue background)
3. Center panel shows:
   - Client header (name, avatar, email)
   - Client details card
   - **Workflow Status section**
   - **"Open Current Step Form" button** (bottom right)

### Example: Acme Corp
- Type: Corporate
- Status: Active
- Risk Level: Low
- Jurisdiction: US
- Entity Type: LLC
- Created: 2025-10-15
- Last Activity: 2025-10-22

**Screenshot**: `04-client-selected.png`

---

## 5. Workflow Status Section

### Elements
- Section heading: "Workflow Status"
- Field completion count: "0 of 5 fields"
- Required fields list:
  - Legal Name (Pending)
  - Entity Type (Pending)
  - Jurisdiction (Pending)
  - Business Email (Pending)
  - Business Phone (Pending)

**Screenshot**: `05-workflow-status.png`

### ⚠️ Regression Test #1
**Test**: After client selection, "Workflow Status" section MUST be visible

**Bug History**:
- **Issue**: Section missing after file-based client data migration
- **Root Cause**: Invalid `workflowId` and `currentStepId` in client state files
- **Fix**: Corrected JSON files with proper IDs from workflow API (commit `97fdbb9`)
- **Status**: ✅ FIXED

---

## 6. Form Button

### Specifications
- **Location**: Bottom right of center panel
- **Text**: "Open Current Step Form"
- **Style**: Blue button (`bg-blue-600`)
- **Position**: `absolute bottom-24 right-8`

### Button Details
```json
{
  "text": "Open Current Step Form",
  "visible": true,
  "position": {
    "bottom": "6rem",
    "right": "2rem"
  }
}
```

**Screenshot**: `06-button-before-click.png` - Shows button at bottom right

### Interaction
- Click button → Form appears in Chat panel (right side)
- Chat shows: "Opening form: Corporate Contact Information..."
- User interacts with form through chat interface
- After completion: "Form closed. You can resume the conversation."

### ⚠️ Regression Test #2
**Test**: Form button MUST appear and be clickable after client selection

**Bug History**:
- **Issue**: Button missing/non-functional after migration
- **Root Cause**: Invalid workflow state caused `workflow.currentStep` to be null
- **Fix**: Fixed migration utility + validation (commit `97fdbb9`, `8508578`)
- **Status**: ✅ FIXED

---

## 7. Chat Panel (Right Side)

### Elements
- Heading: "Chat"
- Subtitle: "Ask questions about the onboarding process"
- Chat messages with timestamps
- Message input field
- Send button

### Integration
- CopilotKit AI-powered assistance
- Form interaction notifications
- Onboarding guidance

---

## 8. Critical User Flows

### Flow 1: View Client Workflow Status ✅
1. Navigate to `/onboarding`
2. Wait for client list to load
3. Click "Acme Corp"
4. **Assert**: Client details panel appears
5. **Assert**: "Workflow Status" section visible
6. **Assert**: Field count displayed ("0 of 5 fields")

### Flow 2: Open Current Step Form ✅
1. Select client (Flow 1 steps 1-3)
2. **Assert**: "Open Current Step Form" button visible at bottom right
3. Click button
4. **Assert**: Chat panel shows form notification
5. **Assert**: Form interaction available

### Flow 3: Search Clients ✅
1. Navigate to `/onboarding`
2. Enter "Acme" in search box
3. **Assert**: Filtered results show only "Acme Corp"
4. Clear search
5. **Assert**: All clients restored (6 total)

---

## 9. Known Issues (Historical)

### Issue #1: Workflow Status Missing ✅ FIXED
- **Symptom**: Section not visible after client selection
- **Root Cause**: Client state files had invalid workflow IDs
  - Hardcoded: `workflowId: 'corporate_onboarding_v1'`, `currentStepId: 'start'`
  - API returned: `workflowId: null`, `currentStepId: 'collectContactInfo'`
- **Fix**: Corrected `data/client_state/*.json` files
- **Commit**: `97fdbb9`

### Issue #2: Form Button Missing ✅ FIXED
- **Symptom**: Button not rendering
- **Root Cause**: `workflow.currentStep` was null due to invalid state
- **Fix**: Fixed migration utility to use correct workflow IDs
- **Commit**: `97fdbb9`

### Issue #3: Validation Too Strict ✅ FIXED
- **Symptom**: Server logs: "Invalid state file for client corp-001"
- **Root Cause**: Validation rejected `workflowId: null` (but API returns null)
- **Fix**: Updated `lib/workflow/state-store.ts` line 102
  - Changed: `if (!state.clientId || !state.currentStepId)`
  - Removed: `!state.workflowId` check
- **Commit**: `8508578`

---

## 10. Data Schema

### Client State File (`data/client_state/*.json`)

```json
{
  "clientId": "string (required, matches filename)",
  "workflowId": "string | null (can be null)",
  "currentStepId": "string (required)",
  "currentStage": "string | null",
  "collectedInputs": {},
  "completedSteps": [],
  "completedStages": [],
  "lastUpdated": "ISO-8601 timestamp",
  "data": {
    "id": "string",
    "name": "string",
    "type": "corporate | individual",
    "status": "active | pending | review | complete",
    "email": "string",
    "risk": "low | medium | high",
    "entityType": "string",
    "jurisdiction": "string",
    "createdAt": "YYYY-MM-DD",
    "lastActivity": "YYYY-MM-DD"
  }
}
```

### Validation Rules
- `clientId` must match filename (e.g., `corp-001.json`)
- `currentStepId` must exist in workflow definition
- `workflowId` can be null (API returns null)
- `data` object required with full client profile

---

## 11. Test Checklist

### Critical Tests
- [x] Client list loads with 5+ clients
- [x] Search filters clients correctly
- [x] Client selection updates center panel
- [x] "Workflow Status" section appears after selection
- [x] Field count displays correctly
- [x] "Open Current Step Form" button appears at bottom right
- [x] Button is clickable and triggers form in chat

### Regression Tests
- [x] Workflow Status section visible (prevents Issue #1)
- [x] Form button visible and functional (prevents Issue #2)
- [x] Client state files validate correctly (prevents Issue #3)

---

## 12. Screenshot Reference

| Filename | Description | Status |
|----------|-------------|--------|
| `01-initial-load.png` | Initial page load | ✅ |
| `03-search-acme.png` | Search results filtered | ✅ |
| `04-client-selected.png` | Acme Corp selected | ✅ |
| `05-workflow-status.png` | Workflow Status section | ✅ |
| `06-button-before-click.png` | Button at bottom right | ✅ |

---

## 13. Technical Details

### Stack
- **Framework**: Next.js 15.5.6
- **UI**: React 18+
- **AI**: CopilotKit
- **State**: File-based JSON storage
- **Workflow**: YAML-driven composable workflows

### Key Files
- `app/onboarding/page.tsx` - Main onboarding page
- `lib/workflow/state-store.ts` - State persistence (line 102 validation fix)
- `lib/hooks/useClientData.tsx` - Client data hook
- `components/onboarding/workflow-status-section.tsx` - Workflow Status UI
- `data/client_state/*.json` - Client state files (5 files)

---

## 14. Change Log

| Date | Change | Commit |
|------|--------|--------|
| 2025-10-24 | Initial specification | - |
| 2025-10-24 | Fixed Workflow Status missing | `97fdbb9` |
| 2025-10-24 | Fixed Form button missing | `97fdbb9` |
| 2025-10-24 | Fixed validation too strict | `8508578` |
| 2025-10-24 | Updated spec to match actual screenshots | - |

---

**End of Specification**

*All critical regression tests passing. Screenshots current as of 2025-10-24.*
