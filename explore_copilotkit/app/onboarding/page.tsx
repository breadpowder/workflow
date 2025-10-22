'use client';

import { useState, useCallback, useMemo } from 'react';
import { useWorkflowState } from '@/lib/hooks/useWorkflowState';
import { getComponent } from '@/lib/ui/component-registry';
import '@/lib/ui/registry-init';

// Layout components (from test-layout)
import { ThreePaneLayout } from '@/components/layout/three-pane-layout';
import { LeftPane } from '@/components/layout/left-pane';
import { MiddlePane } from '@/components/layout/middle-pane';
import { RightPane } from '@/components/layout/right-pane';

// Feature components
import { ClientSelector } from '@/components/onboarding/client-selector';
import { WorkflowProgress } from '@/components/onboarding/workflow-progress';
import { ChatSection, ChatMessage } from '@/components/chat/chat-section';
import { FormOverlay } from '@/components/onboarding/form-overlay';
import { clsx } from 'clsx';

/**
 * Main onboarding workflow page with three-pane layout
 *
 * Integrated from test-layout + onboarding:
 * - Three-pane layout structure
 * - Real workflow execution with YAML tasks
 * - Chat-first UI with form overlay pattern
 * - Dynamic client type switching
 * - State persistence with auto-save
 */
export default function OnboardingPage() {
  // Client type selection (corporate vs individual)
  const [clientType, setClientType] = useState<'corporate' | 'individual'>('corporate');

  // Generate a unique client ID (in real app, this would come from auth)
  const [clientId] = useState(() => `client_${Date.now()}`);

  // Chat state (from test-layout pattern)
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      role: 'system',
      content: 'Welcome to the onboarding workflow.',
      timestamp: new Date(),
      type: 'info',
    },
    {
      id: '2',
      role: 'ai',
      content: "Hello! I'm here to assist you with the onboarding process. We'll be collecting information step by step.",
      timestamp: new Date(),
    },
  ]);

  // Form overlay state (from test-layout pattern)
  const [overlayOpen, setOverlayOpen] = useState(false);

  // Initialize workflow state hook (from original onboarding)
  const workflow = useWorkflowState({
    clientId,
    client_type: clientType,
    jurisdiction: 'US',
    autoSave: true,
    saveDebounceMs: 500,
  });

  // Add system message helper
  const addSystemMessage = useCallback((content: string, type: ChatMessage['type'] = 'info') => {
    setMessages(prev => [
      ...prev,
      {
        id: Date.now().toString(),
        role: 'system',
        content,
        timestamp: new Date(),
        type,
      },
    ]);
  }, []);

  // Handle client type change
  const handleClientTypeChange = useCallback((type: 'corporate' | 'individual') => {
    setClientType(type);
    addSystemMessage(`Switched to ${type} workflow. Workflow will reload.`, 'warning');
  }, [addSystemMessage]);

  // Handle chat message send (from test-layout)
  const handleSendMessage = useCallback((content: string) => {
    // Add user message
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMessage]);

    // Simulate AI response (in production, this would use CopilotKit)
    setTimeout(() => {
      const aiMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'ai',
        content: "I understand. Let me help you with that. Please continue with the workflow steps.",
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, aiMessage]);
    }, 1000);
  }, []);

  // Handle opening form overlay
  const handleOpenFormOverlay = useCallback(() => {
    if (!workflow.currentStep) return;

    setOverlayOpen(true);
    addSystemMessage(
      `Opening form: ${workflow.currentStep.task_definition?.name || workflow.currentStep.task_ref.replace(/_/g, ' ')}`,
      'info'
    );
  }, [workflow.currentStep, addSystemMessage]);

  // Handle closing overlay
  const handleCloseOverlay = useCallback(() => {
    setOverlayOpen(false);
    addSystemMessage('Form closed. You can resume when ready.', 'warning');
  }, [addSystemMessage]);

  // Handle form submission
  const handleFormSubmit = useCallback(() => {
    if (workflow.canProceed) {
      workflow.goToNextStep();
      setOverlayOpen(false);
      addSystemMessage('Form submitted successfully! Moving to next step.', 'success');
    } else {
      addSystemMessage(`Please complete required fields: ${workflow.missingFields.join(', ')}`, 'error');
    }
  }, [workflow, addSystemMessage]);

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
          <div className="flex items-center justify-center w-12 h-12 mx-auto bg-red-100 rounded-full">
            <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h2 className="mt-4 text-xl font-semibold text-center text-gray-900">Error Loading Workflow</h2>
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
          <div className="flex items-center justify-center w-16 h-16 mx-auto bg-green-100 rounded-full">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="mt-4 text-2xl font-bold text-center text-gray-900">Onboarding Complete!</h2>
          <p className="mt-2 text-center text-gray-600">Your information has been submitted successfully.</p>
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

  // Get component from registry for overlay
  const Component = getComponent(currentStep.component_id || '');

  // Three-pane layout rendering
  return (
    <ThreePaneLayout
      left={
        <LeftPane>
          {/* Client Type Selector */}
          <ClientSelector
            currentType={clientType}
            onTypeChange={handleClientTypeChange}
            disabled={workflow.isTransitioning}
          />

          {/* Workflow Step List */}
          <div className="p-4">
            <h3 className="text-sm font-medium text-gray-700 mb-3">Workflow Steps</h3>
            <div className="space-y-2">
              {machine.steps.map((step, index) => {
                const isCompleted = workflow.completedSteps.includes(step.id);
                const isCurrent = step.id === currentStep.id;

                return (
                  <div
                    key={step.id}
                    className={`
                      flex items-center gap-2 p-2 rounded text-sm transition-colors
                      ${isCurrent ? 'bg-blue-100 text-blue-700 font-medium' : ''}
                      ${isCompleted && !isCurrent ? 'bg-green-50 text-green-700' : ''}
                      ${!isCurrent && !isCompleted ? 'text-gray-600' : ''}
                    `}
                  >
                    {isCompleted ? '✓' : isCurrent ? '▸' : '○'}
                    <span className="flex-1 truncate">
                      {index + 1}. {step.task_definition?.name || step.task_ref.replace(/_/g, ' ')}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </LeftPane>
      }
      middle={
        <MiddlePane>
          <div className="p-6">
            {/* Workflow Progress Component */}
            <WorkflowProgress
              machine={machine}
              currentStep={currentStep}
              completedSteps={workflow.completedSteps}
              workflowProgress={workflow.workflowProgress?.percentage || 0}
              stageProgress={undefined}
              currentStage={workflow.currentStage}
            />

            {/* Current Task Card */}
            <div className="mt-6 bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-2">Current Task</h3>
              <p className="text-gray-600 mb-4">
                {currentStep.task_definition?.description || 'Complete the form to continue with the onboarding process.'}
              </p>

              {/* Action Button */}
              <button
                onClick={handleOpenFormOverlay}
                disabled={overlayOpen || workflow.isTransitioning}
                className={clsx(
                  'px-6 py-3 rounded-lg font-medium transition-colors',
                  overlayOpen || workflow.isTransitioning
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                )}
              >
                {overlayOpen ? 'Form Open' : workflow.isTransitioning ? 'Processing...' : 'Open Form'}
              </button>

              {/* Validation Warnings */}
              {workflow.missingFields.length > 0 && !overlayOpen && (
                <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-800">
                  <span className="font-medium">Required fields:</span> {workflow.missingFields.join(', ')}
                </div>
              )}

              {/* Validation Errors */}
              {workflow.validationErrors.length > 0 && (
                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-800">
                  <p className="font-medium mb-1">Please fix the following errors:</p>
                  <ul className="list-disc list-inside">
                    {workflow.validationErrors.map((error, index) => (
                      <li key={index}>{error}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Navigation Buttons (only in overlay-closed state) */}
              {!overlayOpen && (
                <div className="flex items-center justify-between gap-4 mt-6 pt-6 border-t border-gray-200">
                  <button
                    onClick={workflow.goToPreviousStep}
                    disabled={workflow.completedSteps.length === 0 || workflow.isTransitioning}
                    className={clsx(
                      'px-6 py-2 rounded-lg font-medium transition-colors border border-gray-300',
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
              )}
            </div>

            {/* Debug Info (Development Only) */}
            {process.env.NODE_ENV === 'development' && (
              <div className="mt-6 bg-gray-800 text-gray-100 rounded-lg p-4 text-xs font-mono">
                <div className="font-bold mb-2">Debug Info:</div>
                <div>Client ID: {clientId}</div>
                <div>Client Type: {clientType}</div>
                <div>Workflow ID: {machine.workflowId}</div>
                <div>Current Step: {workflow.currentStepId}</div>
                <div>Current Stage: {workflow.currentStage || 'N/A'}</div>
                <div>Completed Steps: {workflow.completedSteps.join(', ') || 'None'}</div>
                <div>Can Proceed: {workflow.canProceed ? 'Yes' : 'No'}</div>
                <div>Missing Fields: {workflow.missingFields.join(', ') || 'None'}</div>
                <div>Overlay Open: {overlayOpen ? 'Yes' : 'No'}</div>
              </div>
            )}
          </div>
        </MiddlePane>
      }
      right={
        <RightPane className="relative">
          {/* Chat Section */}
          <ChatSection
            messages={messages}
            onSendMessage={handleSendMessage}
            dimmed={overlayOpen}
          />

          {/* Form Overlay */}
          {overlayOpen && Component && (
            <FormOverlay
              isOpen={overlayOpen}
              onClose={handleCloseOverlay}
              title={currentStep.task_definition?.name || currentStep.task_ref.replace(/_/g, ' ')}
            >
              <Component
                stepId={currentStep.id}
                schema={currentStep.schema || { fields: [] }}
                inputs={workflow.inputs}
                onInputChange={workflow.updateInput}
                onSubmit={handleFormSubmit}
                requiredFields={currentStep.required_fields || []}
                isProcessing={workflow.isTransitioning}
                error={workflow.error || undefined}
              />

              {/* Navigation inside overlay */}
              <div className="mt-6 flex gap-3 pt-4 border-t border-gray-200">
                <button
                  onClick={handleFormSubmit}
                  disabled={!workflow.canProceed || workflow.isTransitioning}
                  className={clsx(
                    'flex-1 px-6 py-2 rounded-lg font-medium transition-colors',
                    !workflow.canProceed || workflow.isTransitioning
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                  )}
                >
                  {workflow.isTransitioning ? 'Submitting...' : 'Submit & Continue'}
                </button>
                <button
                  onClick={handleCloseOverlay}
                  className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </FormOverlay>
          )}

          {/* Component not found error */}
          {overlayOpen && !Component && (
            <FormOverlay
              isOpen={overlayOpen}
              onClose={handleCloseOverlay}
              title="Error"
            >
              <div className="p-4 bg-red-50 border border-red-200 rounded">
                <p className="text-red-800 font-medium">Component not found: {currentStep.component_id}</p>
                <p className="text-sm text-red-600 mt-2">
                  Available components: form, document-upload, review-summary, data-table
                </p>
              </div>
            </FormOverlay>
          )}
        </RightPane>
      }
    />
  );
}
