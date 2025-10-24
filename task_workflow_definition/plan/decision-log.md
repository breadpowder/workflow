# Decision Log - Enhanced Corporate Workflow

**Feature**: Corporate workflow enhancement with document collection and review table
**Date**: 2025-10-24

---

## Decision #1: Document Types (Confirmed)

**Context**: Need to define which documents to collect in information_collection stage

**Options Considered**:
1. Predefined fixed list
2. Dynamic/configurable list
3. Hybrid (required + optional)

**Decision**: **Fixed list for POC** - Articles of Incorporation and Operating Agreement

**Rationale**:
- Simplest to implement for POC
- Covers core compliance documents
- Can expand to dynamic list in P1

**Implementation**:
- Add to YAML task schema as fixed fields
- Two separate upload fields in form component

---

## Decision #2: Review Table Actions (Confirmed)

**Context**: Compliance review stage needs table with actionable items

**Options Considered**:
1. View-only (no actions)
2. Edit/Delete capabilities
3. Approve/Reject workflow actions
4. All of the above

**Decision**: **Approve/Reject actions only**

**Rationale**:
- Matches user requirement for compliance officer workflow
- Simpler UX than full CRUD
- Clear audit trail (who approved/rejected what)

**Implementation**:
- Add `approval_status` field to document metadata
- Add `approver_id` and `approval_timestamp` for audit
- UI shows approve/reject buttons per row
- Approval is metadata only (doesn't gate workflow progression)

---

## Decision #3: File Upload UX (Confirmed)

**Context**: Document collection step needs user-friendly upload mechanism

**Options Considered**:
1. File picker only (traditional)
2. Drag-and-drop only (modern)
3. Both (flexible)

**Decision**: **Both drag-and-drop and file picker**

**Rationale**:
- Best user experience - accommodates all user preferences
- Drag-and-drop for power users
- File picker for traditional users
- Industry standard pattern

**Implementation**:
- Use HTML5 File API for drag-drop
- Fallback `<input type="file">` for click-to-upload
- Visual feedback (drop zone highlighting)

---

## Decision #4: Stage Structure (Confirmed)

**Context**: Whether to add separate Finalization stage or keep 2 stages

**Options Considered**:
1. Keep 2 stages (Info Collection + Compliance Review)
2. Add 3rd stage (Finalization)

**Decision**: **Keep 2 stages**

**Rationale**:
- Review/summary is part of compliance review process
- Simpler workflow visualization
- Matches user preference

**Implementation**:
- `review` step remains in `compliance_review` stage
- Stage progress shows 3 steps total in workflow

**Workflow Structure**:
```
Stage 1: information_collection
  - collectContactInfo
  - collectDocuments

Stage 2: compliance_review
  - review (with approve/reject table)
```

---

## Decision #5: File Storage (User Confirmed)

**Context**: Where to store uploaded documents for POC

**Options Considered**:
1. Local file system under `data/uploads/{clientId}/`
2. Base64 encode in JSON (not recommended for large files)
3. Mock storage (metadata only)

**Decision**: **Local file system** (`data/uploads/{clientId}/`)

**Rationale**:
- Simple for POC
- Clear file organization by client
- Easy to migrate to cloud storage (S3, Azure Blob) in P1
- Supports file size validation and streaming

**Implementation**:
- Create directory structure: `data/uploads/{clientId}/{documentType}/`
- Store original filename and metadata in client state JSON
- File path reference: `uploads/{clientId}/{documentType}/{filename}`

**Migration Path to Production**:
```typescript
// POC: Local file system
const uploadPath = `data/uploads/${clientId}/${documentType}/${filename}`;

// P1: Cloud storage (example)
const uploadPath = await s3.upload({
  Bucket: 'client-documents',
  Key: `${clientId}/${documentType}/${filename}`,
  Body: fileStream
});
```

---

## Decision #6: File Validation Rules (User Confirmed)

**Context**: Need to validate uploaded files for security and size

**Options Considered**:
1. PDF only, 10MB per file, 25MB total (strict)
2. PDF + images (jpg, png), 20MB per file (flexible)
3. Any file type, no limit (permissive)

**Decision**: **PDF + images (jpg, png), 20MB per file**

**Rationale**:
- Covers both digital PDFs and scanned document images
- 20MB accommodates high-quality scans
- Reasonable limit for POC

**Implementation**:
- Server-side validation in upload API
- Client-side validation for UX (instant feedback)
- Validation rules:
  - **Allowed MIME types**: `application/pdf`, `image/jpeg`, `image/png`
  - **Max file size**: 20MB (20,971,520 bytes)
  - **File count**: Up to 2 files per document type
  - **Total per client**: No hard limit (reasonable use assumed for POC)

**Validation Pseudocode**:
```typescript
function validateUploadedFile(file: File): ValidationResult {
  const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png'];
  const maxSize = 20 * 1024 * 1024; // 20MB

  if (!allowedTypes.includes(file.type)) {
    return { valid: false, error: 'Only PDF and image files allowed' };
  }

  if (file.size > maxSize) {
    return { valid: false, error: 'File size exceeds 20MB limit' };
  }

  return { valid: true };
}
```

---

## Decision #7: Approval Workflow Gating (User Confirmed)

**Context**: Should compliance approval block workflow completion?

**Options Considered**:
1. Metadata only (don't gate workflow)
2. Gate workflow (require approval to complete)
3. Hybrid (warn but allow override)

**Decision**: **Metadata only** (don't gate workflow progression)

**Rationale**:
- POC simplicity - avoid complex state machine logic
- Approval tracking provides audit trail
- Workflow can complete even if items pending approval
- Role-based gating deferred to P1

**Implementation**:
- Add `approval_status` field to document metadata:
  - `pending` (default)
  - `approved`
  - `rejected`
- Add `approver_id`, `approval_timestamp`, `rejection_reason`
- Review step does NOT check approval status before allowing transition to END
- UI shows approval status visually (color coding, icons)

**Client State Schema Addition**:
```typescript
interface DocumentMetadata {
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
```

**P1 Enhancement Path** (Future):
- Add `requireAllApprovalsToComplete` flag to workflow definition
- Engine function `canTransitionFrom()` checks approval status
- Block progression if any documents have `approval_status: 'rejected'` or `'pending'`

---

## Decision #8: Component Architecture

**Context**: Need to choose UI component pattern for document upload and review table

**Options Considered**:
1. Create new specialized components (`document-upload-form`, `review-table`)
2. Use schema-driven generic components (`form`, `table`)
3. Hybrid (reuse `form`, create custom `review-summary-table`)

**Decision**: **Hybrid approach** - reuse `form` component for uploads, create custom `review-summary` component

**Rationale**:
- Document upload fits schema-driven form pattern (fields = file upload inputs)
- Review summary has custom layout requirements (table + action buttons)
- Aligns with existing architecture (schema-driven where possible, custom where needed)

**Implementation**:
1. **Document Upload**: Use existing `form` component with new field type `file`
2. **Review Summary**: Create new `review-summary` component (already exists, enhance it)

**Component Registry**:
```typescript
const componentRegistry = {
  'form': DynamicForm,                    // Existing - reuse for document upload
  'review-summary': ReviewSummaryTable,   // Existing - enhance with approve/reject
};
```

---

## Decision #9: API Endpoint Design

**Context**: Need API endpoint for document uploads

**Options Considered**:
1. Single endpoint `/api/upload` with clientId and documentType params
2. Separate endpoints per document type `/api/upload/articles`, `/api/upload/operating-agreement`
3. Use existing `/api/client-state` with file upload support

**Decision**: **New endpoint `/api/upload` with multipart/form-data**

**Rationale**:
- Clear separation of concerns (state management vs. file uploads)
- Standard multipart/form-data pattern for file uploads
- Flexible for multiple document types
- Can add authentication/authorization middleware easily

**API Contract**:
```
POST /api/upload

Headers:
  Content-Type: multipart/form-data

Body (FormData):
  - clientId: string (required)
  - documentType: 'articles_of_incorporation' | 'operating_agreement' (required)
  - file: File (required)

Success Response (200):
{
  "success": true,
  "document": {
    "type": "articles_of_incorporation",
    "filename": "acme-articles.pdf",
    "filepath": "uploads/corp-001/articles_of_incorporation/acme-articles.pdf",
    "uploadedAt": "2025-10-24T10:30:00.000Z",
    "fileSize": 2048576,
    "mimeType": "application/pdf",
    "approval_status": "pending"
  }
}

Error Response (400):
{
  "error": "File validation failed",
  "message": "File size exceeds 20MB limit"
}
```

**Client State Update**:
- After successful upload, update client state to include document metadata
- Add to `collectedInputs.documents` array

---

## Decision Summary Table

| # | Decision | Selected Option | Rationale | Impact |
|---|----------|----------------|-----------|--------|
| 1 | Document Types | Articles + Operating Agreement (fixed) | POC simplicity | YAML schema |
| 2 | Review Actions | Approve/Reject only | Compliance workflow need | Backend + UI |
| 3 | Upload UX | Drag-drop + file picker (both) | Best UX | Frontend component |
| 4 | Stage Structure | Keep 2 stages | User preference | YAML workflow |
| 5 | File Storage | Local file system | POC simplicity, clear migration path | Backend API |
| 6 | File Validation | PDF + images, 20MB/file | Flexibility for scans | Backend + Frontend |
| 7 | Approval Gating | Metadata only (no gating) | POC simplicity | Backend logic |
| 8 | Component Pattern | Hybrid (form + custom review) | Leverage existing architecture | Frontend |
| 9 | API Design | New `/api/upload` endpoint | Separation of concerns | Backend API |

---

**All decisions confirmed and documented.**
**Ready to proceed with task breakdown.**
