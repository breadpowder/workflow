'use client';

import { useState, useEffect, useCallback } from 'react';
import type {
  RuntimeMachine,
  CompiledWorkflowStep,
  ClientState,
} from '@/lib/workflow/schema';
import {
  getStepById,
  executeTransition,
  canTransitionFrom,
  getWorkflowProgress,
  getStageProgress,
  missingRequiredFields,
} from '@/lib/workflow/engine';

/**
 * Hook return type
 */
export interface UseWorkflowStateReturn {
  // Current state
  currentStep: CompiledWorkflowStep | null;
  currentStepId: string;
  currentStage: string | undefined;
  inputs: Record<string, any>;
  completedSteps: string[];

  // Workflow machine
  machine: RuntimeMachine | null;

  // Progress tracking
  workflowProgress: {
    total: number;
    completed: number;
    remaining: number;
    percentage: number;
  } | null;
  stageProgress: Array<{
    stageId: string;
    stageName: string;
    total: number;
    completed: number;
    percentage: number;
  }> | null;

  // Validation
  canProceed: boolean;
  validationErrors: string[];
  missingFields: string[];

  // State management actions
  updateInput: (fieldName: string, value: any) => void;
  updateInputs: (newInputs: Record<string, any>) => void;
  goToNextStep: () => Promise<void>;
  goToPreviousStep: () => void;
  resetWorkflow: () => Promise<void>;

  // Loading states
  isLoading: boolean;
  isTransitioning: boolean;
  error: string | null;

  // Workflow completion
  isComplete: boolean;
}

/**
 * Hook configuration options
 */
export interface UseWorkflowStateOptions {
  clientId: string;
  client_type: string; // "corporate" | "individual" | "trust"
  jurisdiction?: string; // "US" | "CA" | "GB"
  autoSave?: boolean; // Auto-save state on input changes (default: true)
  saveDebounceMs?: number; // Debounce delay for auto-save (default: 500ms)
}

/**
 * React hook for managing workflow state
 *
 * Integrates with:
 * - /api/workflows - Load compiled workflow machine
 * - /api/client-state - Persist workflow progress
 * - lib/workflow/engine - Execute transitions and validations
 *
 * @example
 * ```tsx
 * function OnboardingPage() {
 *   const workflow = useWorkflowState({
 *     clientId: 'client_123',
 *     client_type: 'corporate',
 *     jurisdiction: 'US'
 *   });
 *
 *   return (
 *     <div>
 *       <h1>Step: {workflow.currentStep?.id}</h1>
 *       <ProgressBar value={workflow.workflowProgress?.percentage} />
 *       <input
 *         onChange={(e) => workflow.updateInput('email', e.target.value)}
 *         value={workflow.inputs.email || ''}
 *       />
 *       <button
 *         onClick={workflow.goToNextStep}
 *         disabled={!workflow.canProceed}
 *       >
 *         Next
 *       </button>
 *     </div>
 *   );
 * }
 * ```
 */
export function useWorkflowState(
  options: UseWorkflowStateOptions
): UseWorkflowStateReturn {
  const {
    clientId,
    client_type,
    jurisdiction,
    autoSave = true,
    saveDebounceMs = 500,
  } = options;

  // Core state
  const [machine, setMachine] = useState<RuntimeMachine | null>(null);
  const [currentStepId, setCurrentStepId] = useState<string>('');
  const [currentStage, setCurrentStage] = useState<string | undefined>(undefined);
  const [inputs, setInputs] = useState<Record<string, any>>({});
  const [completedSteps, setCompletedSteps] = useState<string[]>([]);
  const [isComplete, setIsComplete] = useState(false);

  // UI state
  const [isLoading, setIsLoading] = useState(true);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Auto-save debounce timer
  const [saveTimer, setSaveTimer] = useState<NodeJS.Timeout | null>(null);

  /**
   * Load workflow machine from API
   */
  const loadMachine = useCallback(async () => {
    try {
      const params = new URLSearchParams({ client_type });
      if (jurisdiction) {
        params.append('jurisdiction', jurisdiction);
      }

      const response = await fetch(`/api/workflows?${params.toString()}`);

      if (!response.ok) {
        throw new Error(`Failed to load workflow: ${response.statusText}`);
      }

      const data = await response.json();
      setMachine(data);
      return data as RuntimeMachine;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error loading workflow';
      setError(errorMsg);
      throw err;
    }
  }, [client_type, jurisdiction]);

  /**
   * Load client state from API
   */
  const loadClientState = useCallback(async (): Promise<ClientState | null> => {
    try {
      const response = await fetch(
        `/api/client-state?clientId=${encodeURIComponent(clientId)}`
      );

      if (response.status === 404) {
        return null; // Client state doesn't exist yet
      }

      if (!response.ok) {
        throw new Error(`Failed to load client state: ${response.statusText}`);
      }

      const data = await response.json();
      return data as ClientState;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error loading state';
      setError(errorMsg);
      throw err;
    }
  }, [clientId]);

  /**
   * Save client state to API
   */
  const saveClientState = useCallback(
    async (state: Partial<ClientState>) => {
      try {
        const response = await fetch('/api/client-state', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'update',
            clientId,
            updates: state,
          }),
        });

        if (!response.ok) {
          throw new Error(`Failed to save state: ${response.statusText}`);
        }
      } catch (err) {
        console.error('Error saving client state:', err);
        // Don't throw - saving is best-effort
      }
    },
    [clientId]
  );

  /**
   * Initialize workflow state on mount
   */
  useEffect(() => {
    let isMounted = true;

    async function initialize() {
      try {
        setIsLoading(true);
        setError(null);

        // Load workflow machine
        const loadedMachine = await loadMachine();

        if (!isMounted) return;

        // Load or initialize client state
        let clientState = await loadClientState();

        if (!clientState) {
          // Initialize new client state
          const initialStepId = loadedMachine.steps[0]?.id || '';
          const initialStage = loadedMachine.steps[0]?.stage;

          const response = await fetch('/api/client-state', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'initialize',
              clientId,
              workflowId: loadedMachine.workflowId,
              initialStepId,
            }),
          });

          if (!response.ok) {
            throw new Error(`Failed to initialize state: ${response.statusText}`);
          }

          clientState = await response.json();
        }

        if (!isMounted) return;

        // Set state from loaded/initialized data
        setCurrentStepId(clientState.currentStepId);
        setCurrentStage(clientState.currentStage);
        setInputs(clientState.collectedInputs);
        setCompletedSteps(clientState.completedSteps);
        setIsComplete(clientState.currentStepId === 'END');
      } catch (err) {
        if (isMounted) {
          const errorMsg = err instanceof Error ? err.message : 'Failed to initialize workflow';
          setError(errorMsg);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    initialize();

    return () => {
      isMounted = false;
      if (saveTimer) {
        clearTimeout(saveTimer);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId, client_type, jurisdiction]);

  /**
   * Get current step object
   */
  const currentStep = machine && currentStepId !== 'END'
    ? getStepById(machine, currentStepId)
    : null;

  /**
   * Validation: Check if all required fields are filled
   */
  const missingFields = currentStep
    ? missingRequiredFields(currentStep, inputs)
    : [];

  const validationResult = currentStep
    ? canTransitionFrom(currentStep, inputs)
    : { canTransition: false, reason: 'No current step' };

  const canProceed = validationResult.canTransition;
  const validationErrors = validationResult.canTransition
    ? []
    : [validationResult.reason || 'Validation failed'];

  /**
   * Progress tracking
   */
  const workflowProgress = machine
    ? getWorkflowProgress(machine, completedSteps)
    : null;

  const stageProgress = machine
    ? getStageProgress(machine, completedSteps)
    : null;

  /**
   * Update single input field
   */
  const updateInput = useCallback(
    (fieldName: string, value: any) => {
      setInputs((prev) => {
        const updated = { ...prev, [fieldName]: value };

        // Auto-save with debounce
        if (autoSave) {
          if (saveTimer) clearTimeout(saveTimer);
          const timer = setTimeout(() => {
            saveClientState({ collectedInputs: updated });
          }, saveDebounceMs);
          setSaveTimer(timer);
        }

        return updated;
      });
    },
    [autoSave, saveDebounceMs, saveTimer, saveClientState]
  );

  /**
   * Update multiple input fields at once
   */
  const updateInputs = useCallback(
    (newInputs: Record<string, any>) => {
      setInputs((prev) => {
        const updated = { ...prev, ...newInputs };

        // Auto-save with debounce
        if (autoSave) {
          if (saveTimer) clearTimeout(saveTimer);
          const timer = setTimeout(() => {
            saveClientState({ collectedInputs: updated });
          }, saveDebounceMs);
          setSaveTimer(timer);
        }

        return updated;
      });
    },
    [autoSave, saveDebounceMs, saveTimer, saveClientState]
  );

  /**
   * Transition to next step
   */
  const goToNextStep = useCallback(async () => {
    if (!machine || !currentStep) {
      setError('Cannot proceed: workflow not loaded');
      return;
    }

    if (!canProceed) {
      setError(validationErrors[0] || 'Cannot proceed: validation failed');
      return;
    }

    try {
      setIsTransitioning(true);
      setError(null);

      // Execute transition
      const result = executeTransition(machine, currentStep, inputs);

      // Update completed steps
      const newCompletedSteps = [...completedSteps, currentStepId];

      if (result.isEnd) {
        // Workflow completed
        setIsComplete(true);
        setCurrentStepId('END');
        setCurrentStage(undefined);
        setCompletedSteps(newCompletedSteps);

        // Save final state
        await saveClientState({
          currentStepId: 'END',
          currentStage: undefined,
          completedSteps: newCompletedSteps,
          collectedInputs: inputs,
        });
      } else {
        // Move to next step
        const nextStep = result.nextStep!;
        setCurrentStepId(nextStep.id);
        setCurrentStage(nextStep.stage);
        setCompletedSteps(newCompletedSteps);

        // Save state
        await saveClientState({
          currentStepId: nextStep.id,
          currentStage: nextStep.stage,
          completedSteps: newCompletedSteps,
          collectedInputs: inputs,
        });
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Transition failed';
      setError(errorMsg);
    } finally {
      setIsTransitioning(false);
    }
  }, [machine, currentStep, canProceed, validationErrors, inputs, completedSteps, currentStepId, saveClientState]);

  /**
   * Go back to previous step
   */
  const goToPreviousStep = useCallback(() => {
    if (completedSteps.length === 0) {
      setError('Cannot go back: already at first step');
      return;
    }

    // Remove current step from completed
    const newCompletedSteps = completedSteps.slice(0, -1);
    const previousStepId = completedSteps[completedSteps.length - 1];

    if (!machine) return;

    const previousStep = getStepById(machine, previousStepId);
    if (!previousStep) {
      setError(`Previous step not found: ${previousStepId}`);
      return;
    }

    setCurrentStepId(previousStepId);
    setCurrentStage(previousStep.stage);
    setCompletedSteps(newCompletedSteps);

    // Save state
    saveClientState({
      currentStepId: previousStepId,
      currentStage: previousStep.stage,
      completedSteps: newCompletedSteps,
    });
  }, [machine, completedSteps, saveClientState]);

  /**
   * Reset workflow to initial state
   */
  const resetWorkflow = useCallback(async () => {
    if (!machine) return;

    const initialStepId = machine.steps[0]?.id || '';
    const initialStage = machine.steps[0]?.stage;

    setCurrentStepId(initialStepId);
    setCurrentStage(initialStage);
    setInputs({});
    setCompletedSteps([]);
    setIsComplete(false);
    setError(null);

    // Reset state on server
    await saveClientState({
      currentStepId: initialStepId,
      currentStage: initialStage,
      collectedInputs: {},
      completedSteps: [],
    });
  }, [machine, saveClientState]);

  return {
    // Current state
    currentStep,
    currentStepId,
    currentStage,
    inputs,
    completedSteps,

    // Workflow machine
    machine,

    // Progress tracking
    workflowProgress,
    stageProgress,

    // Validation
    canProceed,
    validationErrors,
    missingFields,

    // State management actions
    updateInput,
    updateInputs,
    goToNextStep,
    goToPreviousStep,
    resetWorkflow,

    // Loading states
    isLoading,
    isTransitioning,
    error,

    // Workflow completion
    isComplete,
  };
}
