import { NextRequest, NextResponse } from 'next/server';
import {
  saveClientState,
  loadClientState,
  listClients,
  deleteClientState,
  initializeClientState,
  updateClientState,
  ClientState,
} from '@/lib/workflow/state-store';

/**
 * GET /api/client-state?clientId=xxx
 *
 * Load client state by ID, or list all clients if no ID provided
 */
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

      return NextResponse.json(state);
    } else {
      // List all clients
      const clients = await listClients();
      return NextResponse.json({ clients });
    }
  } catch (error) {
    console.error('Error loading client state:', error);
    return NextResponse.json(
      {
        error: 'Failed to load client state',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/client-state
 *
 * Create or update client state
 *
 * Body:
 * - action: "initialize" | "save" | "update"
 * - clientId: string
 * - (for initialize) workflowId: string, initialStepId: string
 * - (for save) state: ClientState
 * - (for update) updates: Partial<ClientState>
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, clientId } = body;

    if (!action || !clientId) {
      return NextResponse.json(
        { error: 'Missing required fields: action, clientId' },
        { status: 400 }
      );
    }

    switch (action) {
      case 'initialize': {
        const { workflowId, initialStepId } = body;

        if (!workflowId || !initialStepId) {
          return NextResponse.json(
            { error: 'Missing required fields: workflowId, initialStepId' },
            { status: 400 }
          );
        }

        const state = await initializeClientState(
          clientId,
          workflowId,
          initialStepId
        );

        return NextResponse.json(state);
      }

      case 'save': {
        const { state } = body;

        if (!state) {
          return NextResponse.json(
            { error: 'Missing required field: state' },
            { status: 400 }
          );
        }

        await saveClientState(clientId, state as ClientState);

        return NextResponse.json({
          success: true,
          message: 'Client state saved',
        });
      }

      case 'update': {
        const { updates } = body;

        if (!updates) {
          return NextResponse.json(
            { error: 'Missing required field: updates' },
            { status: 400 }
          );
        }

        await updateClientState(clientId, updates);

        return NextResponse.json({
          success: true,
          message: 'Client state updated',
        });
      }

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Error saving client state:', error);
    return NextResponse.json(
      {
        error: 'Failed to save client state',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/client-state?clientId=xxx
 *
 * Delete client state
 */
export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const clientId = searchParams.get('clientId');

    if (!clientId) {
      return NextResponse.json(
        { error: 'Missing required parameter: clientId' },
        { status: 400 }
      );
    }

    await deleteClientState(clientId);

    return NextResponse.json({
      success: true,
      message: 'Client state deleted',
    });
  } catch (error) {
    console.error('Error deleting client state:', error);
    return NextResponse.json(
      {
        error: 'Failed to delete client state',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
