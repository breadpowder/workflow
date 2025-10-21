/**
 * TypeScript type definitions for YAML-driven workflows
 *
 * This file defines the schemas for:
 * - Workflow definitions (Level 1: Orchestration)
 * - Task definitions (Level 2: Ground truth schemas)
 * - Runtime machine (Compiled workflow)
 */

/**
 * Client profile for workflow selection
 */
export interface ClientProfile {
  client_type: string;
  jurisdiction: string;
}

/**
 * Stage definition for grouping workflow steps
 */
export interface StageDefinition {
  id: string;
  name: string;
  description?: string;
}

/**
 * Condition for workflow step transitions
 */
export interface WorkflowStepNextCondition {
  when: string;  // Expression like "risk_score > 70"
  then: string;  // Target step ID
}

/**
 * Transition rules for workflow steps
 */
export interface WorkflowStepNext {
  conditions?: WorkflowStepNextCondition[];
  default: string;  // Default next step or "END"
}

/**
 * Workflow step reference (before task resolution)
 */
export interface WorkflowStepReference {
  id: string;
  stage?: string;           // Optional stage membership
  task_ref: string;         // Path to task file (e.g., "contact_info/corporate")
  next: WorkflowStepNext;
}

/**
 * Workflow definition (Level 1: Orchestration)
 *
 * Location: data/workflows/*.yaml
 * Purpose: Define workflow structure, step sequence, transitions
 */
export interface WorkflowDefinition {
  id: string;
  name: string;
  version: number;
  description?: string;
  applies_to?: {
    client_type: string;
    jurisdictions: string[];
  };
  stages?: StageDefinition[];
  steps: WorkflowStepReference[];
}

/**
 * Field schema from task definition
 */
export interface FieldSchema {
  name: string;
  label: string;
  type: string;
  required?: boolean;
  placeholder?: string;
  helpText?: string;
  validation?: Record<string, any>;
  options?: Array<{ value: string; label: string }>;
  defaultValue?: any;
  visible?: string;
  inherits?: string;  // For inheritance: field to inherit from
}

/**
 * Task definition (Level 2: Ground truth schemas)
 *
 * Location: data/tasks/ (subdirectories)
 * Purpose: Define canonical field schemas, validation rules, UI component config
 */
export interface TaskDefinition {
  id: string;
  name: string;
  description: string;
  version: number;
  extends?: string;  // Base task to inherit from
  component_id: string;
  required_fields: string[];
  schema: any;  // FormSchema, DocumentSchema, etc.
  expected_output_fields: string[];
  tags?: string[];
}

/**
 * Compiled workflow step (after task resolution)
 *
 * Includes resolved task definition and schema
 */
export interface CompiledWorkflowStep {
  id: string;
  stage?: string;
  task_ref: string;
  task_definition: TaskDefinition;
  component_id: string;
  schema: any;
  required_fields: string[];
  next: WorkflowStepNext;
}

/**
 * Runtime machine (compiled workflow)
 *
 * Optimized for runtime execution with step index for fast lookups
 */
export interface RuntimeMachine {
  workflowId: string;
  version: number;
  stages: StageDefinition[];
  initialStepId: string;
  steps: CompiledWorkflowStep[];
  stepIndexById: Map<string, CompiledWorkflowStep>;
}

/**
 * Inputs collected from user
 */
export type Inputs = Record<string, any>;

/**
 * Validation result
 */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
}
