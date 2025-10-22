import {
  RuntimeMachine,
  CompiledWorkflowStep,
  WorkflowStepNextCondition,
} from './schema';

/**
 * Workflow Engine
 *
 * Runtime execution functions for compiled workflow state machines.
 * Handles step lookups, validation, and state management.
 */

/**
 * Get a workflow step by ID (O(1) lookup)
 *
 * @param machine - Compiled runtime machine
 * @param stepId - Step identifier
 * @returns The step, or null if not found
 *
 * @example
 * const step = getStepById(machine, 'collectContactInfo');
 */
export function getStepById(
  machine: RuntimeMachine,
  stepId: string
): CompiledWorkflowStep | null {
  return machine.stepIndexById.get(stepId) || null;
}

/**
 * Check if a step exists in the workflow
 *
 * @param machine - Compiled runtime machine
 * @param stepId - Step identifier
 * @returns True if step exists
 */
export function hasStep(machine: RuntimeMachine, stepId: string): boolean {
  return machine.stepIndexById.has(stepId);
}

/**
 * Get all step IDs in the workflow
 *
 * @param machine - Compiled runtime machine
 * @returns Array of step IDs in order
 */
export function getAllStepIds(machine: RuntimeMachine): string[] {
  return machine.steps.map((step) => step.id);
}

/**
 * Get the initial step of the workflow
 *
 * @param machine - Compiled runtime machine
 * @returns The initial step, or null if not found
 */
export function getInitialStep(
  machine: RuntimeMachine
): CompiledWorkflowStep | null {
  return getStepById(machine, machine.initialStepId);
}

/**
 * Check if a step is the final step (transitions to END)
 *
 * @param step - Workflow step
 * @returns True if step transitions to END
 */
export function isFinalStep(step: CompiledWorkflowStep): boolean {
  return step.next.default === 'END';
}

/**
 * Get all steps in a specific stage
 *
 * @param machine - Compiled runtime machine
 * @param stageId - Stage identifier
 * @returns Array of steps in the stage
 */
export function getStepsByStage(
  machine: RuntimeMachine,
  stageId: string
): CompiledWorkflowStep[] {
  return machine.steps.filter((step) => step.stage === stageId);
}

/**
 * Get the stage definition for a step
 *
 * @param machine - Compiled runtime machine
 * @param stepId - Step identifier
 * @returns Stage definition, or null if not found
 */
export function getStageForStep(
  machine: RuntimeMachine,
  stepId: string
): { id: string; name: string } | null {
  const step = getStepById(machine, stepId);
  if (!step || !step.stage) return null;

  const stage = machine.stages.find((s) => s.id === step.stage);
  return stage || null;
}

/**
 * Get missing required fields for a step
 *
 * @param step - Workflow step
 * @param inputs - Current input values
 * @returns Array of missing required field names
 *
 * @example
 * const missing = missingRequiredFields(step, { email: 'test@example.com' });
 * if (missing.length > 0) {
 *   console.log('Missing fields:', missing);
 * }
 */
export function missingRequiredFields(
  step: CompiledWorkflowStep,
  inputs: Record<string, any>
): string[] {
  if (!step.required_fields || step.required_fields.length === 0) {
    return [];
  }

  return step.required_fields.filter((fieldName) => {
    const value = inputs[fieldName];
    // Check if field is missing or empty
    return (
      value === undefined ||
      value === null ||
      value === '' ||
      (Array.isArray(value) && value.length === 0)
    );
  });
}

/**
 * Check if all required fields are filled
 *
 * @param step - Workflow step
 * @param inputs - Current input values
 * @returns True if all required fields are filled
 */
export function allRequiredFieldsFilled(
  step: CompiledWorkflowStep,
  inputs: Record<string, any>
): boolean {
  return missingRequiredFields(step, inputs).length === 0;
}

/**
 * Validate inputs for a step
 *
 * @param step - Workflow step
 * @param inputs - Current input values
 * @returns Validation result with success flag and error messages
 *
 * @example
 * const result = validateStepInputs(step, inputs);
 * if (!result.valid) {
 *   console.error('Validation errors:', result.errors);
 * }
 */
export function validateStepInputs(
  step: CompiledWorkflowStep,
  inputs: Record<string, any>
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Check required fields
  const missing = missingRequiredFields(step, inputs);
  if (missing.length > 0) {
    errors.push(`Missing required fields: ${missing.join(', ')}`);
  }

  // Validate field types and rules (basic validation)
  if (step.schema?.fields) {
    for (const field of step.schema.fields) {
      const value = inputs[field.name];

      // Skip validation if field is not provided and not required
      if (value === undefined || value === null || value === '') {
        continue;
      }

      // Email validation
      if (field.type === 'email' && typeof value === 'string') {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value)) {
          errors.push(`Invalid email format for field "${field.name}"`);
        }
      }

      // Number validation
      if (field.type === 'number') {
        if (isNaN(Number(value))) {
          errors.push(`Field "${field.name}" must be a number`);
        }
      }

      // Pattern validation
      if (field.validation?.pattern && typeof value === 'string') {
        const pattern = new RegExp(field.validation.pattern);
        if (!pattern.test(value)) {
          errors.push(
            `Field "${field.name}" does not match required pattern`
          );
        }
      }

      // Min/max length validation
      if (field.validation?.minLength && typeof value === 'string') {
        if (value.length < field.validation.minLength) {
          errors.push(
            `Field "${field.name}" must be at least ${field.validation.minLength} characters`
          );
        }
      }

      if (field.validation?.maxLength && typeof value === 'string') {
        if (value.length > field.validation.maxLength) {
          errors.push(
            `Field "${field.name}" must be at most ${field.validation.maxLength} characters`
          );
        }
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Get workflow progress statistics
 *
 * @param machine - Compiled runtime machine
 * @param completedSteps - Array of completed step IDs
 * @returns Progress statistics
 *
 * @example
 * const progress = getWorkflowProgress(machine, ['step1', 'step2']);
 * console.log(`Progress: ${progress.percentage}%`);
 */
export function getWorkflowProgress(
  machine: RuntimeMachine,
  completedSteps: string[]
): {
  total: number;
  completed: number;
  remaining: number;
  percentage: number;
} {
  const total = machine.steps.length;
  const completed = completedSteps.length;
  const remaining = total - completed;
  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

  return {
    total,
    completed,
    remaining,
    percentage,
  };
}

/**
 * Get stage progress statistics
 *
 * @param machine - Compiled runtime machine
 * @param completedSteps - Array of completed step IDs
 * @returns Stage progress array
 *
 * @example
 * const stageProgress = getStageProgress(machine, ['step1', 'step2']);
 * stageProgress.forEach(s => {
 *   console.log(`${s.stageName}: ${s.percentage}%`);
 * });
 */
export function getStageProgress(
  machine: RuntimeMachine,
  completedSteps: string[]
): Array<{
  stageId: string;
  stageName: string;
  total: number;
  completed: number;
  percentage: number;
}> {
  const completedSet = new Set(completedSteps);

  return machine.stages.map((stage) => {
    const stageSteps = getStepsByStage(machine, stage.id);
    const total = stageSteps.length;
    const completed = stageSteps.filter((step) =>
      completedSet.has(step.id)
    ).length;
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

    return {
      stageId: stage.id,
      stageName: stage.name,
      total,
      completed,
      percentage,
    };
  });
}

/**
 * Check if a stage is completed
 *
 * @param machine - Compiled runtime machine
 * @param stageId - Stage identifier
 * @param completedSteps - Array of completed step IDs
 * @returns True if all steps in stage are completed
 */
export function isStageCompleted(
  machine: RuntimeMachine,
  stageId: string,
  completedSteps: string[]
): boolean {
  const stageSteps = getStepsByStage(machine, stageId);
  if (stageSteps.length === 0) return false;

  const completedSet = new Set(completedSteps);
  return stageSteps.every((step) => completedSet.has(step.id));
}

/**
 * Get next uncompleted step in workflow
 *
 * @param machine - Compiled runtime machine
 * @param completedSteps - Array of completed step IDs
 * @returns Next uncompleted step, or null if all completed
 */
export function getNextUncompletedStep(
  machine: RuntimeMachine,
  completedSteps: string[]
): CompiledWorkflowStep | null {
  const completedSet = new Set(completedSteps);

  for (const step of machine.steps) {
    if (!completedSet.has(step.id)) {
      return step;
    }
  }

  return null;
}
