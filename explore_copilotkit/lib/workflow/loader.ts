/**
 * YAML workflow and task loader
 *
 * Implements two-stage loading:
 * 1. Load workflow definitions (orchestration)
 * 2. Resolve task references and inheritance
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import * as yaml from 'yaml';
import {
  WorkflowDefinition,
  TaskDefinition,
  CompiledWorkflowStep,
  RuntimeMachine,
  ClientProfile,
} from './schema';

/**
 * Cache configuration based on environment
 */
const CACHE_CONFIG = {
  development: {
    enabled: false,    // No caching in dev for hot-reload
    ttl: 0,
    invalidateOnMtime: false,
  },
  production: {
    enabled: true,     // Enable caching in production
    ttl: 300000,       // 5 minutes in milliseconds
    invalidateOnMtime: true,
  },
};

interface CachedItem<T> {
  data: T;
  timestamp: number;
  mtime?: number;
}

const workflowCache = new Map<string, CachedItem<WorkflowDefinition>>();
const taskCache = new Map<string, CachedItem<TaskDefinition>>();

/**
 * Get cache configuration for current environment
 */
function getCacheConfig() {
  const env = process.env.NODE_ENV || 'development';
  return CACHE_CONFIG[env as keyof typeof CACHE_CONFIG] || CACHE_CONFIG.development;
}

/**
 * Check if cached item should be invalidated based on file modification time
 */
async function shouldInvalidateCache(
  filePath: string,
  cachedTimestamp: number,
  cachedMtime?: number
): Promise<boolean> {
  const config = getCacheConfig();

  if (!config.invalidateOnMtime) {
    return false;
  }

  try {
    const stats = await fs.stat(filePath);
    return stats.mtimeMs > (cachedMtime || 0);
  } catch {
    return true; // Invalidate if file doesn't exist
  }
}

/**
 * Load YAML file and parse
 */
async function loadYAML<T>(filePath: string): Promise<T> {
  try {
    const content = await fs.readFile(filePath, 'utf8');
    const parsed = yaml.parse(content);

    if (!parsed) {
      throw new Error(`Empty or invalid YAML file: ${filePath}`);
    }

    return parsed as T;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      throw new Error(`File not found: ${filePath}`);
    }

    // Provide helpful error messages for YAML syntax errors
    if (error instanceof yaml.YAMLParseError) {
      throw new Error(
        `YAML parsing failed in ${path.basename(filePath)}:${error.linePos?.[0]?.line || 'unknown'}\n` +
        `  Error: ${error.message}`
      );
    }

    throw error;
  }
}

/**
 * Load workflow definition from YAML file
 *
 * @param workflowPath - Relative path from data/workflows/ (e.g., "corporate_onboarding_v1.yaml")
 */
export async function loadWorkflow(workflowPath: string): Promise<WorkflowDefinition> {
  const fullPath = path.join(process.cwd(), 'data', 'workflows', workflowPath);
  const config = getCacheConfig();

  // Check cache
  if (config.enabled && workflowCache.has(fullPath)) {
    const cached = workflowCache.get(fullPath)!;

    // Check if cache is still valid
    const isInvalidated = await shouldInvalidateCache(fullPath, cached.timestamp, cached.mtime);

    if (!isInvalidated && Date.now() - cached.timestamp < config.ttl) {
      return cached.data;
    }
  }

  // Load from disk
  const workflow = await loadYAML<WorkflowDefinition>(fullPath);

  // Validate workflow structure
  if (!workflow.id || !workflow.name || !workflow.steps) {
    throw new Error(
      `Invalid workflow definition in ${workflowPath}: missing required fields (id, name, steps)`
    );
  }

  // Cache if enabled
  if (config.enabled) {
    const stats = await fs.stat(fullPath);
    workflowCache.set(fullPath, {
      data: workflow,
      timestamp: Date.now(),
      mtime: stats.mtimeMs,
    });
  }

  return workflow;
}

/**
 * Load task definition from YAML file
 *
 * @param taskRef - Relative path from data/tasks/ (e.g., "contact_info/corporate")
 */
export async function loadTask(taskRef: string): Promise<TaskDefinition> {
  // Add .yaml extension if not present
  const taskPath = taskRef.endsWith('.yaml') ? taskRef : `${taskRef}.yaml`;
  const fullPath = path.join(process.cwd(), 'data', 'tasks', taskPath);
  const config = getCacheConfig();

  // Check cache
  if (config.enabled && taskCache.has(fullPath)) {
    const cached = taskCache.get(fullPath)!;

    const isInvalidated = await shouldInvalidateCache(fullPath, cached.timestamp, cached.mtime);

    if (!isInvalidated && Date.now() - cached.timestamp < config.ttl) {
      return cached.data;
    }
  }

  // Load from disk
  const task = await loadYAML<TaskDefinition>(fullPath);

  // Validate task structure
  if (!task.id || !task.name || !task.component_id) {
    throw new Error(
      `Invalid task definition in ${taskPath}: missing required fields (id, name, component_id)`
    );
  }

  // Cache if enabled
  if (config.enabled) {
    const stats = await fs.stat(fullPath);
    taskCache.set(fullPath, {
      data: task,
      timestamp: Date.now(),
      mtime: stats.mtimeMs,
    });
  }

  return task;
}

/**
 * Resolve task inheritance
 *
 * Merges fields from parent tasks recursively
 */
export async function resolveTaskInheritance(
  task: TaskDefinition,
  visited = new Set<string>()
): Promise<TaskDefinition> {
  // No inheritance
  if (!task.extends) {
    return task;
  }

  // Detect circular inheritance
  if (visited.has(task.id)) {
    throw new Error(
      `Circular inheritance detected: ${Array.from(visited).join(' -> ')} -> ${task.id}`
    );
  }

  visited.add(task.id);

  // Load parent task
  const parentTask = await loadTask(task.extends);

  // Recursively resolve parent's inheritance
  const resolvedParent = await resolveTaskInheritance(parentTask, visited);

  // Merge schemas
  const mergedSchema = mergeSchemas(resolvedParent.schema, task.schema);

  // Return merged task
  return {
    ...task,
    schema: mergedSchema,
    expected_output_fields: [
      ...(resolvedParent.expected_output_fields || []),
      ...(task.expected_output_fields || []),
    ],
  };
}

/**
 * Merge parent and child schemas
 *
 * Child fields override parent fields with same name
 */
function mergeSchemas(parentSchema: any, childSchema: any): any {
  if (!parentSchema) return childSchema;
  if (!childSchema) return parentSchema;

  // Merge fields arrays
  if (parentSchema.fields && childSchema.fields) {
    const parentFields = parentSchema.fields;
    const childFields = childSchema.fields;

    // Create map of parent fields
    const fieldMap = new Map<string, any>();
    parentFields.forEach((field: any) => {
      fieldMap.set(field.name, field);
    });

    // Process child fields (override or inherit)
    childFields.forEach((field: any) => {
      if (field.inherits) {
        // Inherit from parent field with new name
        const parentField = fieldMap.get(field.inherits);
        if (parentField) {
          fieldMap.set(field.name, { ...parentField, ...field, inherits: undefined });
        } else {
          fieldMap.set(field.name, field);
        }
      } else {
        // Override or add
        fieldMap.set(field.name, field);
      }
    });

    return {
      ...parentSchema,
      ...childSchema,
      fields: Array.from(fieldMap.values()),
    };
  }

  // For non-field schemas, child completely overrides parent
  return { ...parentSchema, ...childSchema };
}

/**
 * Load all workflows from directory
 */
export async function loadWorkflows(): Promise<WorkflowDefinition[]> {
  const workflowsDir = path.join(process.cwd(), 'data', 'workflows');

  try {
    const files = await fs.readdir(workflowsDir);
    const yamlFiles = files.filter(f => f.endsWith('.yaml') || f.endsWith('.yml'));

    const workflows = await Promise.all(
      yamlFiles.map(file => loadWorkflow(file))
    );

    return workflows;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return []; // Directory doesn't exist, return empty array
    }
    throw error;
  }
}

/**
 * Select applicable workflow based on client profile
 */
export function pickApplicableWorkflow(
  workflows: WorkflowDefinition[],
  profile: ClientProfile
): WorkflowDefinition | null {
  // Find exact match
  const exactMatch = workflows.find(w => {
    if (!w.applies_to) return false;

    const typeMatch = w.applies_to.client_type === profile.client_type;
    const jurisdictionMatch = w.applies_to.jurisdictions?.includes(profile.jurisdiction);

    return typeMatch && jurisdictionMatch;
  });

  if (exactMatch) return exactMatch;

  // Find client_type match (ignore jurisdiction)
  const typeMatch = workflows.find(w => {
    if (!w.applies_to) return false;
    return w.applies_to.client_type === profile.client_type;
  });

  if (typeMatch) return typeMatch;

  // Fallback to first workflow
  return workflows[0] || null;
}

/**
 * Compile workflow into runtime machine
 *
 * Resolves all task references and creates step index
 */
export async function compileWorkflow(
  workflow: WorkflowDefinition
): Promise<RuntimeMachine> {
  // Resolve all task references
  const compiledSteps: CompiledWorkflowStep[] = await Promise.all(
    workflow.steps.map(async (stepRef) => {
      // Load task definition
      const taskDef = await loadTask(stepRef.task_ref);

      // Resolve inheritance
      const resolvedTask = await resolveTaskInheritance(taskDef);

      // Validate required fields exist in schema
      validateTaskFields(resolvedTask, stepRef.task_ref);

      // Return compiled step
      return {
        id: stepRef.id,
        stage: stepRef.stage,
        task_ref: stepRef.task_ref,
        task_definition: resolvedTask,
        component_id: resolvedTask.component_id,
        schema: resolvedTask.schema,
        required_fields: resolvedTask.required_fields,
        next: stepRef.next,
      };
    })
  );

  // Build step index for fast lookups
  const stepIndexById = new Map<string, CompiledWorkflowStep>();
  compiledSteps.forEach(step => {
    stepIndexById.set(step.id, step);
  });

  // Validate transitions
  validateTransitions(compiledSteps, stepIndexById);

  // Determine initial step
  const initialStepId = compiledSteps[0]?.id || '';

  return {
    workflowId: workflow.id,
    version: workflow.version,
    stages: workflow.stages || [],
    initialStepId,
    steps: compiledSteps,
    stepIndexById,
  };
}

/**
 * Validate task fields against schema
 */
function validateTaskFields(task: TaskDefinition, taskRef: string): void {
  if (!task.required_fields || task.required_fields.length === 0) {
    return; // No required fields to validate
  }

  // For form schemas, validate fields exist
  if (task.schema?.fields) {
    const fieldNames = new Set(task.schema.fields.map((f: any) => f.name));

    const missingFields = task.required_fields.filter(rf => !fieldNames.has(rf));

    if (missingFields.length > 0) {
      throw new Error(
        `Task validation failed in ${taskRef}:\n` +
        `  Required fields not found in schema: ${missingFields.join(', ')}`
      );
    }
  }
}

/**
 * Validate workflow transitions
 */
function validateTransitions(
  steps: CompiledWorkflowStep[],
  stepIndex: Map<string, CompiledWorkflowStep>
): void {
  const stepIds = new Set(steps.map(s => s.id));

  steps.forEach(step => {
    // Validate default transition
    if (step.next.default !== 'END' && !stepIds.has(step.next.default)) {
      throw new Error(
        `Invalid transition in step "${step.id}": ` +
        `default target "${step.next.default}" does not exist`
      );
    }

    // Validate conditional transitions
    step.next.conditions?.forEach(condition => {
      if (condition.then !== 'END' && !stepIds.has(condition.then)) {
        throw new Error(
          `Invalid transition in step "${step.id}": ` +
          `condition target "${condition.then}" does not exist`
        );
      }
    });
  });

  // Check for orphaned steps (not reachable from initial step)
  // This is optional - we'll skip for now to keep it simple
}
