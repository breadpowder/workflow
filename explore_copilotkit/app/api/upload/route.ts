import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { loadClientState, updateClientState } from '@/lib/workflow/state-store';
import type { DocumentMetadata } from '@/lib/workflow/schema';

// Validation constants
const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
];
const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB

/**
 * POST /api/upload
 *
 * Handle file uploads for document collection
 *
 * Request (multipart/form-data):
 * - clientId: string
 * - documentType: 'articles_of_incorporation' | 'operating_agreement'
 * - file: File
 *
 * Response:
 * - success: boolean
 * - document: DocumentMetadata
 */
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
          message: 'Only PDF and image files (JPG, PNG) are allowed',
        },
        { status: 400 }
      );
    }

    // 5. Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        {
          error: 'File validation failed',
          message: `File size exceeds 20MB limit (${(file.size / 1024 / 1024).toFixed(2)}MB)`,
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
      lastUpdated: new Date().toISOString(),
    });

    // 11. Return success response
    return NextResponse.json({
      success: true,
      document: documentMetadata,
    });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      {
        error: 'Upload failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
