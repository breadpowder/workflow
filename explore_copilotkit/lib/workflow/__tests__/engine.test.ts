/**
 * Engine Tests
 *
 * Tests for workflow engine runtime functions
 */

import {
  getStepById,
  hasStep,
  getAllStepIds,
  getInitialStep,
  isFinalStep,
  missingRequiredFields,
  allRequiredFieldsFilled,
  validateStepInputs,
  getWorkflowProgress,
  getStageProgress,
  isStageCompleted,
  getNextUncompletedStep,
} from '../engine';
import { RuntimeMachine, CompiledWorkflowStep } from '../schema';

// Mock runtime machine for testing
const mockMachine: RuntimeMachine = {
  workflowId: 'test_workflow',
  version: 1,
  initialStepId: 'step1',
  stages: [
    { id: 'stage1', name: 'Stage 1' },
    { id: 'stage2', name: 'Stage 2' },
  ],
  steps: [
    {
      id: 'step1',
      stage: 'stage1',
      task_ref: 'task1',
      task_definition: {
        id: 'task1',
        name: 'Task 1',
        description: 'Test task 1',
        version: 1,
        component_id: 'form',
        required_fields: ['email', 'name'],
        schema: {
          fields: [
            { name: 'email', type: 'email', required: true },
            { name: 'name', type: 'text', required: true },
          ],
        },
        expected_output_fields: ['email', 'name'],
      },
      component_id: 'form',
      schema: {
        fields: [
          { name: 'email', type: 'email', required: true },
          { name: 'name', type: 'text', required: true },
        ],
      },
      required_fields: ['email', 'name'],
      next: { default: 'step2' },
    },
    {
      id: 'step2',
      stage: 'stage2',
      task_ref: 'task2',
      task_definition: {
        id: 'task2',
        name: 'Task 2',
        description: 'Test task 2',
        version: 1,
        component_id: 'review-summary',
        required_fields: [],
        schema: {},
        expected_output_fields: [],
      },
      component_id: 'review-summary',
      schema: {},
      required_fields: [],
      next: { default: 'END' },
    },
  ] as CompiledWorkflowStep[],
  stepIndexById: new Map(),
};

// Build step index
mockMachine.steps.forEach((step) => {
  mockMachine.stepIndexById.set(step.id, step);
});

describe('Workflow Engine', () => {
  describe('getStepById', () => {
    test('should return step when it exists', () => {
      const step = getStepById(mockMachine, 'step1');
      expect(step).not.toBeNull();
      expect(step?.id).toBe('step1');
    });

    test('should return null when step does not exist', () => {
      const step = getStepById(mockMachine, 'nonexistent');
      expect(step).toBeNull();
    });
  });

  describe('hasStep', () => {
    test('should return true for existing step', () => {
      expect(hasStep(mockMachine, 'step1')).toBe(true);
    });

    test('should return false for non-existing step', () => {
      expect(hasStep(mockMachine, 'nonexistent')).toBe(false);
    });
  });

  describe('getAllStepIds', () => {
    test('should return all step IDs in order', () => {
      const ids = getAllStepIds(mockMachine);
      expect(ids).toEqual(['step1', 'step2']);
    });
  });

  describe('getInitialStep', () => {
    test('should return the initial step', () => {
      const step = getInitialStep(mockMachine);
      expect(step).not.toBeNull();
      expect(step?.id).toBe('step1');
    });
  });

  describe('isFinalStep', () => {
    test('should return true for step that transitions to END', () => {
      const step = getStepById(mockMachine, 'step2');
      expect(isFinalStep(step!)).toBe(true);
    });

    test('should return false for step that does not transition to END', () => {
      const step = getStepById(mockMachine, 'step1');
      expect(isFinalStep(step!)).toBe(false);
    });
  });

  describe('missingRequiredFields', () => {
    test('should return empty array when all required fields are filled', () => {
      const step = getStepById(mockMachine, 'step1')!;
      const inputs = { email: 'test@example.com', name: 'Test User' };
      const missing = missingRequiredFields(step, inputs);
      expect(missing).toEqual([]);
    });

    test('should return missing field names', () => {
      const step = getStepById(mockMachine, 'step1')!;
      const inputs = { email: 'test@example.com' };
      const missing = missingRequiredFields(step, inputs);
      expect(missing).toEqual(['name']);
    });

    test('should detect empty strings as missing', () => {
      const step = getStepById(mockMachine, 'step1')!;
      const inputs = { email: '', name: 'Test User' };
      const missing = missingRequiredFields(step, inputs);
      expect(missing).toEqual(['email']);
    });
  });

  describe('allRequiredFieldsFilled', () => {
    test('should return true when all fields are filled', () => {
      const step = getStepById(mockMachine, 'step1')!;
      const inputs = { email: 'test@example.com', name: 'Test User' };
      expect(allRequiredFieldsFilled(step, inputs)).toBe(true);
    });

    test('should return false when fields are missing', () => {
      const step = getStepById(mockMachine, 'step1')!;
      const inputs = { email: 'test@example.com' };
      expect(allRequiredFieldsFilled(step, inputs)).toBe(false);
    });
  });

  describe('validateStepInputs', () => {
    test('should validate successfully with correct inputs', () => {
      const step = getStepById(mockMachine, 'step1')!;
      const inputs = { email: 'test@example.com', name: 'Test User' };
      const result = validateStepInputs(step, inputs);
      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    test('should fail validation for missing required fields', () => {
      const step = getStepById(mockMachine, 'step1')!;
      const inputs = { email: 'test@example.com' };
      const result = validateStepInputs(step, inputs);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    test('should fail validation for invalid email', () => {
      const step = getStepById(mockMachine, 'step1')!;
      const inputs = { email: 'invalid-email', name: 'Test User' };
      const result = validateStepInputs(step, inputs);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('email'))).toBe(true);
    });
  });

  describe('getWorkflowProgress', () => {
    test('should calculate progress correctly', () => {
      const progress = getWorkflowProgress(mockMachine, ['step1']);
      expect(progress.total).toBe(2);
      expect(progress.completed).toBe(1);
      expect(progress.remaining).toBe(1);
      expect(progress.percentage).toBe(50);
    });

    test('should handle no completed steps', () => {
      const progress = getWorkflowProgress(mockMachine, []);
      expect(progress.percentage).toBe(0);
    });

    test('should handle all completed steps', () => {
      const progress = getWorkflowProgress(mockMachine, ['step1', 'step2']);
      expect(progress.percentage).toBe(100);
    });
  });

  describe('getStageProgress', () => {
    test('should calculate stage progress correctly', () => {
      const stageProgress = getStageProgress(mockMachine, ['step1']);
      expect(stageProgress.length).toBe(2);
      expect(stageProgress[0].stageId).toBe('stage1');
      expect(stageProgress[0].completed).toBe(1);
      expect(stageProgress[0].percentage).toBe(100);
      expect(stageProgress[1].percentage).toBe(0);
    });
  });

  describe('isStageCompleted', () => {
    test('should return true when all stage steps are completed', () => {
      expect(isStageCompleted(mockMachine, 'stage1', ['step1'])).toBe(true);
    });

    test('should return false when stage steps are not completed', () => {
      expect(isStageCompleted(mockMachine, 'stage2', ['step1'])).toBe(false);
    });
  });

  describe('getNextUncompletedStep', () => {
    test('should return first uncompleted step', () => {
      const next = getNextUncompletedStep(mockMachine, []);
      expect(next?.id).toBe('step1');
    });

    test('should return second step when first is completed', () => {
      const next = getNextUncompletedStep(mockMachine, ['step1']);
      expect(next?.id).toBe('step2');
    });

    test('should return null when all steps are completed', () => {
      const next = getNextUncompletedStep(mockMachine, ['step1', 'step2']);
      expect(next).toBeNull();
    });
  });
});
