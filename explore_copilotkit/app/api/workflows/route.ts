import { NextRequest, NextResponse } from 'next/server';
import {
  loadWorkflows,
  pickApplicableWorkflow,
  compileWorkflow,
} from '@/lib/workflow/loader';
import { ClientProfile } from '@/lib/workflow/schema';

/**
 * GET /api/workflows
 *
 * Query compiled workflow based on client profile
 *
 * Query parameters:
 * - client_type: "corporate" | "individual" | "trust"
 * - jurisdiction: "US" | "CA" | "GB"
 *
 * Returns: Compiled RuntimeMachine
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const client_type = searchParams.get('client_type') || '';
    const jurisdiction = searchParams.get('jurisdiction') || '';

    if (!client_type) {
      return NextResponse.json(
        { error: 'Missing required parameter: client_type' },
        { status: 400 }
      );
    }

    // Load all workflows
    const workflows = await loadWorkflows();

    if (workflows.length === 0) {
      return NextResponse.json(
        { error: 'No workflows found' },
        { status: 404 }
      );
    }

    // Select applicable workflow
    const profile: ClientProfile = { client_type, jurisdiction };
    const selectedWorkflow = pickApplicableWorkflow(workflows, profile);

    if (!selectedWorkflow) {
      return NextResponse.json(
        { error: 'No applicable workflow found for the given profile' },
        { status: 404 }
      );
    }

    // Compile workflow
    const compiledWorkflow = await compileWorkflow(selectedWorkflow);

    // Convert Map to object for JSON serialization
    const serializedWorkflow = {
      ...compiledWorkflow,
      stepIndexById: Object.fromEntries(compiledWorkflow.stepIndexById),
    };

    return NextResponse.json(serializedWorkflow);
  } catch (error) {
    console.error('Error loading workflow:', error);

    return NextResponse.json(
      {
        error: 'Failed to load workflow',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
