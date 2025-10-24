import { NextRequest, NextResponse } from 'next/server';
import { loadClientState, saveClientState } from '@/lib/workflow/state-store';
import type { DocumentMetadata } from '@/lib/workflow/schema';

/**
 * PATCH /api/client-state/documents
 *
 * Update document approval status
 *
 * Request body (JSON):
 * - clientId: string
 * - documentType: 'articles_of_incorporation' | 'operating_agreement'
 * - approval_status: 'approved' | 'rejected'
 * - approver_id: string
 * - rejection_reason?: string (required if status is 'rejected')
 *
 * Response:
 * - success: boolean
 * - document: DocumentMetadata (updated)
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
      rejection_reason: approval_status === 'rejected' ? rejection_reason : undefined,
    };

    // 8. Update documents array
    documents[docIndex] = updatedDocument;

    // 9. Save updated client state
    await saveClientState(clientId, {
      ...clientState,
      collectedInputs: {
        ...clientState.collectedInputs,
        documents,
      },
      lastUpdated: new Date().toISOString(),
    });

    // 10. Return success response
    return NextResponse.json({
      success: true,
      document: updatedDocument,
    });
  } catch (error) {
    console.error('Document approval update error:', error);
    return NextResponse.json(
      {
        error: 'Failed to update document approval status',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
