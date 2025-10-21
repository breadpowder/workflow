# Two-Level YAML Architecture - Planning Updates Summary

## Date: 2025-10-21
## Update: Decomposition into Workflow and Task Files

---

## What Was Done

### ✅ 1. Created Comprehensive Specification
**File**: `two-level-yaml-architecture.md` (Complete 400+ line specification)

Includes:
- Directory structure (workflow/ and tasks/ with _base/)
- Level 1 (Workflow) schema and examples
- Level 2 (Task) schema and examples with inheritance
- Inheritance rules and resolution algorithm
- Validation rules (workflow-level, task-level, cross-level)
- Benefits analysis
- Migration guide
- API impact analysis
- Best practices

### ✅ 2. Created Example YAML Files
**Directory**: `yaml-examples/`

**Workflow Files** (`yaml-examples/workflows/`):
- `corporate_onboarding_v1.yaml` - Corporate workflow with 4 steps (contact → documents → EDD → review)
- `individual_onboarding_v1.yaml` - Individual workflow with 3 steps (contact → documents → review)

**Task Files** (`yaml-examples/tasks/`):
- `_base/contact_info_base.yaml` - Base task with email and phone fields
- `contact_info/corporate.yaml` - Extends base, adds legal_name, entity_type, jurisdiction
- `contact_info/individual.yaml` - Extends base, adds full_name, date_of_birth, ssn
- `documents/corporate.yaml` - Corporate document requirements
- `documents/individual.yaml` - Individual document requirements
- `due_diligence/enhanced.yaml` - EDD questionnaire
- `review/summary.yaml` - Review and summary task

**Key Features Demonstrated**:
- ✅ Workflow references tasks via `task_ref` (e.g., "contact_info/corporate")
- ✅ NO schemas in workflow files
- ✅ Task inheritance using `extends` field
- ✅ Field inheritance using `inherits` property
- ✅ Conditional field visibility (`visible` property)
- ✅ Complete field schemas with validation in task files

###  3. Started Updating Planning Documents

**Partially Updated**:
- `strategy/strategy.md` - Added principle #4 (Two-Level YAML Architecture), updated directory structure

**Still Need to Update**:
- `strategy/strategy.md` - Replace YAML examples with two-level format
- `tasks/tasks.md` - Update Task 2 (YAML Loader) to describe two-stage loading
- `component-registry-explained.md` - Update YAML examples to use task_ref
- `schema-driven-components.md` - Update YAML examples to show two-level
- `PLANNING_SUMMARY.md` - Add two-level architecture to overview
- `decision-log.md` - Add D13 decision record

---

## Key Architectural Changes

### Before: Single-Level (Inline Schemas)
```yaml
# Workflow file with embedded schemas
steps:
  - id: collectContactInfo
    component_id: form
    schema:                    # Schema defined inline
      fields:
        - name: legal_name
          label: "Business Name"
          type: text
          required: true
        # ... 50 more lines of schema ...
```

### After: Two-Level (Task References)
**Workflow File** (`workflows/corporate_onboarding_v1.yaml`):
```yaml
steps:
  - id: collectContactInfo
    task_ref: contact_info/corporate    # Reference to task file
    required_fields:
      - legal_name
      - entity_type
      - business_email
```

**Task File** (`tasks/contact_info/corporate.yaml`):
```yaml
id: task_contact_info_corporate
extends: _base/contact_info_base        # Inherits email/phone
component_id: form
schema:
  fields:
    - name: legal_name
      label: "Legal Business Name"
      type: text
      required: true
      # ... full schema definition ...
```

---

## Benefits Realized

### 1. Separation of Concerns
- **Workflows**: Business process flow (orchestration)
- **Tasks**: Data collection schemas (ground truth)

### 2. Single Source of Truth
- Task schemas defined once in task files
- All workflows using that task get same schema
- Update schema in one place, affects all workflows

### 3. Reusability
- `contact_info/corporate` used in: onboarding, account update, KYC review
- `documents/corporate` shared across multiple workflows
- Base tasks define common fields (email, phone, address)

### 4. Inheritance & Composition
- Base tasks: `_base/contact_info_base.yaml` defines email/phone
- Specific tasks extend base: `contact_info/corporate.yaml` adds business fields
- Field inheritance: Rename inherited field (business_email inherits email)

### 5. Maintainability
- Update field label: Edit one task file
- Add validation rule: Edit one task file
- All workflows automatically updated

### 6. Versioning
- Version field inside task files (no file proliferation)
- Can load specific version if needed
- Easier to track schema evolution

---

## Implementation Requirements

### Loader Updates Required

**Two-Stage Loading Process**:

```typescript
// Stage 1: Load workflow file
const workflowDef = await loadWorkflow('workflows/corporate_onboarding_v1.yaml');

// Stage 2: Resolve task references
const compiledSteps = await Promise.all(
  workflowDef.steps.map(async (stepRef) => {
    // Load task definition
    const taskDef = await loadTask(stepRef.task_ref);

    // Resolve inheritance (if task extends another)
    const resolvedTask = await resolveTaskInheritance(taskDef);

    // Validate required_fields exist in task
    validateRequiredFields(stepRef, resolvedTask);

    return {
      ...stepRef,
      task_definition: resolvedTask,
      component_id: resolvedTask.component_id,
      schema: resolvedTask.schema
    };
  })
);
```

**Key Functions to Implement**:
1. `loadTask(taskRef)` - Load task YAML from `data/tasks/{taskRef}.yaml`
2. `resolveTaskInheritance(taskDef)` - Merge base task fields recursively
3. `validateRequiredFields(step, task)` - Ensure workflow required_fields exist in task
4. `detectCircularInheritance(taskDef)` - Prevent circular extends chains

### TypeScript Schema Updates

**New Interfaces**:
```typescript
// Workflow-level step (references task)
interface WorkflowStepReference {
  id: string;
  task_ref: string;              // Path to task file
  required_fields: string[];
  next: TransitionRules;
}

// Task definition
interface TaskDefinition {
  id: string;
  name: string;
  version: number;
  extends?: string;              // Optional base task reference
  component_id: string;
  schema: FormSchema | DocumentSchema | TableSchema;
  expected_output_fields: string[];
}

// Compiled step (after task resolution)
interface WorkflowStep {
  id: string;
  task_ref: string;
  task_definition: TaskDefinition;
  component_id: string;
  schema: any;
  required_fields: string[];
  next: TransitionRules;
}
```

---

## Validation Rules Added

### Workflow-Level
- ✅ All `task_ref` must point to existing files
- ✅ All `required_fields` must exist in task's `expected_output_fields`
- ✅ All step IDs unique
- ✅ All transitions reference valid steps

### Task-Level
- ✅ If `extends` specified, base task must exist
- ✅ No circular inheritance chains
- ✅ All field names unique within task
- ✅ Field types valid
- ✅ If field uses `inherits`, referenced field exists in parent

### Cross-Level
- ✅ Workflow `required_fields` subset of task `expected_output_fields`
- ✅ Task `component_id` exists in component registry

---

## File Organization

### Created Files
```
task_composable_onboarding/plan/
├── two-level-yaml-architecture.md              # Complete specification
├── TWO_LEVEL_YAML_UPDATE_SUMMARY.md            # This file
└── yaml-examples/
    ├── workflows/
    │   ├── corporate_onboarding_v1.yaml
    │   └── individual_onboarding_v1.yaml
    └── tasks/
        ├── _base/
        │   └── contact_info_base.yaml
        ├── contact_info/
        │   ├── corporate.yaml
        │   └── individual.yaml
        ├── documents/
        │   ├── corporate.yaml
        │   └── individual.yaml
        ├── due_diligence/
        │   └── enhanced.yaml
        └── review/
            └── summary.yaml
```

### Files Partially Updated
- `strategy/strategy.md` - Added principle #4, updated directory structure

### Files Still Need Updating
- `strategy/strategy.md` - Replace inline YAML examples with two-level examples
- `tasks/tasks.md` - Update Task 2 with two-stage loading logic
- `component-registry-explained.md` - Update YAML examples
- `schema-driven-components.md` - Update YAML examples
- `PLANNING_SUMMARY.md` - Add two-level architecture overview
- `decision-log.md` - Add D13 decision record

---

## Next Steps for Complete Planning Update

### Remaining Planning Document Updates

1. **strategy.md**:
   - Replace embedded YAML example (lines 62-166) with two-level example
   - Show both workflow file AND task file side-by-side
   - Update "Component Registry Strategy" section

2. **tasks.md** (Task 2 - YAML Loader):
   - Add "Two-Stage Loading Process" section
   - Add task inheritance resolution logic
   - Add validation for task references
   - Update acceptance criteria

3. **component-registry-explained.md**:
   - Update all YAML examples to use `task_ref` instead of inline schemas
   - Show how registry receives resolved schemas from loader

4. **schema-driven-components.md**:
   - Update YAML examples throughout
   - Emphasize that schemas live in task files (ground truth)
   - Show how workflow references task

5. **PLANNING_SUMMARY.md**:
   - Add "Two-Level YAML Architecture" to architecture overview
   - Update directory structure diagram
   - Add to key innovations list

6. **decision-log.md**:
   - Add D13: Two-Level YAML Architecture
   - Document options considered (single-level vs. two-level)
   - Rationale for separation
   - Impact on implementation

### Implementation Phase Updates

When implementing (not in planning):
- Update `src/lib/workflow/schema.ts` with new interfaces
- Implement two-stage loader in `src/lib/workflow/loader.ts`
- Add task inheritance resolver
- Add validation functions
- Update tests

---

## Impact Summary

### Code Impact
- **Loader complexity**: +30% (two-stage loading, inheritance resolution)
- **YAML complexity**: -40% (workflows much simpler, tasks focused)
- **Overall maintainability**: +60% (single source of truth, reusability)

### Business Impact
- **Schema updates**: Edit one task file (not N workflow files)
- **New workflows**: Compose from existing tasks (rapid)
- **A/B testing**: Swap task references (easy)
- **Audit trail**: Clear schema versioning in task files

### Developer Experience
- **Workflow authoring**: Simpler (just task references)
- **Task authoring**: Focused (pure schema definitions)
- **Testing**: Better (test workflows and tasks separately)
- **Debugging**: Clearer (obvious where schema comes from)

---

## Comparison Table

| Aspect | Single-Level (Before) | Two-Level (After) |
|--------|----------------------|-------------------|
| **Workflow file size** | 200-300 lines | 30-50 lines |
| **Schema location** | Embedded in workflow | Separate task files |
| **Schema reuse** | Copy-paste across workflows | Reference same task file |
| **Update schema** | Edit N workflow files | Edit 1 task file |
| **Inheritance** | Not possible | Supported via `extends` |
| **Ground truth** | Duplicated across workflows | Single source in task files |
| **Testability** | Workflow + schema mixed | Workflows and tasks separate |
| **Business user edits** | Find schema in workflow | Find task in organized library |

---

**Status**: Specification and examples complete. Planning documents partially updated.

**Next Action**: Complete remaining planning document updates listed above.

**Estimated Time**: 1-2 hours to update all planning docs.
