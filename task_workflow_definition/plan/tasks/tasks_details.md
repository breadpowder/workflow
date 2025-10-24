# Task Implementation Details - Enhanced Corporate Workflow

**Purpose**: Detailed implementation guidance with pseudocode and integration patterns for each task.

**Last Updated**: 2025-10-24

---

## TASK-1: Document Collection Task Definition (YAML)

### File: `data/tasks/documents/corporate.yaml`

**Complete YAML Structure**:
```yaml
id: task_collect_corporate_documents
name: Collect Corporate Documents
description: Upload required business formation documents for compliance review
version: 1

component_id: form

required_fields:
  - articles_of_incorporation
  - operating_agreement

schema:
  fields:
    # Field 1: Articles of Incorporation
    - name: articles_of_incorporation
      label: "Articles of Incorporation"
      type: file
      required: true
      helpText: "Upload the official Articles of Incorporation filed with your jurisdiction"
      validation:
        accept:
          - application/pdf
          - image/jpeg
          - image/png
        maxSize: 20971520  # 20MB in bytes
        required: true
      placeholder: "Click or drag to upload PDF or image file"

    # Field 2: Operating Agreement
    - name: operating_agreement
      label: "Operating Agreement"
      type: file
      required: true
      helpText: "Upload the signed Operating Agreement or Bylaws"
      validation:
        accept:
          - application/pdf
          - image/jpeg
          - image/png
        maxSize: 20971520  # 20MB
        required: true
      placeholder: "Click or drag to upload PDF or image file"

  layout: single-column
  submitLabel: "Continue to Review"

expected_output_fields:
  - articles_of_incorporation
  - operating_agreement

tags:
  - documents
  - corporate
  - compliance
```

### Key Design Points
- **File type validation**: PDF + images (JPG, PNG)
- **Size limit**: 20MB per file (20,971,520 bytes)
- **Required fields**: Both documents mandatory
- **Component reuse**: Uses existing `form` component with new `type: file` support

---

## TASK-2: Update Corporate Workflow Definition

### File: `data/workflows/corporate_onboarding_v1.yaml`

**Updated Workflow Structure**:
```yaml
id: wf_corporate_v1
name: Corporate Onboarding v1
version: 1
description: Complete onboarding workflow for corporate entities

applies_to:
  client_type: corporate
  jurisdictions: ["US", "CA", "GB"]

# Stages define major phases
stages:
  - id: information_collection
    name: Information Collection
    description: Gather client information and documents

  - id: compliance_review
    name: Compliance Review
    description: Review and verify compliance requirements

steps:
  # Step 1: Collect corporate contact information
  - id: collectContactInfo
    stage: information_collection
    task_ref: contact_info/corporate
    next:
      default: collectDocuments  # ← CHANGED: was "review"

  # Step 2: Collect business documents (NEW STEP)
  - id: collectDocuments
    stage: information_collection  # Same stage as contact info
    task_ref: documents/corporate  # ← NEW: references TASK-1 definition
    next:
      default: review

  # Step 3: Review and submit
  - id: review
    stage: compliance_review
    task_ref: review/summary
    next:
      default: END
```

### Changes Summary
1. **Added step**: `collectDocuments` between `collectContactInfo` and `review`
2. **Updated transition**: `collectContactInfo.next.default` changed from `review` to `collectDocuments`
3. **Stage assignment**: `collectDocuments` belongs to `information_collection` stage

### Workflow Execution Path
```
collectContactInfo (information_collection)
  ↓
collectDocuments (information_collection)
  ↓
review (compliance_review)
  ↓
END
```

### Stage Progress Calculation
- **Stage 1 (information_collection)**: 2 steps (collectContactInfo, collectDocuments)
- **Stage 2 (compliance_review)**: 1 step (review)
- **Total workflow steps**: 3

---

## TASK-3: File Upload API Endpoint

### File: `app/api/upload/route.ts`

**Implementation Pseudocode**:
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { loadClientState, updateClientState, DocumentMetadata } from '@/lib/workflow/state-store';

// Validation constants
const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png'
];
const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB

export async function POST(request: NextRequest) {
  try {
    // 1. Parse multipart form data
    const formData = await request.formData();
    const clientId = formData.get('clientId') as string;
    const documentType = formData.get('documentType') as string;
    const file = formData.get('file') as File;

    // 2. Validate required fields
    if (!clientId || !documentType || !file) {
      return NextResponse.json(
        { error: 'Missing required fields: clientId, documentType, file' },
        { status: 400 }
      );
    }

    // 3. Validate document type
    const validDocTypes = ['articles_of_incorporation', 'operating_agreement'];
    if (!validDocTypes.includes(documentType)) {
      return NextResponse.json(
        { error: `Invalid documentType. Must be one of: ${validDocTypes.join(', ')}` },
        { status: 400 }
      );
    }

    // 4. Validate file type
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return NextResponse.json(
        {
          error: 'File validation failed',
          message: 'Only PDF and image files (JPG, PNG) are allowed'
        },
        { status: 400 }
      );
    }

    // 5. Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        {
          error: 'File validation failed',
          message: `File size exceeds 20MB limit (${(file.size / 1024 / 1024).toFixed(2)}MB)`
        },
        { status: 400 }
      );
    }

    // 6. Create upload directory structure
    const uploadDir = path.join(
      process.cwd(),
      'data',
      'uploads',
      clientId,
      documentType
    );

    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true });
    }

    // 7. Generate safe filename (preserve original name but sanitize)
    const sanitizeFilename = (name: string): string => {
      return name.replace(/[^a-zA-Z0-9.-]/g, '_');
    };
    const safeFilename = sanitizeFilename(file.name);
    const filepath = path.join(uploadDir, safeFilename);
    const relativeFilepath = path.join('uploads', clientId, documentType, safeFilename);

    // 8. Write file to disk
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    await writeFile(filepath, buffer);

    // 9. Create document metadata
    const documentMetadata: DocumentMetadata = {
      type: documentType as 'articles_of_incorporation' | 'operating_agreement',
      filename: file.name,
      filepath: relativeFilepath,
      uploadedAt: new Date().toISOString(),
      fileSize: file.size,
      mimeType: file.type,
      approval_status: 'pending',
    };

    // 10. Update client state with document metadata
    const clientState = await loadClientState(clientId);
    if (!clientState) {
      return NextResponse.json(
        { error: 'Client state not found' },
        { status: 404 }
      );
    }

    // Initialize documents array if not exists
    if (!clientState.collectedInputs.documents) {
      clientState.collectedInputs.documents = [];
    }

    // Remove existing document of same type (allow replacement)
    clientState.collectedInputs.documents = clientState.collectedInputs.documents.filter(
      (doc: DocumentMetadata) => doc.type !== documentType
    );

    // Add new document
    clientState.collectedInputs.documents.push(documentMetadata);

    // Save updated state
    await updateClientState(clientId, {
      collectedInputs: clientState.collectedInputs,
      lastUpdated: new Date().toISOString()
    });

    // 11. Return success response
    return NextResponse.json({
      success: true,
      document: documentMetadata
    });

  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      {
        error: 'Upload failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
```

### Integration Points
1. **File System**: Uses Node.js `fs` module to write files
2. **Client State**: Updates via `updateClientState()` function
3. **Path Handling**: Uses `path.join()` for cross-platform compatibility

### Error Handling
- **400**: Invalid parameters, file validation failure
- **404**: Client state not found
- **500**: File system errors, unexpected errors

---

## TASK-4: TypeScript Types for Document Metadata

### File: `lib/workflow/schema.ts` (additions)

**New Type Definitions**:
```typescript
/**
 * Document upload metadata
 */
export interface DocumentMetadata {
  type: 'articles_of_incorporation' | 'operating_agreement';
  filename: string;          // Original filename
  filepath: string;          // Relative path from project root
  uploadedAt: string;        // ISO-8601 timestamp
  fileSize: number;          // File size in bytes
  mimeType: string;          // MIME type (application/pdf, image/jpeg, image/png)
  approval_status: 'pending' | 'approved' | 'rejected';
  approver_id?: string;      // User ID who approved/rejected
  approval_timestamp?: string; // ISO-8601 timestamp of approval/rejection
  rejection_reason?: string; // Reason for rejection (if rejected)
}

/**
 * File field schema extension
 */
export interface FileFieldSchema extends FieldSchema {
  type: 'file';
  accept?: string[];         // Allowed MIME types
  maxSize?: number;          // Max file size in bytes
  multiple?: boolean;        // Allow multiple files (default: false)
}

/**
 * Extended ClientState with documents support
 */
export interface ClientState {
  clientId: string;
  workflowId: string | null;
  currentStepId: string;
  currentStage?: string | null;
  collectedInputs: {
    documents?: DocumentMetadata[]; // ← NEW: document uploads
    [key: string]: any;
  };
  completedSteps: string[];
  completedStages: string[];
  lastUpdated: string;
  data?: ClientData;
}
```

### Type Usage Examples
```typescript
// In upload API route
import { DocumentMetadata } from '@/lib/workflow/schema';

const doc: DocumentMetadata = {
  type: 'articles_of_incorporation',
  filename: 'articles.pdf',
  filepath: 'uploads/corp-001/articles_of_incorporation/articles.pdf',
  uploadedAt: new Date().toISOString(),
  fileSize: 2048576,
  mimeType: 'application/pdf',
  approval_status: 'pending'
};

// In component
import { DocumentMetadata } from '@/lib/workflow/schema';

interface Props {
  documents: DocumentMetadata[];
}
```

---

## TASK-5: Form Component File Upload Support

### File: `components/onboarding/form-overlay.tsx` (or create new `FileUploadField.tsx`)

**File Upload Field Component Pseudocode**:
```typescript
'use client';

import { useState, useRef, DragEvent, ChangeEvent } from 'react';
import { FileFieldSchema } from '@/lib/workflow/schema';

interface FileUploadFieldProps {
  field: FileFieldSchema;
  value?: any;
  onChange: (name: string, value: any) => void;
  clientId: string;
}

export function FileUploadField({ field, value, onChange, clientId }: FileUploadFieldProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadedFile, setUploadedFile] = useState<any>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Validation function
  const validateFile = (file: File): { valid: boolean; error?: string } => {
    // Check file type
    const allowedTypes = field.accept || [];
    if (allowedTypes.length > 0 && !allowedTypes.includes(file.type)) {
      return {
        valid: false,
        error: `Only ${allowedTypes.map(t => t.split('/')[1]).join(', ')} files are allowed`
      };
    }

    // Check file size
    const maxSize = field.maxSize || Infinity;
    if (file.size > maxSize) {
      const maxMB = (maxSize / 1024 / 1024).toFixed(0);
      return {
        valid: false,
        error: `File size exceeds ${maxMB}MB limit`
      };
    }

    return { valid: true };
  };

  // Handle file upload
  const handleFileUpload = async (file: File) => {
    setError(null);

    // Client-side validation
    const validation = validateFile(file);
    if (!validation.valid) {
      setError(validation.error || 'Invalid file');
      return;
    }

    setUploading(true);

    try {
      // Create FormData
      const formData = new FormData();
      formData.append('clientId', clientId);
      formData.append('documentType', field.name);
      formData.append('file', file);

      // Upload to API
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Upload failed');
      }

      const result = await response.json();

      // Update state
      setUploadedFile(result.document);
      onChange(field.name, result.document);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  // Drag and drop handlers
  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileUpload(files[0]);
    }
  };

  // File picker handler
  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileUpload(files[0]);
    }
  };

  // Click to open file picker
  const handleClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="mb-4">
      {/* Label */}
      <label className="block text-sm font-medium text-gray-700 mb-2">
        {field.label}
        {field.required && <span className="text-red-500 ml-1">*</span>}
      </label>

      {/* Help text */}
      {field.helpText && (
        <p className="text-sm text-gray-500 mb-2">{field.helpText}</p>
      )}

      {/* Upload zone */}
      {!uploadedFile && (
        <div
          className={`
            border-2 border-dashed rounded-lg p-6 text-center cursor-pointer
            transition-colors duration-200
            ${isDragOver ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'}
            ${uploading ? 'opacity-50 pointer-events-none' : ''}
          `}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={handleClick}
        >
          {uploading ? (
            <div className="flex flex-col items-center">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mb-2" />
              <p className="text-sm text-gray-600">Uploading...</p>
            </div>
          ) : (
            <div>
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              <p className="mt-2 text-sm text-gray-600">
                {field.placeholder || 'Drag file here or click to upload'}
              </p>
              <p className="mt-1 text-xs text-gray-500">
                {field.accept && `Accepted: ${field.accept.map(t => t.split('/')[1].toUpperCase()).join(', ')}`}
                {field.maxSize && ` • Max ${(field.maxSize / 1024 / 1024).toFixed(0)}MB`}
              </p>
            </div>
          )}

          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept={field.accept?.join(',')}
            onChange={handleFileChange}
          />
        </div>
      )}

      {/* Uploaded file display */}
      {uploadedFile && (
        <div className="border border-green-300 bg-green-50 rounded-lg p-4 flex items-center justify-between">
          <div className="flex items-center">
            <svg className="h-8 w-8 text-green-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <p className="text-sm font-medium text-gray-900">{uploadedFile.filename}</p>
              <p className="text-xs text-gray-500">
                {(uploadedFile.fileSize / 1024 / 1024).toFixed(2)} MB • Uploaded {new Date(uploadedFile.uploadedAt).toLocaleDateString()}
              </p>
            </div>
          </div>
          <button
            type="button"
            className="text-sm text-blue-600 hover:text-blue-700"
            onClick={() => {
              setUploadedFile(null);
              onChange(field.name, null);
            }}
          >
            Replace
          </button>
        </div>
      )}

      {/* Error message */}
      {error && (
        <p className="mt-2 text-sm text-red-600">{error}</p>
      )}
    </div>
  );
}
```

### Integration with Existing Form Component
```typescript
// In main form component
import { FileUploadField } from './file-upload-field';

function renderField(field: FieldSchema) {
  switch (field.type) {
    case 'text':
      return <TextInput field={field} ... />;
    case 'select':
      return <SelectInput field={field} ... />;
    case 'file':  // ← NEW
      return <FileUploadField field={field as FileFieldSchema} ... />;
    default:
      return null;
  }
}
```

---

## TASK-6: Review Summary Component Enhancement

### File: `components/onboarding/review-summary.tsx` (enhance existing or create)

**Review Table Component Pseudocode**:
```typescript
'use client';

import { useState } from 'react';
import { DocumentMetadata } from '@/lib/workflow/schema';

interface ReviewSummaryProps {
  clientId: string;
  collectedInputs: any;
}

export function ReviewSummaryTable({ clientId, collectedInputs }: ReviewSummaryProps) {
  const [documents, setDocuments] = useState<DocumentMetadata[]>(
    collectedInputs.documents || []
  );
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<DocumentMetadata | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  // Handle approve
  const handleApprove = async (doc: DocumentMetadata) => {
    if (!confirm(`Approve ${doc.filename}?`)) return;

    try {
      const response = await fetch('/api/client-state/documents', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId,
          documentType: doc.type,
          approval_status: 'approved',
          approver_id: 'current-user-id' // TODO: Get from auth context
        })
      });

      if (!response.ok) throw new Error('Approval failed');

      const result = await response.json();

      // Update local state
      setDocuments(docs =>
        docs.map(d => d.type === doc.type ? result.document : d)
      );
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Approval failed');
    }
  };

  // Handle reject
  const handleRejectClick = (doc: DocumentMetadata) => {
    setSelectedDocument(doc);
    setShowRejectModal(true);
  };

  const confirmReject = async () => {
    if (!selectedDocument || !rejectionReason.trim()) {
      alert('Please provide a rejection reason');
      return;
    }

    try {
      const response = await fetch('/api/client-state/documents', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId,
          documentType: selectedDocument.type,
          approval_status: 'rejected',
          approver_id: 'current-user-id', // TODO: Get from auth context
          rejection_reason: rejectionReason
        })
      });

      if (!response.ok) throw new Error('Rejection failed');

      const result = await response.json();

      // Update local state
      setDocuments(docs =>
        docs.map(d => d.type === selectedDocument.type ? result.document : d)
      );

      // Close modal
      setShowRejectModal(false);
      setRejectionReason('');
      setSelectedDocument(null);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Rejection failed');
    }
  };

  // Status badge component
  const StatusBadge = ({ status }: { status: string }) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-800',
      approved: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800'
    };

    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${colors[status as keyof typeof colors]}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  return (
    <div>
      {/* Documents Table */}
      <div className="mb-6">
        <h3 className="text-lg font-medium mb-4">Uploaded Documents</h3>

        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Document Type
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Filename
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Upload Date
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {documents.map((doc) => (
              <tr key={doc.type}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {doc.type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {doc.filename}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {new Date(doc.uploadedAt).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <StatusBadge status={doc.approval_status} />
                  {doc.rejection_reason && (
                    <p className="text-xs text-gray-500 mt-1" title={doc.rejection_reason}>
                      Reason: {doc.rejection_reason.substring(0, 30)}...
                    </p>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  {doc.approval_status === 'pending' && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleApprove(doc)}
                        className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => handleRejectClick(doc)}
                        className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700"
                      >
                        Reject
                      </button>
                    </div>
                  )}
                  {doc.approval_status === 'approved' && (
                    <span className="text-green-600 flex items-center">
                      <svg className="h-5 w-5 mr-1" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      Approved
                    </span>
                  )}
                  {doc.approval_status === 'rejected' && (
                    <span className="text-red-600">Rejected</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {documents.length === 0 && (
          <p className="text-center text-gray-500 py-8">No documents uploaded yet</p>
        )}
      </div>

      {/* Contact Information Summary */}
      <div className="mb-6">
        <h3 className="text-lg font-medium mb-4">Contact Information</h3>
        <dl className="grid grid-cols-2 gap-4">
          <div>
            <dt className="text-sm font-medium text-gray-500">Legal Name</dt>
            <dd className="text-sm text-gray-900">{collectedInputs.legal_name || 'N/A'}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Entity Type</dt>
            <dd className="text-sm text-gray-900">{collectedInputs.entity_type || 'N/A'}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Business Email</dt>
            <dd className="text-sm text-gray-900">{collectedInputs.business_email || 'N/A'}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Business Phone</dt>
            <dd className="text-sm text-gray-900">{collectedInputs.business_phone || 'N/A'}</dd>
          </div>
        </dl>
      </div>

      {/* Rejection Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-medium mb-4">Reject Document</h3>
            <p className="text-sm text-gray-600 mb-4">
              Please provide a reason for rejecting <strong>{selectedDocument?.filename}</strong>
            </p>
            <textarea
              className="w-full border border-gray-300 rounded px-3 py-2 mb-4"
              rows={4}
              placeholder="Reason for rejection..."
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
            />
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => {
                  setShowRejectModal(false);
                  setRejectionReason('');
                  setSelectedDocument(null);
                }}
                className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={confirmReject}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
```

---

## TASK-7: Approval Status Update API

### File: `app/api/client-state/documents/route.ts` (new file)

**Complete Implementation Pseudocode**:
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { loadClientState, saveClientState, DocumentMetadata } from '@/lib/workflow/state-store';

/**
 * PATCH /api/client-state/documents
 *
 * Update document approval status
 */
export async function PATCH(request: NextRequest) {
  try {
    // 1. Parse request body
    const body = await request.json();
    const { clientId, documentType, approval_status, approver_id, rejection_reason } = body;

    // 2. Validate required fields
    if (!clientId || !documentType || !approval_status) {
      return NextResponse.json(
        { error: 'Missing required fields: clientId, documentType, approval_status' },
        { status: 400 }
      );
    }

    // 3. Validate approval_status enum
    const validStatuses = ['pending', 'approved', 'rejected'];
    if (!validStatuses.includes(approval_status)) {
      return NextResponse.json(
        { error: `Invalid approval_status. Must be one of: ${validStatuses.join(', ')}` },
        { status: 400 }
      );
    }

    // 4. Validate rejection requires reason
    if (approval_status === 'rejected' && !rejection_reason) {
      return NextResponse.json(
        { error: 'rejection_reason is required when rejecting a document' },
        { status: 400 }
      );
    }

    // 5. Load client state
    const clientState = await loadClientState(clientId);
    if (!clientState) {
      return NextResponse.json(
        { error: 'Client state not found' },
        { status: 404 }
      );
    }

    // 6. Find document in state
    const documents = clientState.collectedInputs.documents || [];
    const docIndex = documents.findIndex((doc: DocumentMetadata) => doc.type === documentType);

    if (docIndex === -1) {
      return NextResponse.json(
        { error: `Document not found: ${documentType}` },
        { status: 404 }
      );
    }

    // 7. Update document metadata
    const updatedDocument: DocumentMetadata = {
      ...documents[docIndex],
      approval_status,
      approver_id,
      approval_timestamp: new Date().toISOString(),
      rejection_reason: approval_status === 'rejected' ? rejection_reason : undefined
    };

    // 8. Update documents array
    documents[docIndex] = updatedDocument;

    // 9. Save updated client state
    await saveClientState(clientId, {
      ...clientState,
      collectedInputs: {
        ...clientState.collectedInputs,
        documents
      },
      lastUpdated: new Date().toISOString()
    });

    // 10. Return success response
    return NextResponse.json({
      success: true,
      document: updatedDocument
    });

  } catch (error) {
    console.error('Document approval update error:', error);
    return NextResponse.json(
      {
        error: 'Failed to update document approval status',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
```

### API Contract Reference
**Request**:
```json
{
  "clientId": "corp-001",
  "documentType": "articles_of_incorporation",
  "approval_status": "approved",
  "approver_id": "user-001"
}
```

**Response** (200):
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

---

## Testing Integration Points

### End-to-End Test Flow (Playwright)
```typescript
// test/e2e/corporate-workflow-enhanced.spec.ts
import { test, expect } from '@playwright/test';

test('Complete corporate workflow with document upload', async ({ page }) => {
  // 1. Navigate to onboarding
  await page.goto('http://localhost:3002/onboarding');

  // 2. Select Acme Corp
  await page.click('text=Acme Corp');

  // 3. Open contact info form
  await page.click('button:has-text("Open Current Step Form")');
  await expect(page.locator('h2:has-text("Corporate Contact Information")')).toBeVisible();

  // 4. Fill contact info
  await page.fill('input[name="legal_name"]', 'Acme Corporation');
  await page.selectOption('select[name="entity_type"]', 'llc');
  await page.selectOption('select[name="jurisdiction"]', 'US');
  await page.fill('input[name="business_email"]', 'legal@acme.com');
  await page.fill('input[name="business_phone"]', '555-1234');
  await page.click('button:has-text("Continue to Documents")');

  // 5. Upload documents
  await expect(page.locator('h2:has-text("Collect Corporate Documents")')).toBeVisible();

  // Upload articles (drag-drop simulation)
  const articlesInput = page.locator('input[name="articles_of_incorporation"]');
  await articlesInput.setInputFiles('./test/fixtures/articles.pdf');
  await expect(page.locator('text=articles.pdf')).toBeVisible();

  // Upload operating agreement
  const operatingInput = page.locator('input[name="operating_agreement"]');
  await operatingInput.setInputFiles('./test/fixtures/operating-agreement.pdf');
  await expect(page.locator('text=operating-agreement.pdf')).toBeVisible();

  await page.click('button:has-text("Continue to Review")');

  // 6. Review and approve
  await expect(page.locator('h2:has-text("Review Summary")')).toBeVisible();
  await expect(page.locator('table')).toBeVisible();
  await expect(page.locator('text=Articles Of Incorporation')).toBeVisible();
  await expect(page.locator('text=Operating Agreement')).toBeVisible();

  // Approve first document
  await page.click('tr:has-text("Articles Of Incorporation") button:has-text("Approve")');
  await page.click('button:has-text("OK")'); // Confirm dialog
  await expect(page.locator('tr:has-text("Articles Of Incorporation") text=Approved')).toBeVisible();

  // Reject second document
  await page.click('tr:has-text("Operating Agreement") button:has-text("Reject")');
  await page.fill('textarea', 'Missing signature page');
  await page.click('button:has-text("Confirm Rejection")');
  await expect(page.locator('tr:has-text("Operating Agreement") text=Rejected')).toBeVisible();

  // 7. Complete workflow
  await page.click('button:has-text("Confirm and Submit")');
  await expect(page.locator('text=Workflow completed')).toBeVisible();
});
```

---

**All implementation details documented with pseudocode and integration patterns.**
**Ready for implementation phase.**
