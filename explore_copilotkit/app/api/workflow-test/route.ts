import { NextRequest, NextResponse } from 'next/server';
import { loadWorkflows, pickApplicableWorkflow, compileWorkflow } from '@/lib/workflow/loader';
import {
  getInitialStep,
  nextStepId,
  getPossibleNextSteps,
  canTransitionFrom,
  executeTransition,
  isValidTransition,
} from '@/lib/workflow/engine';

/**
 * GET /api/workflow-test?action=<action>&inputs=<json>
 *
 * Test endpoint for workflow transition logic
 *
 * Actions:
 * - initial: Get initial step
 * - nextStepId: Determine next step based on inputs
 * - possiblePaths: Get all possible next steps
 * - canTransition: Check if transition is allowed
 * - executeTransition: Execute complete transition
 * - validateTransition: Check if transition target is valid
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const action = searchParams.get('action') || 'initial';
    const inputsParam = searchParams.get('inputs') || '{}';
    const stepId = searchParams.get('stepId');
    const targetStepId = searchParams.get('targetStepId');

    // Parse inputs
    let inputs: Record<string, any> = {};
    try {
      inputs = JSON.parse(inputsParam);
    } catch (e) {
      return NextResponse.json(
        { error: 'Invalid inputs JSON', message: String(e) },
        { status: 400 }
      );
    }

    // Load and compile workflow
    const workflows = await loadWorkflows();
    const workflow = pickApplicableWorkflow(workflows, {
      client_type: 'corporate',
      jurisdiction: 'US',
    });

    if (!workflow) {
      return NextResponse.json(
        { error: 'No workflow found' },
        { status: 404 }
      );
    }

    const machine = await compileWorkflow(workflow);

    // Handle different test actions
    switch (action) {
      case 'initial': {
        const initialStep = getInitialStep(machine);
        return NextResponse.json({
          action: 'initial',
          result: {
            stepId: initialStep?.id,
            componentId: initialStep?.component_id,
            requiredFields: initialStep?.required_fields,
            possibleNext: initialStep ? getPossibleNextSteps(initialStep) : [],
          },
        });
      }

      case 'nextStepId': {
        if (!stepId) {
          return NextResponse.json(
            { error: 'Missing stepId parameter' },
            { status: 400 }
          );
        }

        const step = machine.stepIndexById.get(stepId);
        if (!step) {
          return NextResponse.json(
            { error: `Step not found: ${stepId}` },
            { status: 404 }
          );
        }

        const nextId = nextStepId(step, inputs);
        return NextResponse.json({
          action: 'nextStepId',
          currentStep: stepId,
          inputs,
          result: {
            nextStepId: nextId,
            isEnd: nextId === 'END',
            hasConditions: (step.next.conditions?.length || 0) > 0,
          },
        });
      }

      case 'possiblePaths': {
        if (!stepId) {
          return NextResponse.json(
            { error: 'Missing stepId parameter' },
            { status: 400 }
          );
        }

        const step = machine.stepIndexById.get(stepId);
        if (!step) {
          return NextResponse.json(
            { error: `Step not found: ${stepId}` },
            { status: 404 }
          );
        }

        const possiblePaths = getPossibleNextSteps(step);
        return NextResponse.json({
          action: 'possiblePaths',
          currentStep: stepId,
          result: {
            possiblePaths,
            pathCount: possiblePaths.length,
          },
        });
      }

      case 'canTransition': {
        if (!stepId) {
          return NextResponse.json(
            { error: 'Missing stepId parameter' },
            { status: 400 }
          );
        }

        const step = machine.stepIndexById.get(stepId);
        if (!step) {
          return NextResponse.json(
            { error: `Step not found: ${stepId}` },
            { status: 404 }
          );
        }

        const canTransition = canTransitionFrom(step, inputs);
        return NextResponse.json({
          action: 'canTransition',
          currentStep: stepId,
          inputs,
          result: canTransition,
        });
      }

      case 'executeTransition': {
        if (!stepId) {
          return NextResponse.json(
            { error: 'Missing stepId parameter' },
            { status: 400 }
          );
        }

        const step = machine.stepIndexById.get(stepId);
        if (!step) {
          return NextResponse.json(
            { error: `Step not found: ${stepId}` },
            { status: 404 }
          );
        }

        try {
          const transition = executeTransition(machine, step, inputs);
          return NextResponse.json({
            action: 'executeTransition',
            currentStep: stepId,
            inputs,
            result: {
              nextStepId: transition.nextStepId,
              nextStepComponentId: transition.nextStep?.component_id,
              isEnd: transition.isEnd,
              transitionReason: transition.transitionReason,
            },
          });
        } catch (error) {
          return NextResponse.json(
            {
              action: 'executeTransition',
              currentStep: stepId,
              inputs,
              error: error instanceof Error ? error.message : String(error),
            },
            { status: 400 }
          );
        }
      }

      case 'validateTransition': {
        if (!targetStepId) {
          return NextResponse.json(
            { error: 'Missing targetStepId parameter' },
            { status: 400 }
          );
        }

        const isValid = isValidTransition(machine, targetStepId);
        return NextResponse.json({
          action: 'validateTransition',
          targetStepId,
          result: {
            isValid,
            reason: isValid
              ? 'Target step exists or is END'
              : 'Target step does not exist',
          },
        });
      }

      default:
        return NextResponse.json(
          {
            error: 'Unknown action',
            availableActions: [
              'initial',
              'nextStepId',
              'possiblePaths',
              'canTransition',
              'executeTransition',
              'validateTransition',
            ],
          },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Workflow test error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
