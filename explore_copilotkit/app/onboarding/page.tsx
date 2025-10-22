'use client';

import { useState } from 'react';
import { useWorkflowState } from '@/lib/hooks/useWorkflowState';
import { getComponent } from '@/lib/ui/component-registry';
import { ProgressBar } from '@/components/workflow/ProgressBar';
import { StageIndicator } from '@/components/workflow/StageIndicator';
import { clsx } from 'clsx';

/**
 * Main onboarding workflow page
 *
 * Demonstrates complete workflow execution with:
 * - Dynamic component rendering from registry
 * - Progress tracking (workflow + stage level)
 * - State persistence with auto-save
 * - Validation feedback
 * - Navigation controls
 */
export default function OnboardingPage() {
  // Generate a unique client ID (in real app, this would come from auth)
  const [clientId] = useState(() => `client_${Date.now()}`);

  // Initialize workflow state hook
  const workflow = useWorkflowState({
    clientId,
    client_type: 'corporate', // Could be dynamic based on user selection
    jurisdiction: 'US',
    autoSave: true,
    saveDebounceMs: 500,
  });

  // Loading state
  if (workflow.isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          <p className="mt-4 text-gray-600">Loading workflow...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (workflow.error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
          <div className="flex items-center justify-center w-12 h-12 mx-auto bg-danger/10 rounded-full">
            <svg
              className="w-6 h-6 text-danger"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </div>
          <h2 className="mt-4 text-xl font-semibold text-center text-gray-900">
            Error Loading Workflow
          </h2>
          <p className="mt-2 text-center text-gray-600">{workflow.error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-6 w-full px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
          >
            Reload Page
          </button>
        </div>
      </div>
    );
  }

  // Completion state
  if (workflow.isComplete) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
          <div className="flex items-center justify-center w-16 h-16 mx-auto bg-success/10 rounded-full">
            <svg
              className="w-8 h-8 text-success"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <h2 className="mt-4 text-2xl font-bold text-center text-gray-900">
            Onboarding Complete!
          </h2>
          <p className="mt-2 text-center text-gray-600">
            Your information has been submitted successfully.
          </p>
          <div className="mt-6 space-y-3">
            <button
              onClick={() => workflow.resetWorkflow()}
              className="w-full px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
            >
              Start Over
            </button>
            <button
              onClick={() => (window.location.href = '/')}
              className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Go to Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Get current step and component
  const { currentStep, machine } = workflow;

  if (!currentStep || !machine) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-600">No current step available</p>
      </div>
    );
  }

  // Get component from registry
  const Component = getComponent(currentStep.component_id || '');

  if (!Component) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
          <p className="text-danger">
            Component not found: {currentStep.component_id}
          </p>
          <p className="mt-2 text-sm text-gray-600">
            Available components: form, document-upload, review-summary, data-table
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Corporate Onboarding
          </h1>
          <p className="mt-2 text-gray-600">
            Complete your onboarding process step by step
          </p>
        </div>

        {/* Stage Indicator */}
        {machine.stages && machine.stages.length > 0 && (
          <div className="mb-8 bg-white rounded-lg shadow-sm p-6">
            <StageIndicator
              stages={machine.stages}
              currentStageId={workflow.currentStage}
              stageProgress={workflow.stageProgress || []}
            />
          </div>
        )}

        {/* Overall Progress */}
        {workflow.workflowProgress && (
          <div className="mb-6">
            <ProgressBar
              percentage={workflow.workflowProgress.percentage}
              label="Overall Progress"
              showPercentage={true}
              size="md"
              color="primary"
            />
          </div>
        )}

        {/* Main Content Card */}
        <div className="bg-white rounded-lg shadow-sm p-6 sm:p-8">
          {/* Step Title */}
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-gray-900">
              {currentStep.id
                .split(/(?=[A-Z])/)
                .join(' ')
                .replace(/^\w/, (c) => c.toUpperCase())}
            </h2>
            {currentStep.required_fields && currentStep.required_fields.length > 0 && (
              <p className="mt-1 text-sm text-gray-500">
                * Required fields
              </p>
            )}
          </div>

          {/* Render Component from Registry */}
          <div className="mb-6">
            <Component
              stepId={currentStep.id}
              schema={currentStep.schema || { fields: [] }}
              inputs={workflow.inputs}
              onInputChange={workflow.updateInput}
              onSubmit={workflow.goToNextStep}
              requiredFields={currentStep.required_fields || []}
              isProcessing={workflow.isTransitioning}
              error={workflow.error || undefined}
            />
          </div>

          {/* Validation Errors */}
          {workflow.validationErrors.length > 0 && (
            <div className="mb-6 p-4 bg-danger/10 border border-danger rounded-lg">
              <div className="flex items-start">
                <svg
                  className="w-5 h-5 text-danger mt-0.5 mr-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <div className="flex-1">
                  <p className="text-sm font-medium text-danger">
                    Please fix the following errors:
                  </p>
                  <ul className="mt-1 text-sm text-danger list-disc list-inside">
                    {workflow.validationErrors.map((error, index) => (
                      <li key={index}>{error}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* Missing Fields Info */}
          {workflow.missingFields.length > 0 && (
            <div className="mb-6 p-4 bg-warning/10 border border-warning rounded-lg">
              <p className="text-sm text-gray-700">
                <span className="font-medium">Required fields:</span>{' '}
                {workflow.missingFields.join(', ')}
              </p>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex items-center justify-between gap-4">
            <button
              onClick={workflow.goToPreviousStep}
              disabled={workflow.completedSteps.length === 0 || workflow.isTransitioning}
              className={clsx(
                'px-6 py-2 rounded-lg font-medium transition-colors',
                'border border-gray-300',
                workflow.completedSteps.length === 0 || workflow.isTransitioning
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              )}
            >
              ← Back
            </button>

            <div className="flex items-center gap-2">
              {workflow.isTransitioning && (
                <div className="inline-block animate-spin rounded-full h-5 w-5 border-b-2 border-primary"></div>
              )}
              <button
                onClick={workflow.goToNextStep}
                disabled={!workflow.canProceed || workflow.isTransitioning}
                className={clsx(
                  'px-6 py-2 rounded-lg font-medium transition-colors',
                  !workflow.canProceed || workflow.isTransitioning
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-primary text-white hover:bg-primary/90'
                )}
              >
                {workflow.isTransitioning ? 'Processing...' : 'Next →'}
              </button>
            </div>
          </div>
        </div>

        {/* Debug Info (Development Only) */}
        {process.env.NODE_ENV === 'development' && (
          <div className="mt-6 bg-gray-800 text-gray-100 rounded-lg p-4 text-xs font-mono">
            <div className="font-bold mb-2">Debug Info:</div>
            <div>Client ID: {clientId}</div>
            <div>Workflow ID: {machine.workflowId}</div>
            <div>Current Step: {workflow.currentStepId}</div>
            <div>Current Stage: {workflow.currentStage || 'N/A'}</div>
            <div>Completed Steps: {workflow.completedSteps.join(', ') || 'None'}</div>
            <div>Can Proceed: {workflow.canProceed ? 'Yes' : 'No'}</div>
            <div>Missing Fields: {workflow.missingFields.join(', ') || 'None'}</div>
          </div>
        )}
      </div>
    </div>
  );
}
