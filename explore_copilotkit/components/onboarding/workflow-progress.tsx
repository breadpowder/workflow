'use client';

/**
 * Workflow Progress Component
 *
 * Displays current workflow state including:
 * - Current step title and description
 * - Stage indicator
 * - Progress bar
 * - Step list with completion status
 */

import { StageIndicator } from '@/components/workflow/StageIndicator';
import { ProgressBar } from '@/components/workflow/ProgressBar';
import type { RuntimeMachine, CompiledWorkflowStep } from '@/lib/workflow/schema';

interface WorkflowProgressProps {
  machine: RuntimeMachine | null;
  currentStep: CompiledWorkflowStep | null;
  completedSteps: string[];
  workflowProgress: number;
  stageProgress?: number;
  currentStage?: string | null;
}

export function WorkflowProgress({
  machine,
  currentStep,
  completedSteps,
  workflowProgress,
  stageProgress,
  currentStage,
}: WorkflowProgressProps) {
  if (!machine || !currentStep) {
    return (
      <div className="p-6 bg-white rounded-lg shadow-sm">
        <p className="text-gray-500 text-center">No workflow loaded</p>
      </div>
    );
  }

  // Get all steps for the step list
  const allSteps = machine.steps || [];

  return (
    <div className="space-y-6">
      {/* Current Step Header */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h2 className="text-2xl font-semibold text-gray-900">
              {currentStep.task_definition?.name || currentStep.task_ref.replace(/_/g, ' ')}
            </h2>
            {currentStep.task_definition?.description && (
              <p className="mt-2 text-gray-600">{currentStep.task_definition.description}</p>
            )}
          </div>
          <div className="ml-4">
            <div className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
              Step {allSteps.findIndex((s) => s.id === currentStep.id) + 1} of{' '}
              {allSteps.length}
            </div>
          </div>
        </div>
      </div>

      {/* Stage Indicator (if stages defined) */}
      {machine.stages && machine.stages.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-sm font-medium text-gray-700 mb-3">
            Workflow Stages
          </h3>
          <StageIndicator
            stages={machine.stages}
            currentStageId={currentStage || undefined}
            stageProgress={[]}
          />
        </div>
      )}

      {/* Overall Progress */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-medium text-gray-700">
            Overall Progress
          </h3>
          <span className="text-sm text-gray-600">
            {Math.round(workflowProgress)}%
          </span>
        </div>
        <ProgressBar percentage={workflowProgress} size="md" color="primary" />
      </div>

      {/* Step List */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-sm font-medium text-gray-700 mb-3">All Steps</h3>
        <div className="space-y-2">
          {allSteps.map((step, index) => {
            const isCompleted = completedSteps.includes(step.id);
            const isCurrent = step.id === currentStep.id;

            return (
              <div
                key={step.id}
                className={`
                  flex items-center gap-3 p-3 rounded-lg transition-colors
                  ${isCurrent ? 'bg-blue-50 border border-blue-200' : ''}
                  ${isCompleted && !isCurrent ? 'bg-green-50' : ''}
                  ${!isCurrent && !isCompleted ? 'bg-gray-50' : ''}
                `}
              >
                {/* Status Icon */}
                <div className="flex-shrink-0">
                  {isCompleted ? (
                    <svg
                      className="w-5 h-5 text-green-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  ) : isCurrent ? (
                    <svg
                      className="w-5 h-5 text-blue-600"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <circle cx="12" cy="12" r="8" />
                    </svg>
                  ) : (
                    <svg
                      className="w-5 h-5 text-gray-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <circle cx="12" cy="12" r="8" strokeWidth={2} />
                    </svg>
                  )}
                </div>

                {/* Step Info */}
                <div className="flex-1 min-w-0">
                  <p
                    className={`text-sm font-medium ${
                      isCurrent
                        ? 'text-blue-700'
                        : isCompleted
                        ? 'text-green-700'
                        : 'text-gray-700'
                    }`}
                  >
                    {index + 1}. {step.task_definition?.name || step.task_ref.replace(/_/g, ' ')}
                  </p>
                  {step.task_definition?.description && (
                    <p className="text-xs text-gray-500 mt-1 truncate">
                      {step.task_definition.description}
                    </p>
                  )}
                </div>

                {/* Status Badge */}
                {isCurrent && (
                  <span className="flex-shrink-0 px-2 py-1 bg-blue-600 text-white text-xs font-medium rounded">
                    Current
                  </span>
                )}
                {isCompleted && !isCurrent && (
                  <span className="flex-shrink-0 px-2 py-1 bg-green-600 text-white text-xs font-medium rounded">
                    Complete
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
