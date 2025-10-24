# Task Scope - Workflow Definition Enhancement

**Created**: 2025-10-24
**Status**: Scoped and Ready

---

## ✅ What's Already Implemented (Don't Need to Touch)

### Step Progression Logic
- **File**: `lib/hooks/useWorkflowState.tsx`
- **Status**: ✅ Fully implemented
- **Capabilities**:
  - Loads workflow machine from `/api/workflows`
  - Loads client state from `/api/client-state`
  - Automatically determines `currentStepId` and `currentStage`
  - `goToNextStep()` - Executes transitions and updates state
  - Auto-saves inputs to client state with debouncing
  - Progress tracking (workflow and stage level)

### UI Rendering Based on State
- **File**: `app/onboarding/page.tsx`
- **Status**: ✅ Already uses `useWorkflowState` hook
- **How it works**:
  1. Hook provides `workflow.currentStep` (from client_state.currentStepId)
  2. `currentStep.task_definition` contains schema
  3. `currentStep.component_id` determines which UI component to render
  4. Component registry resolves `component_id` → React component

### Component Registry Pattern
- **File**: `lib/ui/component-registry.ts`
- **Status**: ✅ Implemented
- **How it works**: Maps `component_id` (from task YAML) to React components

### Form Overlay System
- **File**: `components/onboarding/form-overlay.tsx`
- **Status**: ✅ Implemented
- **Behavior**: Slides in from right, backdrop, ESC to close

---

## 🎯 What We Need to Add (Scoped Task)

### 1. YAML Definitions (Data Model)
**New Files**:
- `data/tasks/documents/corporate.yaml` - Document collection task schema
  - 2 file upload fields (articles, operating agreement)
  - Field type: `file`
  - Validation rules embedded in schema

**Modified Files**:
- `data/workflows/corporate_onboarding_v1.yaml` - Add `collectDocuments` step
  - Insert between `collectContactInfo` and `review`
  - Stage: `information_collection`

**Modified Files (Review Table)**:
- `data/tasks/review/summary.yaml` - Enhance to show documents table
  - Current: basic summary sections
  - Add: documents array rendering, approve/reject actions

---

### 2. Backend APIs

**New Endpoint**: POST `/api/upload`
- Purpose: Handle file uploads (multipart/form-data)
- Storage: `data/uploads/{clientId}/{documentType}/`
- Updates: client_state.collectedInputs.documents[]
- Validation: File type (PDF, JPG, PNG), size (20MB)

**New Endpoint**: PATCH `/api/client-state/documents`
- Purpose: Update document approval status
- Updates: specific document's `approval_status`, `approver_id`, `approval_timestamp`

---

### 3. Frontend Components

**Enhance Existing**: Form component (add `type: file` support)
- **File**: `components/onboarding/form-overlay.tsx` or create `FileUploadField.tsx`
- **Capability**: Render file upload fields from schema
- **Features**: Drag-drop + file picker, client-side validation

**Enhance Existing**: Review Summary component
- **File**: `components/onboarding/review-summary.tsx` (or similar)
- **Add**: Table with documents, approve/reject buttons
- **Actions**: Call PATCH API to update approval status

---

### 4. TypeScript Types

**Extend**: `lib/workflow/schema.ts`
- Add `DocumentMetadata` interface
- Add `FileFieldSchema` interface
- Extend `ClientState.collectedInputs` to support `documents[]`

---

## 📋 Simplified Task Breakdown (5 Tasks, ~10h)

| Task | Description | Type | Time | Why Needed |
|------|-------------|------|------|------------|
| **TASK-1** | Create document collection YAML | Data | 1.5h | Define new step schema |
| **TASK-2** | Update workflow YAML + review task | Data | 1h | Add collectDocuments step |
| **TASK-3** | File upload API endpoint | Backend | 2.5h | Handle uploads & storage |
| **TASK-4** | Document approval API endpoint | Backend | 1.5h | Update approval status |
| **TASK-5** | File upload + review table UI | Frontend | 3.5h | User-facing components |

**Total**: ~10 hours (reduced from 12h - removed orchestration tasks)

---

## 🔄 How It Works (End-to-End Flow)

### Initial State (Existing Client)
```json
// Client state in data/client_state/corp-001.json
{
  "clientId": "corp-001",
  "currentStepId": "collectContactInfo",  // ← Set by useWorkflowState
  "currentStage": "information_collection",
  "collectedInputs": {},
  "completedSteps": []
}
```

### After Completing Contact Info
```json
{
  "clientId": "corp-001",
  "currentStepId": "collectDocuments",  // ← Auto-updated by goToNextStep()
  "currentStage": "information_collection",
  "collectedInputs": {
    "legal_name": "Acme Corp",
    "business_email": "legal@acme.com",
    // ... contact info
  },
  "completedSteps": ["collectContactInfo"]
}
```

### After Uploading Documents
```json
{
  "clientId": "corp-001",
  "currentStepId": "review",  // ← Auto-updated by goToNextStep()
  "currentStage": "compliance_review",
  "collectedInputs": {
    // ... contact info
    "documents": [  // ← Added by upload API
      {
        "type": "articles_of_incorporation",
        "filename": "articles.pdf",
        "filepath": "uploads/corp-001/articles_of_incorporation/articles.pdf",
        "uploadedAt": "2025-10-24T10:30:00.000Z",
        "fileSize": 2048576,
        "mimeType": "application/pdf",
        "approval_status": "pending"
      }
    ]
  },
  "completedSteps": ["collectContactInfo", "collectDocuments"]
}
```

### UI Rendering Logic (Already Exists!)
```typescript
// In app/onboarding/page.tsx (existing code)
const workflow = useWorkflowState({
  clientId: selectedClient.id,
  client_type: selectedClient.type,
  jurisdiction: "US"
});

// workflow.currentStep.component_id determines which component to render
// Component registry: component_id → React component
// Schema-driven: workflow.currentStep.schema → component props
```

---

## ✨ Key Insight

**We don't need to build orchestration** - it's already there!

1. ✅ `useWorkflowState` hook reads `client_state.currentStepId`
2. ✅ Hook loads workflow machine and finds current step
3. ✅ `workflow.currentStep` provides schema and component_id
4. ✅ UI renders the right component based on component_id
5. ✅ When user completes step, `goToNextStep()` updates client_state

**We just add**:
- New YAML step definitions (orchestration already handles them)
- Upload API (to save documents to client_state)
- File upload UI component (schema-driven, registry handles it)

---

## 🎯 What This Means for Implementation

**Don't Build**:
- ❌ Step progression logic (exists)
- ❌ State management (exists)
- ❌ Component registry (exists)
- ❌ Form overlay system (exists)

**Just Add**:
- ✅ YAML definitions (new step + task schemas)
- ✅ Upload API (file storage + state update)
- ✅ File upload field component (new field type)
- ✅ Review table component (enhance existing)

**Result**: Much simpler implementation, leverages existing infrastructure!
