# Stages and Steps Design

**Document Purpose**: Explain the conceptual model and relationships between stages and steps in the composable workflow system.

**Last Updated**: 2025-10-24

---

## Table of Contents

1. [Conceptual Model](#1-conceptual-model)
2. [Relationship Between Stages and Steps](#2-relationship-between-stages-and-steps)
3. [YAML Structure](#3-yaml-structure)
4. [TypeScript Type Definitions](#4-typescript-type-definitions)
5. [Runtime Implementation](#5-runtime-implementation)
6. [Design Principles](#6-design-principles)
7. [Examples](#7-examples)

---

## 1. Conceptual Model

### **Stage**: Major Phase or Milestone

A **stage** represents a **major phase** in the workflow journey. Think of it as a high-level grouping or milestone.

**Characteristics**:
- **Coarse-grained**: Represents a significant phase of work
- **Human-readable**: Business users understand what this phase means
- **Progress tracking**: Used for reporting and dashboards
- **Sequential or parallel**: Can contain multiple steps that execute in sequence

**Examples**:
- `information_collection` - Gather all client data
- `compliance_review` - Review and verify compliance requirements
- `finalization` - Final approval and activation

**Purpose**:
- Provide structure to long workflows
- Enable progress tracking at a high level
- Group related tasks for reporting
- Define workflow milestones

---

### **Step**: Atomic Unit of Work

A **step** represents an **atomic unit of work** - a single task that the user must complete to progress.

**Characteristics**:
- **Fine-grained**: One specific action or form to complete
- **Executable**: Maps to a specific UI component and task definition
- **Conditional routing**: Can branch to different next steps based on inputs
- **Field validation**: Has required fields that gate progression

**Examples**:
- `collectContactInfo` - Collect corporate contact information
- `collectDocuments` - Upload business documents
- `enhancedDueDiligence` - Perform enhanced due diligence (conditional)
- `review` - Review and submit all information

**Purpose**:
- Define the actual work to be done
- Reference task schemas (ground truth)
- Control workflow transitions
- Enforce field validation

---

## 2. Relationship Between Stages and Steps

### Hierarchical Containment

```
Workflow
  └─ Stage 1: Information Collection
       ├─ Step 1: collectContactInfo
       ├─ Step 2: collectDocuments
       └─ Step 3: collectBusinessDetails
  └─ Stage 2: Compliance Review
       ├─ Step 4: basicDueDiligence
       └─ Step 5: enhancedDueDiligence (conditional)
  └─ Stage 3: Finalization
       └─ Step 6: review
```

### Key Relationships

**1. Membership (One-to-Many)**
- Each **step** belongs to **one stage** (via `stage` field)
- Each **stage** contains **zero or more steps**
- Steps reference their stage: `stage: information_collection`

**2. Execution Flow**
- **Steps execute sequentially** within and across stages
- **Stages do NOT enforce boundaries** - a step in Stage 1 can transition to a step in Stage 3
- **Stages are for grouping only** - they don't control execution flow

**3. Progress Tracking**
- **Step-level**: Track individual task completion
- **Stage-level**: Calculate percentage based on completed steps in that stage
- **Workflow-level**: Overall completion based on all steps

### Important: Stages Are Groupings, Not Gates

**Stages DO NOT**:
- Block progression to the next stage
- Enforce that all steps in a stage must complete before moving to the next stage
- Control workflow transitions (that's the job of steps)

**Stages DO**:
- Group related steps for human understanding
- Enable progress reporting per phase
- Provide structure for long workflows
- Help with UI organization (e.g., showing current stage)

**Example**:
```yaml
steps:
  - id: step1
    stage: information_collection
    next:
      default: step3  # Can skip to a different stage!

  - id: step2
    stage: information_collection
    next:
      default: step3

  - id: step3
    stage: compliance_review  # Different stage
    next:
      default: END
```

In this example:
- `step1` transitions directly to `step3` (different stage)
- `step2` is never visited unless explicitly routed to
- Stages are purely organizational

---

## 3. YAML Structure

### Workflow File Structure

**Location**: `data/workflows/corporate_onboarding_v1.yaml`

```yaml
id: wf_corporate_v1
name: Corporate Onboarding v1
version: 1
description: Complete onboarding workflow for corporate entities

applies_to:
  client_type: corporate
  jurisdictions: ["US", "CA", "GB"]

# Stage definitions (organizational groupings)
stages:
  - id: information_collection
    name: Information Collection
    description: Gather client information and documents

  - id: compliance_review
    name: Compliance Review
    description: Review and verify compliance requirements

  - id: finalization
    name: Finalization
    description: Final review and approval

# Step definitions (actual workflow execution)
steps:
  # Step 1: Belongs to information_collection stage
  - id: collectContactInfo
    stage: information_collection      # STAGE MEMBERSHIP
    task_ref: contact_info/corporate  # TASK REFERENCE (ground truth)
    next:
      default: collectDocuments        # TRANSITION LOGIC

  # Step 2: Also belongs to information_collection stage
  - id: collectDocuments
    stage: information_collection
    task_ref: documents/corporate
    next:
      conditions:                      # CONDITIONAL ROUTING
        - when: "risk_score > 70"
          then: enhancedDueDiligence
      default: review                  # Can skip to finalization stage!

  # Step 3: Belongs to compliance_review stage
  - id: enhancedDueDiligence
    stage: compliance_review
    task_ref: due_diligence/enhanced
    next:
      default: review

  # Step 4: Belongs to finalization stage
  - id: review
    stage: finalization
    task_ref: review/summary
    next:
      default: END
```

### Key YAML Fields

**Stage Definition**:
```yaml
stages:
  - id: information_collection          # Unique stage ID
    name: Information Collection         # Human-readable name
    description: Gather client info      # Optional description
```

**Step Definition**:
```yaml
steps:
  - id: collectContactInfo               # Unique step ID
    stage: information_collection        # Stage membership (optional)
    task_ref: contact_info/corporate    # Reference to task file (required)
    next:                                # Transition rules (required)
      conditions:                        # Optional conditional routing
        - when: "risk_score > 70"
          then: enhancedDueDiligence
      default: review                    # Required default transition
```

**Important Notes**:
- `stage` field in steps is **optional** (steps can exist without a stage)
- `task_ref` points to a task file in `data/tasks/` (ground truth schema)
- `next.default` is **required** (must be a step ID or "END")
- Steps do NOT contain `required_fields` or `component_id` (those come from task files)

---

## 4. TypeScript Type Definitions

**Location**: `lib/workflow/schema.ts`

### Stage Definition

```typescript
export interface StageDefinition {
  id: string;              // Unique stage identifier (e.g., "information_collection")
  name: string;            // Human-readable name (e.g., "Information Collection")
  description?: string;    // Optional description for UI
}
```

### Workflow Step Reference (Before Compilation)

```typescript
export interface WorkflowStepReference {
  id: string;              // Unique step identifier
  stage?: string;          // Optional stage membership
  task_ref: string;        // Path to task file (e.g., "contact_info/corporate")
  next: WorkflowStepNext;  // Transition rules
}
```

### Compiled Workflow Step (After Task Resolution)

```typescript
export interface CompiledWorkflowStep {
  id: string;                        // Step ID
  stage?: string;                    // Stage membership
  task_ref: string;                  // Task reference path
  task_definition: TaskDefinition;   // Resolved task definition (from task file)
  component_id: string;              // UI component ID (from task file)
  schema: any;                       // Field schema (from task file)
  required_fields: string[];         // Required fields (from task file)
  next: WorkflowStepNext;            // Transition rules (from workflow file)
}
```

### Runtime Machine

```typescript
export interface RuntimeMachine {
  workflowId: string;                             // Workflow identifier
  version: number;                                // Workflow version
  stages: StageDefinition[];                      // All stage definitions
  initialStepId: string;                          // First step to execute
  steps: CompiledWorkflowStep[];                  // All compiled steps
  stepIndexById: Map<string, CompiledWorkflowStep>; // Fast step lookup
}
```

---

## 5. Runtime Implementation

**Location**: `lib/workflow/engine.ts`

### Stage-Related Functions

**Get all steps in a stage**:
```typescript
export function getStepsByStage(
  machine: RuntimeMachine,
  stageId: string
): CompiledWorkflowStep[] {
  return machine.steps.filter((step) => step.stage === stageId);
}
```

**Get the stage for a specific step**:
```typescript
export function getStageForStep(
  machine: RuntimeMachine,
  stepId: string
): { id: string; name: string } | null {
  const step = getStepById(machine, stepId);
  if (!step || !step.stage) return null;

  const stage = machine.stages.find((s) => s.id === step.stage);
  return stage || null;
}
```

**Calculate stage progress**:
```typescript
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
```

**Check if stage is completed**:
```typescript
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
```

### Step Execution Flow

1. **Start**: `getInitialStep(machine)` returns first step
2. **Execute**: User completes required fields for current step
3. **Validate**: `canTransitionFrom(step, inputs)` checks if required fields are present
4. **Transition**: `nextStepId(step, inputs)` evaluates conditions and returns next step
5. **Repeat**: Continue until next step is "END"

**Stages are NOT part of the execution flow** - they're only used for:
- Progress reporting
- UI organization
- Human understanding

---

## 6. Design Principles

### 1. Separation of Concerns

**Workflows** (Level 1):
- Define **WHAT** to do and **WHEN** to do it
- Control **WHERE** to go next (transitions)
- Organize steps into **stages** (grouping)

**Tasks** (Level 2):
- Define **HOW** to collect data (field schemas)
- Specify **WHICH** fields are required
- Configure **UI component** to render

**Benefits**:
- Single source of truth for schemas (tasks)
- Reusability: same task can be used in multiple workflows
- Maintainability: change schema once, affects all workflows

### 2. Stages as Organizational Groupings

**Stages are NOT**:
- Execution boundaries
- Gating mechanisms
- State machines

**Stages ARE**:
- Progress indicators
- Organizational structure
- Reporting units

**Example**:
```
Stage 1: Information Collection [2/3 steps complete] (67%)
  ✅ collectContactInfo
  ✅ collectDocuments
  ⏳ collectBusinessDetails

Stage 2: Compliance Review [0/2 steps complete] (0%)
  ⏸️ basicDueDiligence
  ⏸️ enhancedDueDiligence

Stage 3: Finalization [0/1 steps complete] (0%)
  ⏸️ review
```

### 3. Conditional Step Transitions

Steps can branch based on collected inputs:

```yaml
- id: collectDocuments
  stage: information_collection
  task_ref: documents/corporate
  next:
    conditions:
      - when: "risk_score > 70"          # High risk → enhanced DD
        then: enhancedDueDiligence
      - when: "jurisdiction == 'US'"     # US → additional forms
        then: collectW9
    default: review                      # Normal path → skip to finalization
```

**Key Points**:
- Conditions evaluated **top to bottom**
- First matching condition wins
- `default` is used if no conditions match
- Can skip stages entirely based on conditions

### 4. Required Fields Enforcement

Steps cannot transition until required fields are collected:

```typescript
// In workflow YAML (orchestration only)
steps:
  - id: collectContactInfo
    task_ref: contact_info/corporate  # Task file defines required fields
    next:
      default: nextStep

// In task file (ground truth schema)
required_fields:
  - legalName
  - businessEmail
  - businessPhone

// At runtime (engine enforces)
if (!canTransitionFrom(step, inputs)) {
  // Block: missing required fields
  const missing = missingRequiredFields(step, inputs);
  console.log("Cannot proceed. Missing:", missing);
}
```

---

## 7. Examples

### Example 1: Corporate Onboarding Workflow

**File**: `data/workflows/corporate_onboarding_v1.yaml`

```yaml
stages:
  - id: information_collection
    name: Information Collection

  - id: compliance_review
    name: Compliance Review

  - id: finalization
    name: Finalization

steps:
  - id: collectContactInfo
    stage: information_collection
    task_ref: contact_info/corporate
    next:
      default: collectDocuments

  - id: collectDocuments
    stage: information_collection
    task_ref: documents/corporate
    next:
      conditions:
        - when: "risk_score > 70"
          then: enhancedDueDiligence
      default: review

  - id: enhancedDueDiligence
    stage: compliance_review
    task_ref: due_diligence/enhanced
    next:
      default: review

  - id: review
    stage: finalization
    task_ref: review/summary
    next:
      default: END
```

**Execution Paths**:

**Normal Risk Client** (risk_score ≤ 70):
```
collectContactInfo → collectDocuments → review → END
Stage 1: 100% (2/2)    Stage 2: 0% (0/1)    Stage 3: 100% (1/1)
```

**High Risk Client** (risk_score > 70):
```
collectContactInfo → collectDocuments → enhancedDueDiligence → review → END
Stage 1: 100% (2/2)    Stage 2: 100% (1/1)   Stage 3: 100% (1/1)
```

### Example 2: Individual Onboarding (Simplified)

```yaml
stages:
  - id: setup
    name: Initial Setup

  - id: activation
    name: Activation

steps:
  - id: collectPersonalInfo
    stage: setup
    task_ref: contact_info/individual
    next:
      default: collectIdentification

  - id: collectIdentification
    stage: setup
    task_ref: identification/passport
    next:
      default: activate

  - id: activate
    stage: activation
    task_ref: activation/account
    next:
      default: END
```

**Linear Path**:
```
collectPersonalInfo → collectIdentification → activate → END
Stage 1: 100% (2/2)    Stage 2: 100% (1/1)
```

### Example 3: Multi-Stage with Parallel Branches

```yaml
stages:
  - id: assessment
    name: Risk Assessment

  - id: processing
    name: Processing

steps:
  - id: assess
    stage: assessment
    task_ref: assessment/risk
    next:
      conditions:
        - when: "risk == 'high'"
          then: manualReview
        - when: "risk == 'low'"
          then: autoApprove
      default: standardReview

  - id: manualReview
    stage: processing
    task_ref: review/manual
    next:
      default: END

  - id: autoApprove
    stage: processing
    task_ref: approval/automatic
    next:
      default: END

  - id: standardReview
    stage: processing
    task_ref: review/standard
    next:
      default: END
```

**Three Possible Paths**:
```
High Risk:     assess → manualReview → END
Low Risk:      assess → autoApprove → END
Medium Risk:   assess → standardReview → END
```

**Stage Completion**:
- Stage 1 (assessment): Always 100% (1/1 step)
- Stage 2 (processing): Always 33% (1/3 steps completed, since only one path is taken)

---

## Summary

### Stages
- **Purpose**: Organizational groupings for progress tracking
- **Granularity**: Coarse-grained (major phases)
- **Execution**: Do NOT control workflow flow
- **Usage**: Progress reporting, UI organization, human understanding

### Steps
- **Purpose**: Atomic units of work
- **Granularity**: Fine-grained (single tasks)
- **Execution**: Control workflow flow via `next` transitions
- **Usage**: Actual work execution, field validation, conditional branching

### Relationship
- **Containment**: Steps belong to stages (many-to-one)
- **Independence**: Steps can transition across stage boundaries
- **Progress**: Stage completion calculated from step completion
- **Organization**: Stages provide structure, steps provide execution

### Two-Level Architecture
- **Workflow files**: Orchestration (stages, steps, transitions)
- **Task files**: Ground truth schemas (fields, validation, component config)
- **Separation**: Workflows reference tasks, don't define schemas

---

**End of Design Document**
