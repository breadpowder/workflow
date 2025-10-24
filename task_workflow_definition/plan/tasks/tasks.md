# Task Breakdown - Enhanced Corporate Workflow

**Feature**: Corporate workflow with document collection and review table
**Complexity**: Medium
**Estimated Total**: 12-14 hours (7 tasks × ~2h each)

---

## Task Organization

**Implementation Order** (risk-ordered for incremental value):
1. Data Layer (YAML definitions, schemas)
2. Backend APIs (upload endpoint, state management)
3. Frontend Components (document upload, review table)
4. Integration & Testing

---

## TASK-1: Create Document Collection Task Definition (YAML)

**Title**: Create YAML task definition for document collection

**Description**:
Create new task definition file for collecting corporate documents (Articles of Incorporation and Operating Agreement) with file upload field schemas.

**Type**: Data Model / Configuration

**Priority**: P0 (foundational)

**Dependencies**: None

**Estimated Time**: 1.5 hours

### Acceptance Criteria
- [ ] File created: `data/tasks/documents/corporate.yaml`
- [ ] Task includes 2 file upload fields (articles_of_incorporation, operating_agreement)
- [ ] Field schema includes file validation rules (PDF + images, 20MB max)
- [ ] Component ID set to `form` (reuse existing form component)
- [ ] Required fields defined correctly
- [ ] Expected output fields documented

### Expected Behavior
**Inputs**: None (creating new file)
**Outputs**:
- New YAML file defining document collection schema
- File validation rules embedded in schema

### Manual Verification
**Files to check**:
```bash
cat data/tasks/documents/corporate.yaml
```

**Expected structure**:
- `id: task_collect_corporate_documents`
- `component_id: form`
- `required_fields: [articles_of_incorporation, operating_agreement]`
- `schema.fields[]` contains 2 file upload field definitions
- Validation rules: `accept: ['.pdf', '.jpg', '.png']`, `maxSize: 20971520`

**Validation command**:
```bash
# Check YAML syntax
npx js-yaml data/tasks/documents/corporate.yaml
```

---

## TASK-2: Update Corporate Workflow Definition (YAML)

**Title**: Add collectDocuments step to corporate_onboarding_v1.yaml

**Description**:
Modify existing corporate workflow to include new document collection step between contactInfo and review steps.

**Type**: Data Model / Configuration

**Priority**: P0 (foundational)

**Dependencies**: TASK-1 (needs document task definition)

**Estimated Time**: 1 hour

### Acceptance Criteria
- [ ] File updated: `data/workflows/corporate_onboarding_v1.yaml`
- [ ] New step `collectDocuments` added to workflow
- [ ] Step assigned to `information_collection` stage
- [ ] Step references `task_ref: documents/corporate`
- [ ] Workflow sequence: collectContactInfo → collectDocuments → review → END
- [ ] Step transitions configured correctly

### Expected Behavior
**Inputs**: Existing workflow YAML
**Outputs**: Updated workflow with 3 steps total

**Workflow execution path**:
```
collectContactInfo (info_collection stage)
  ↓ (next.default)
collectDocuments (info_collection stage)
  ↓ (next.default)
review (compliance_review stage)
  ↓ (next.default)
END
```

### Manual Verification
**Files to check**:
```bash
cat data/workflows/corporate_onboarding_v1.yaml
```

**Expected changes**:
- Step count: 2 → 3 steps
- `collectContactInfo.next.default` changed from `review` to `collectDocuments`
- New `collectDocuments` step inserted
- `collectDocuments.next.default` points to `review`

**API verification**:
```bash
curl "http://localhost:3002/api/workflows?client_type=corporate&jurisdiction=US" | jq '.steps | length'
# Expected: 3
```

---

## TASK-3: Implement File Upload API Endpoint

**Title**: Create POST /api/upload endpoint for document uploads

**Description**:
Implement new API endpoint to handle multipart/form-data file uploads with validation, storage to local file system, and client state updates.

**Type**: Backend / API

**Priority**: P0 (core functionality)

**Dependencies**: TASK-1, TASK-2 (needs YAML definitions to validate against)

**Estimated Time**: 2.5 hours

### Acceptance Criteria
- [ ] File created: `app/api/upload/route.ts`
- [ ] POST handler accepts multipart/form-data
- [ ] Validates file type (PDF, JPG, PNG) and size (max 20MB)
- [ ] Saves file to `data/uploads/{clientId}/{documentType}/`
- [ ] Updates client state with document metadata
- [ ] Returns document metadata in response
- [ ] Handles errors (invalid file, missing params, disk full)
- [ ] TypeScript types defined for request/response

### Expected Behavior
**Inputs**:
- `clientId`: "corp-001"
- `documentType`: "articles_of_incorporation"
- `file`: PDF file (5MB)

**Outputs**:
- File saved to: `data/uploads/corp-001/articles_of_incorporation/articles.pdf`
- Client state updated with document metadata
- HTTP 200 response with metadata

**Error cases**:
- Invalid file type → HTTP 400
- File too large → HTTP 400
- Missing clientId → HTTP 400
- Disk write error → HTTP 500

### Manual Verification
**API test with curl**:
```bash
# Test successful upload
curl -X POST http://localhost:3002/api/upload \
  -F "clientId=corp-001" \
  -F "documentType=articles_of_incorporation" \
  -F "file=@test-articles.pdf"

# Expected response (HTTP 200):
{
  "success": true,
  "document": {
    "type": "articles_of_incorporation",
    "filename": "test-articles.pdf",
    "filepath": "uploads/corp-001/articles_of_incorporation/test-articles.pdf",
    "uploadedAt": "2025-10-24T10:30:00.000Z",
    "fileSize": 5242880,
    "mimeType": "application/pdf",
    "approval_status": "pending"
  }
}

# Test file validation
curl -X POST http://localhost:3002/api/upload \
  -F "clientId=corp-001" \
  -F "documentType=articles_of_incorporation" \
  -F "file=@large-file.exe"

# Expected response (HTTP 400):
{
  "error": "File validation failed",
  "message": "Only PDF and image files allowed"
}

# Verify file saved
ls data/uploads/corp-001/articles_of_incorporation/
# Expected: test-articles.pdf

# Verify client state updated
curl "http://localhost:3002/api/client-state?clientId=corp-001" | jq '.collectedInputs.documents'
# Expected: array with 1 document metadata object
```

**Playwright UI test** (after TASK-5 complete):
- Navigate to /onboarding
- Select "Acme Corp"
- Click "Open Current Step Form" (should show document upload form)
- Upload test PDF file via drag-drop
- Verify success message
- Verify file appears in uploaded documents list

---

## TASK-4: Update TypeScript Types for Document Metadata

**Title**: Add document metadata types to schema.ts and client state types

**Description**:
Extend TypeScript type definitions to support document metadata, file upload fields, and approval status tracking.

**Type**: Backend / Type Definitions

**Priority**: P0 (required for type safety)

**Dependencies**: None (can run in parallel with TASK-3)

**Estimated Time**: 1 hour

### Acceptance Criteria
- [ ] File updated: `lib/workflow/schema.ts`
- [ ] New `DocumentMetadata` interface defined
- [ ] New `FileFieldSchema` interface defined (extends FieldSchema)
- [ ] `ClientState` type supports `documents` array in `collectedInputs`
- [ ] Export types for use in API routes and components

### Expected Behavior
**Inputs**: Existing schema.ts file
**Outputs**: Extended type definitions

**New types**:
```typescript
export interface DocumentMetadata {
  type: 'articles_of_incorporation' | 'operating_agreement';
  filename: string;
  filepath: string;
  uploadedAt: string; // ISO-8601
  fileSize: number; // bytes
  mimeType: string;
  approval_status: 'pending' | 'approved' | 'rejected';
  approver_id?: string;
  approval_timestamp?: string; // ISO-8601
  rejection_reason?: string;
}

export interface FileFieldSchema extends FieldSchema {
  type: 'file';
  accept?: string[]; // ['application/pdf', 'image/jpeg', 'image/png']
  maxSize?: number; // bytes
  multiple?: boolean;
}
```

### Manual Verification
**Check TypeScript compilation**:
```bash
cd explore_copilotkit
npm run build
# Expected: no type errors

# Or check specific file
npx tsc --noEmit lib/workflow/schema.ts
# Expected: no errors
```

**Verify types are exported**:
```typescript
// In another file, test import
import { DocumentMetadata, FileFieldSchema } from '@/lib/workflow/schema';
```

---

## TASK-5: Enhance Form Component for File Upload Support

**Title**: Add file upload field type to existing form component

**Description**:
Extend the existing `form` component to support `type: 'file'` fields with drag-and-drop and file picker functionality.

**Type**: Frontend / Component

**Priority**: P0 (user-facing functionality)

**Dependencies**: TASK-1, TASK-4 (needs YAML schema and TypeScript types)

**Estimated Time**: 2.5 hours

### Acceptance Criteria
- [ ] Form component recognizes `type: 'file'` in field schema
- [ ] Renders file upload UI with drag-drop zone
- [ ] Supports click-to-upload (file picker) as fallback
- [ ] Shows visual feedback (drop zone highlighting, loading spinner)
- [ ] Client-side validation (file type, size) before upload
- [ ] Calls `/api/upload` endpoint on file selection
- [ ] Displays uploaded file name and metadata
- [ ] Shows error messages for validation failures
- [ ] Allows file replacement (re-upload)

### Expected Behavior
**User flow**:
1. User sees "Drag file here or click to upload" zone
2. User drags PDF file over zone → zone highlights
3. User drops file → upload starts (spinner shown)
4. Upload succeeds → file name displayed with checkmark icon
5. User can click "Replace" to upload different file

**Validation feedback**:
- File too large → "File size exceeds 20MB limit" error (instant)
- Wrong file type → "Only PDF and image files allowed" error (instant)
- Upload failed → "Upload failed: [error message]" error

### Manual Verification
**UI test**:
```bash
# Start dev server
PORT=3002 npm run dev

# Navigate to http://localhost:3002/onboarding
# Select "Acme Corp"
# Click "Open Current Step Form"
# Verify form shows document collection step
# Verify 2 file upload fields visible (Articles + Operating Agreement)
# Test drag-drop: drag test.pdf file over zone, verify highlighting
# Test drop: drop file, verify upload spinner, verify success message
# Test file picker: click zone, verify file dialog opens
# Test validation: try uploading .exe file, verify error message
# Test validation: try uploading 50MB file, verify error message
```

**Playwright automated test** (create test file after implementation):
```bash
# Run playwright test
npm run test:playwright -- upload-documents.spec.ts

# Test should verify:
# - File upload zone renders
# - Drag-drop highlighting works
# - File upload succeeds
# - Validation errors show correctly
```

**Expected screenshot** (capture for regression):
- `05-document-upload-form.png` - Form with 2 file upload fields
- `06-document-upload-success.png` - After successful upload

---

## TASK-6: Enhance Review Summary Component with Approve/Reject

**Title**: Add approve/reject action buttons to review summary table

**Description**:
Enhance existing `review-summary` component to display uploaded documents in a table with approve/reject action buttons and approval status tracking.

**Type**: Frontend / Component

**Priority**: P0 (user-facing functionality)

**Dependencies**: TASK-4, TASK-5 (needs types and upload working)

**Estimated Time**: 2 hours

### Acceptance Criteria
- [ ] Component updated: `components/onboarding/review-summary.tsx` (or create if missing)
- [ ] Renders table with columns: Document Type, Filename, Upload Date, Status, Actions
- [ ] Shows approval status with color coding (pending=yellow, approved=green, rejected=red)
- [ ] Approve button updates approval_status to 'approved' via API
- [ ] Reject button shows rejection reason modal, updates status to 'rejected'
- [ ] Approval metadata (approver_id, timestamp) tracked
- [ ] Real-time status updates after approve/reject
- [ ] Matches design from ui_spec.md (table layout)

### Expected Behavior
**Table display**:
```
| Document Type           | Filename         | Upload Date | Status   | Actions          |
|------------------------|------------------|-------------|----------|------------------|
| Articles of Inc.       | articles.pdf     | Oct 24      | Pending  | [Approve][Reject]|
| Operating Agreement    | operating.pdf    | Oct 24      | Approved | ✓ Approved       |
```

**Approve action**:
1. User clicks "Approve" button
2. Confirmation dialog: "Approve articles.pdf?"
3. User confirms → API call to update approval status
4. Status changes to "Approved" with green color
5. Action buttons replaced with "✓ Approved by [name]"

**Reject action**:
1. User clicks "Reject" button
2. Modal appears: "Reason for rejection?" (text input)
3. User enters reason → API call to update approval status
4. Status changes to "Rejected" with red color
5. Shows rejection reason on hover

### Manual Verification
**UI test**:
```bash
# Navigate to review step (after uploading documents)
# Verify table shows uploaded documents
# Verify status column shows "Pending" for new uploads
# Click "Approve" on first document
# Verify confirmation dialog appears
# Confirm approval
# Verify status changes to "Approved" (green)
# Verify approve button disappears
# Click "Reject" on second document
# Verify rejection reason modal appears
# Enter "Missing signature page"
# Confirm rejection
# Verify status changes to "Rejected" (red)
# Hover over rejected status, verify reason shown in tooltip
```

**API calls to verify**:
```bash
# After approval, check client state
curl "http://localhost:3002/api/client-state?clientId=corp-001" | jq '.collectedInputs.documents[0]'

# Expected:
{
  "type": "articles_of_incorporation",
  "filename": "articles.pdf",
  "approval_status": "approved",
  "approver_id": "user-001",
  "approval_timestamp": "2025-10-24T11:00:00.000Z"
}
```

**Playwright test**:
- `07-review-table-approve.spec.ts` - Test approve workflow
- `08-review-table-reject.spec.ts` - Test reject workflow with reason
- Screenshot: `08-review-table-with-status.png`

---

## TASK-7: Create API Endpoint for Approval Status Updates

**Title**: Implement PATCH /api/client-state/documents endpoint for approval updates

**Description**:
Create API endpoint to update document approval status (approve/reject) with metadata tracking.

**Type**: Backend / API

**Priority**: P0 (required for TASK-6)

**Dependencies**: TASK-4 (needs DocumentMetadata types)

**Estimated Time**: 1.5 hours

### Acceptance Criteria
- [ ] Endpoint: `PATCH /api/client-state/documents`
- [ ] Accepts: clientId, documentType, approval_status, approver_id, rejection_reason (optional)
- [ ] Updates specific document in client state
- [ ] Adds approval_timestamp automatically (server-side)
- [ ] Validates approval_status enum ('approved' | 'rejected')
- [ ] Returns updated document metadata
- [ ] Handles errors (document not found, invalid status, etc.)

### Expected Behavior
**Inputs** (JSON body):
```json
{
  "clientId": "corp-001",
  "documentType": "articles_of_incorporation",
  "approval_status": "approved",
  "approver_id": "user-001"
}
```

**Outputs** (HTTP 200):
```json
{
  "success": true,
  "document": {
    "type": "articles_of_incorporation",
    "filename": "articles.pdf",
    "filepath": "uploads/corp-001/articles_of_incorporation/articles.pdf",
    "uploadedAt": "2025-10-24T10:30:00.000Z",
    "fileSize": 5242880,
    "mimeType": "application/pdf",
    "approval_status": "approved",
    "approver_id": "user-001",
    "approval_timestamp": "2025-10-24T11:00:00.000Z"
  }
}
```

**Rejection with reason**:
```json
{
  "clientId": "corp-001",
  "documentType": "operating_agreement",
  "approval_status": "rejected",
  "approver_id": "user-001",
  "rejection_reason": "Missing signature page"
}
```

### Manual Verification
**API test**:
```bash
# Test approve
curl -X PATCH http://localhost:3002/api/client-state/documents \
  -H "Content-Type: application/json" \
  -d '{
    "clientId": "corp-001",
    "documentType": "articles_of_incorporation",
    "approval_status": "approved",
    "approver_id": "user-001"
  }'

# Expected: HTTP 200 with updated document metadata

# Test reject
curl -X PATCH http://localhost:3002/api/client-state/documents \
  -H "Content-Type: application/json" \
  -d '{
    "clientId": "corp-001",
    "documentType": "operating_agreement",
    "approval_status": "rejected",
    "approver_id": "user-001",
    "rejection_reason": "Missing signature page"
  }'

# Expected: HTTP 200 with updated document metadata including rejection_reason

# Verify client state persisted
curl "http://localhost:3002/api/client-state?clientId=corp-001" | jq '.collectedInputs.documents'

# Expected: both documents with approval statuses
```

**Error case tests**:
```bash
# Document not found
curl -X PATCH http://localhost:3002/api/client-state/documents \
  -H "Content-Type: application/json" \
  -d '{
    "clientId": "corp-001",
    "documentType": "nonexistent",
    "approval_status": "approved"
  }'
# Expected: HTTP 404

# Invalid status
curl -X PATCH http://localhost:3002/api/client-state/documents \
  -H "Content-Type: application/json" \
  -d '{
    "clientId": "corp-001",
    "documentType": "articles_of_incorporation",
    "approval_status": "invalid"
  }'
# Expected: HTTP 400
```

---

## Task Summary

| Task | Type | Priority | Estimated Time | Dependencies |
|------|------|----------|----------------|--------------|
| TASK-1 | Data Model | P0 | 1.5h | None |
| TASK-2 | Data Model | P0 | 1h | TASK-1 |
| TASK-3 | Backend API | P0 | 2.5h | TASK-1, TASK-2 |
| TASK-4 | Type Definitions | P0 | 1h | None (parallel with TASK-3) |
| TASK-5 | Frontend | P0 | 2.5h | TASK-1, TASK-4 |
| TASK-6 | Frontend | P0 | 2h | TASK-4, TASK-5 |
| TASK-7 | Backend API | P0 | 1.5h | TASK-4 |

**Total Estimated Time**: 12 hours

**Implementation Phases**:
1. **Phase 1 - Data Layer** (2.5h): TASK-1, TASK-2, TASK-4 (parallel)
2. **Phase 2 - Backend** (4h): TASK-3, TASK-7
3. **Phase 3 - Frontend** (4.5h): TASK-5, TASK-6
4. **Phase 4 - Testing & Validation** (1h): End-to-end tests, screenshot updates

---

## Testing Strategy

### Unit Tests
- [ ] File upload validation logic
- [ ] Document metadata update logic
- [ ] YAML schema parsing

### Integration Tests
- [ ] Upload API with mock file system
- [ ] Approval status update API
- [ ] Client state persistence

### End-to-End Tests (Playwright)
- [ ] Complete workflow: contact info → documents → review → approve/reject
- [ ] File upload drag-drop interaction
- [ ] Approval/rejection workflow
- [ ] Error handling (invalid files, network errors)

### Regression Tests
- [ ] Existing workflow still works (collectContactInfo → review)
- [ ] Other client types (individual) unaffected
- [ ] UI spec screenshots still match (update with new screens)

---

**All tasks follow 2-hour rule (max 2.5h for complex tasks).**
**Each task has clear acceptance criteria and manual verification steps.**
**Dependencies mapped for parallel execution where possible.**
