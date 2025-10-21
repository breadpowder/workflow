# Two-Level YAML Architecture Specification

## Overview

The workflow system uses a **two-level YAML architecture** that separates workflow orchestration from field schema definitions (ground truth).

**Key Principle**: Separation of Concerns
- **Workflow files** (Level 1): Define WHAT to do, WHEN to do it, WHERE to go next
- **Task files** (Level 2): Define HOW to collect data, WHICH fields, validation rules

**Key Benefit**: Task definitions are the **single source of truth** and can be reused across multiple workflows.

---

## Directory Structure

```
data/
├── workflows/                           # Level 1: Workflow orchestration
│   ├── corporate_onboarding_v1.yaml
│   ├── individual_onboarding_v1.yaml
│   ├── trust_onboarding_v1.yaml
│   └── account_update_v1.yaml
│
└── tasks/                               # Level 2: Ground truth schemas
    ├── _base/                           # Base task definitions (for inheritance)
    │   ├── contact_info_base.yaml
    │   ├── documents_base.yaml
    │   └── address_base.yaml
    │
    ├── contact_info/                    # Contact information tasks
    │   ├── corporate.yaml
    │   ├── individual.yaml
    │   └── trust.yaml
    │
    ├── documents/                       # Document upload tasks
    │   ├── corporate.yaml
    │   ├── individual.yaml
    │   └── trust.yaml
    │
    ├── due_diligence/                   # Due diligence tasks
    │   ├── enhanced.yaml
    │   ├── standard.yaml
    │   └── simplified.yaml
    │
    ├── address/                         # Address collection tasks
    │   ├── business.yaml
    │   └── residential.yaml
    │
    └── review/                          # Review and confirmation tasks
        └── summary.yaml
```

---

## Level 1: Workflow Files

### Purpose
Define workflow structure, step sequence, transitions, and conditional branching.

### Location
`data/workflows/*.yaml`

### Schema

```yaml
id: string                               # Unique workflow identifier
name: string                             # Human-readable name
version: number                          # Workflow version
description: string (optional)           # Workflow description

applies_to:                              # When this workflow applies
  client_type: string                    # "corporate", "individual", "trust"
  jurisdictions: string[]                # ["US", "CA", "GB"]

steps:                                   # Workflow steps
  - id: string                           # Step identifier
    task_ref: string                     # Path to task file (e.g., "contact_info/corporate")
    required_fields: string[]            # Fields that must be collected
    next:                                # Transition rules
      conditions:                        # Conditional branching (optional)
        - when: string                   # Expression (e.g., "risk_score > 70")
          then: string                   # Target step ID
      default: string                    # Default next step or "END"
```

### Example: Corporate Onboarding Workflow

**File**: `data/workflows/corporate_onboarding_v1.yaml`

```yaml
id: wf_corporate_v1
name: Corporate Onboarding v1
version: 1
description: Complete onboarding workflow for corporate entities

applies_to:
  client_type: corporate
  jurisdictions: ["US", "CA", "GB"]

steps:
  # Step 1: Collect corporate contact information
  - id: collectContactInfo
    task_ref: contact_info/corporate     # Reference to task definition
    required_fields:
      - legal_name
      - entity_type
      - jurisdiction
      - business_email
      - business_phone
    next:
      default: collectDocuments

  # Step 2: Collect business documents
  - id: collectDocuments
    task_ref: documents/corporate        # Reference to task definition
    required_fields:
      - business_registration
      - tax_id
      - proof_of_address
    next:
      conditions:
        - when: "risk_score > 70"
          then: enhancedDueDiligence
      default: review

  # Step 3: Enhanced Due Diligence (conditional)
  - id: enhancedDueDiligence
    task_ref: due_diligence/enhanced     # Reference to task definition
    required_fields:
      - source_of_funds
      - business_purpose
      - expected_transaction_volume
    next:
      default: review

  # Step 4: Review and submit
  - id: review
    task_ref: review/summary             # Reference to task definition
    required_fields: []
    next:
      default: END
```

### Key Characteristics
- ✅ Clean, focused on orchestration logic
- ✅ No schema definitions (delegated to task files)
- ✅ Easy to understand workflow flow
- ✅ `task_ref` is relative path from `data/tasks/`
- ✅ `required_fields` must match fields defined in referenced task
- ❌ Cannot define schemas inline (strict ground truth enforcement)
- ❌ Cannot override task schemas

---

## Level 2: Task Files

### Purpose
Define canonical field schemas, validation rules, UI component configuration. These are the **ground truth** for data collection.

### Location
`data/tasks/<category>/<specific_task>.yaml`

### Schema

```yaml
id: string                               # Unique task identifier
name: string                             # Human-readable name
description: string                      # Task description
version: number                          # Task version (managed within file)
extends: string (optional)               # Base task to inherit from (e.g., "_base/contact_info_base")

component_id: string                     # UI component to render ("form", "document-upload", "data-table", "review-summary")

schema:                                  # Ground truth schema definition
  # For component_id: "form"
  fields:                                # Array of field definitions
    - name: string                       # Field identifier
      label: string                      # Display label
      type: FieldType                    # "text", "email", "tel", "number", "date", "textarea", "select", "checkbox", "radio"
      required: boolean (optional)       # Is field required?
      placeholder: string (optional)     # Placeholder text
      helpText: string (optional)        # Additional guidance
      defaultValue: any (optional)       # Default value
      visible: string (optional)         # Conditional visibility expression
      validation:                        # Validation rules
        pattern: string (optional)       # Regex pattern
        minLength: number (optional)
        maxLength: number (optional)
        min: number (optional)           # For number/date
        max: number (optional)
      options:                           # For select/radio/checkbox
        - value: string
          label: string
  layout: string (optional)              # "single-column", "two-column", "grid"
  submitLabel: string (optional)         # Submit button text
  cancelLabel: string (optional)         # Cancel button text

  # For component_id: "document-upload"
  documents:                             # Array of document requirements
    - id: string                         # Document identifier
      label: string                      # Display label
      description: string (optional)     # Document description
      required: boolean                  # Is document required?
      acceptedTypes: string[]            # MIME types
      maxSize: number                    # Max file size in bytes
      helpText: string (optional)        # Additional guidance
      visible: string (optional)         # Conditional visibility
  allowMultiple: boolean (optional)      # Allow multiple file uploads?
  uploadLabel: string (optional)         # Upload button text

expected_output_fields: string[]         # Fields this task outputs (for validation)

tags: string[] (optional)                # Tags for categorization/search
```

### Example: Base Contact Info Task

**File**: `data/tasks/_base/contact_info_base.yaml`

```yaml
id: task_contact_info_base
name: Contact Information (Base)
description: Base task for collecting contact information - defines common fields
version: 1

component_id: form

schema:
  fields:
    # Common field: Email
    - name: email
      label: "Email Address"
      type: email
      required: true
      placeholder: "email@example.com"
      helpText: "Primary email address for communication"
      validation:
        pattern: "^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$"

    # Common field: Phone
    - name: phone
      label: "Phone Number"
      type: tel
      required: true
      placeholder: "+1 (555) 123-4567"
      helpText: "Primary contact phone number"
      validation:
        pattern: "^\\+?[1-9]\\d{1,14}$"

  layout: single-column

expected_output_fields:
  - email
  - phone

tags:
  - contact-info
  - base
```

### Example: Corporate Contact Info Task (Extends Base)

**File**: `data/tasks/contact_info/corporate.yaml`

```yaml
id: task_contact_info_corporate
name: Corporate Contact Information
description: Collect contact information for corporate entities
version: 1

extends: _base/contact_info_base         # Inherit email and phone from base

component_id: form

schema:
  fields:
    # Corporate-specific field: Legal Name
    - name: legal_name
      label: "Legal Business Name"
      type: text
      required: true
      placeholder: "Acme Corporation"
      helpText: "Official registered business name"
      validation:
        minLength: 2
        maxLength: 200
        pattern: "^[a-zA-Z0-9\\s.,'-]+$"

    # Corporate-specific field: Entity Type
    - name: entity_type
      label: "Entity Type"
      type: select
      required: true
      helpText: "Select your business structure"
      options:
        - value: corporation
          label: "Corporation (C-Corp or S-Corp)"
        - value: llc
          label: "Limited Liability Company (LLC)"
        - value: partnership
          label: "Partnership (GP or LP)"
        - value: sole_proprietorship
          label: "Sole Proprietorship"

    # Corporate-specific field: Jurisdiction
    - name: jurisdiction
      label: "Jurisdiction of Incorporation"
      type: select
      required: true
      helpText: "Where is the business legally registered?"
      options:
        - value: US
          label: "United States"
        - value: CA
          label: "Canada"
        - value: GB
          label: "United Kingdom"
        - value: AU
          label: "Australia"

    # Renamed inherited fields (business_email, business_phone)
    - name: business_email
      inherits: email                    # Inherits validation from base email field
      label: "Business Email Address"    # Override label
      placeholder: "contact@acmecorp.com"

    - name: business_phone
      inherits: phone                    # Inherits validation from base phone field
      label: "Business Phone Number"     # Override label

    # Optional field with conditional visibility
    - name: incorporation_date
      label: "Date of Incorporation"
      type: date
      required: false
      helpText: "When was the business officially registered?"
      visible: "entity_type in ['corporation', 'llc']"
      validation:
        max: "today"

  layout: two-column
  submitLabel: "Continue to Documents"
  cancelLabel: "Save Draft"

expected_output_fields:
  - legal_name
  - entity_type
  - jurisdiction
  - business_email
  - business_phone
  - incorporation_date

tags:
  - contact-info
  - corporate
  - kyc
```

### Example: Individual Contact Info Task (Extends Base)

**File**: `data/tasks/contact_info/individual.yaml`

```yaml
id: task_contact_info_individual
name: Individual Contact Information
description: Collect contact information for individual clients
version: 1

extends: _base/contact_info_base         # Inherit email and phone from base

component_id: form

schema:
  fields:
    # Individual-specific field: Full Name
    - name: full_name
      label: "Full Legal Name"
      type: text
      required: true
      placeholder: "John Michael Doe"
      helpText: "Name as it appears on government-issued ID"
      validation:
        minLength: 2
        maxLength: 100

    # Individual-specific field: Date of Birth
    - name: date_of_birth
      label: "Date of Birth"
      type: date
      required: true
      helpText: "Must be 18 years or older"
      validation:
        max: "today-18years"
        min: "today-120years"

    # email and phone inherited from base

    # Individual-specific field: SSN
    - name: ssn
      label: "Social Security Number (Last 4 digits)"
      type: text
      required: true
      placeholder: "1234"
      helpText: "For identity verification purposes only"
      validation:
        pattern: "^\\d{4}$"
        minLength: 4
        maxLength: 4

  layout: single-column
  submitLabel: "Continue"

expected_output_fields:
  - full_name
  - date_of_birth
  - email
  - phone
  - ssn

tags:
  - contact-info
  - individual
  - kyc
```

### Example: Document Upload Task

**File**: `data/tasks/documents/corporate.yaml`

```yaml
id: task_documents_corporate
name: Corporate Document Upload
description: Upload required documents for corporate entity verification
version: 1

component_id: document-upload

schema:
  documents:
    - id: business_registration
      label: "Certificate of Incorporation"
      description: "Official registration document from government authority"
      required: true
      acceptedTypes:
        - application/pdf
      maxSize: 10485760  # 10MB
      helpText: "Must be a clear, legible copy of your incorporation certificate"

    - id: tax_id
      label: "Tax Identification Number (TIN/EIN) Document"
      description: "Official document showing business tax ID"
      required: true
      acceptedTypes:
        - application/pdf
        - image/jpeg
        - image/png
      maxSize: 5242880  # 5MB
      helpText: "IRS Form SS-4 confirmation or equivalent"

    - id: proof_of_address
      label: "Proof of Business Address"
      description: "Utility bill or lease agreement showing business location"
      required: true
      acceptedTypes:
        - application/pdf
        - image/jpeg
        - image/png
      maxSize: 5242880  # 5MB
      helpText: "Must be dated within the last 3 months"

    - id: beneficial_ownership
      label: "Beneficial Ownership Declaration"
      description: "List of individuals owning 25% or more of the company"
      required: false
      acceptedTypes:
        - application/pdf
      maxSize: 5242880  # 5MB
      helpText: "Required for corporations with beneficial owners owning ≥25%"
      visible: "entity_type == 'corporation'"

  allowMultiple: true
  uploadLabel: "Upload Corporate Documents"

expected_output_fields:
  - business_registration
  - tax_id
  - proof_of_address
  - beneficial_ownership

tags:
  - documents
  - corporate
  - compliance
  - kyc
```

---

## Task Inheritance

### Purpose
Enable reuse and composition of common field definitions across tasks using the DRY principle at the YAML level.

### Inheritance Rules

1. **Field Merging**: Child task fields are merged with parent task fields
2. **Field Override**: Child can override parent field by redefining with same `name`
3. **Field Inheritance**: Child can inherit specific parent field using `inherits` property and override specific properties
4. **Nested Inheritance**: Tasks can inherit from tasks that inherit from others (chain resolution)
5. **Circular Detection**: Loader must detect and reject circular inheritance

### Inheritance Syntax

#### Option A: Full Inheritance (Merge All Fields)
```yaml
extends: _base/contact_info_base
```
→ Inherits ALL fields from base task

#### Option B: Selective Inheritance with Override
```yaml
extends: _base/contact_info_base
schema:
  fields:
    # Add new field
    - name: legal_name
      label: "Legal Business Name"
      type: text
      required: true

    # Override inherited field
    - name: email
      label: "Business Email"          # Override label
      placeholder: "contact@corp.com"  # Override placeholder
      # Validation inherited from base

    # Inherit with rename
    - name: business_email
      inherits: email                  # Copy definition from base email field
      label: "Business Email Address"  # But rename
```

### Resolution Algorithm

```typescript
function resolveTaskInheritance(taskDef: TaskDefinition): TaskDefinition {
  // Base case: no inheritance
  if (!taskDef.extends) {
    return taskDef;
  }

  // Load parent task
  const parentPath = taskDef.extends;
  const parentDef = loadTask(parentPath);

  // Detect circular inheritance
  if (hasCircularInheritance(taskDef, parentDef)) {
    throw new Error(`Circular inheritance detected: ${taskDef.id} → ${parentPath}`);
  }

  // Recursively resolve parent
  const resolvedParent = resolveTaskInheritance(parentDef);

  // Merge schemas
  const mergedSchema = mergeSchemas(resolvedParent.schema, taskDef.schema);

  return {
    ...taskDef,
    schema: mergedSchema,
    expected_output_fields: [
      ...resolvedParent.expected_output_fields,
      ...taskDef.expected_output_fields
    ]
  };
}

function mergeSchemas(parentSchema: FormSchema, childSchema: FormSchema): FormSchema {
  const parentFieldsMap = new Map(
    parentSchema.fields.map(f => [f.name, f])
  );

  const childFields = childSchema.fields || [];
  const mergedFields: FieldSchema[] = [];

  // First, add all parent fields
  for (const parentField of parentSchema.fields) {
    const childOverride = childFields.find(cf => cf.name === parentField.name);

    if (childOverride) {
      // Child overrides parent field
      mergedFields.push({
        ...parentField,
        ...childOverride
      });
    } else {
      // Keep parent field as-is
      mergedFields.push(parentField);
    }
  }

  // Then, add child-only fields (not in parent)
  for (const childField of childFields) {
    if (!parentFieldsMap.has(childField.name)) {
      // Handle inherits property
      if (childField.inherits) {
        const inheritedField = parentFieldsMap.get(childField.inherits);
        if (!inheritedField) {
          throw new Error(`Field "${childField.name}" tries to inherit non-existent field "${childField.inherits}"`);
        }
        mergedFields.push({
          ...inheritedField,
          ...childField,
          name: childField.name  // Use new name
        });
      } else {
        mergedFields.push(childField);
      }
    }
  }

  return {
    ...parentSchema,
    ...childSchema,
    fields: mergedFields
  };
}
```

---

## Workflow Compilation Process

### Two-Stage Loading

```typescript
// Stage 1: Load workflow definition
const workflowDef = await loadYAML<WorkflowDefinition>(
  'data/workflows/corporate_onboarding_v1.yaml'
);

// Stage 2: Resolve all task references
const compiledSteps = await Promise.all(
  workflowDef.steps.map(async (stepRef) => {
    // Load task definition
    const taskDef = await loadTask(stepRef.task_ref);

    // Resolve inheritance
    const resolvedTask = resolveTaskInheritance(taskDef);

    // Validate required fields
    validateRequiredFields(stepRef, resolvedTask);

    // Return compiled step
    return {
      id: stepRef.id,
      task_ref: stepRef.task_ref,
      task_definition: resolvedTask,
      component_id: resolvedTask.component_id,
      schema: resolvedTask.schema,
      required_fields: stepRef.required_fields,
      next: stepRef.next
    };
  })
);

// Return compiled workflow
return {
  workflowId: workflowDef.id,
  version: workflowDef.version,
  initialStepId: compiledSteps[0].id,
  steps: compiledSteps,
  stepIndexById: buildStepIndex(compiledSteps)
};
```

---

## Validation Rules

### Workflow-Level Validation

1. **Unique step IDs**: All step IDs must be unique within workflow
2. **Valid task references**: All `task_ref` must point to existing task files
3. **Required fields exist**: All fields in `required_fields` must exist in referenced task's `expected_output_fields`
4. **Valid transitions**: All `next.default` and `next.conditions[].then` must reference valid step IDs or "END"
5. **No orphaned steps**: All steps must be reachable from initial step

### Task-Level Validation

1. **Unique field names**: All field names must be unique within task schema
2. **Valid field types**: Field type must be one of: text, email, tel, number, date, textarea, select, checkbox, radio
3. **Valid extends**: If `extends` is specified, referenced base task must exist
4. **No circular inheritance**: Inheritance chain must not contain cycles
5. **Valid inherits**: If field uses `inherits`, referenced field must exist in parent
6. **Required options**: Select/radio fields must have `options` array
7. **Valid validation**: Validation rules must be appropriate for field type

### Cross-Level Validation

1. **Required fields match**: Workflow `required_fields` must be subset of task `expected_output_fields`
2. **Consistent versions**: Workflow should reference compatible task versions
3. **Component ID valid**: Task `component_id` must exist in component registry

---

## Benefits of Two-Level Architecture

### 1. Separation of Concerns
- **Workflows**: Focus on business process flow (WHEN, WHERE)
- **Tasks**: Focus on data collection (WHAT, HOW)
- Clear responsibility boundaries

### 2. Reusability
- Task definitions shared across multiple workflows
- Example: `contact_info/corporate` used in both onboarding and account update
- DRY principle at YAML level

### 3. Single Source of Truth
- Task files are canonical definitions for field schemas
- No duplication of validation rules across workflows
- Easier to audit and ensure consistency

### 4. Maintainability
- Update field definition in ONE place (task file)
- All workflows using that task automatically get update
- Versioning within files (no file proliferation)

### 5. Inheritance & Composition
- Base tasks define common fields
- Specific tasks extend and customize
- Powerful composition without code

### 6. Testability
- Test task definitions independently
- Test workflow orchestration separately
- Clear test boundaries

### 7. Discoverability
- Task library is browsable (`data/tasks/`)
- Organized by category
- Can build task catalog/documentation automatically

### 8. Flexibility
- Workflows remain clean and readable
- Can version tasks independently
- Easy to create workflow variations

---

## Migration Guide

### From Single-Level to Two-Level

**Step 1**: Identify common schemas across workflows

**Step 2**: Extract schemas into task files
- Create base tasks for common fields
- Create specific tasks that extend base

**Step 3**: Update workflow files
- Remove inline schemas
- Add `task_ref` pointing to task files
- Keep only `required_fields` list

**Step 4**: Update loader
- Implement two-stage loading
- Add inheritance resolution
- Add validation

**Step 5**: Test
- Verify all workflows compile correctly
- Verify field schemas resolve properly
- Test inheritance chains

---

## API Impact

### GET /api/workflows

**Before** (single-level):
```json
{
  "workflowId": "wf_corporate_v1",
  "steps": [{
    "id": "step1",
    "component_id": "form",
    "schema": { "fields": [...] },  // Embedded
    "required_fields": [...]
  }]
}
```

**After** (two-level, pre-compiled):
```json
{
  "workflowId": "wf_corporate_v1",
  "steps": [{
    "id": "step1",
    "task_ref": "contact_info/corporate",
    "component_id": "form",
    "schema": { "fields": [...] },  // Resolved from task
    "required_fields": [...]
  }]
}
```

**Key Point**: API response remains the same! Task resolution happens server-side during compilation. Client receives fully resolved workflow.

---

## File Organization Best Practices

### Task File Naming
- Use lowercase with underscores: `contact_info.yaml`
- Be specific: `corporate.yaml` not `corp.yaml`
- Version in metadata, not filename

### Base Task Naming
- Prefix with `_base/` directory
- Suffix with `_base`: `contact_info_base.yaml`
- Keep base tasks minimal (common fields only)

### Directory Structure
- Group by task category, not entity type
- Category examples: `contact_info/`, `documents/`, `due_diligence/`, `address/`, `review/`
- Avoid deep nesting (max 2 levels: `tasks/category/specific.yaml`)

### Task ID Convention
```
task_{category}_{specific}_{optional_variant}

Examples:
- task_contact_info_base
- task_contact_info_corporate
- task_contact_info_individual
- task_documents_corporate
- task_due_diligence_enhanced
```

---

## Future Enhancements

### Potential Additions (Not in POC)

1. **Task Versioning**: Support multiple versions of same task (task_contact_info_corporate_v1.yaml, v2.yaml)
2. **Conditional Fields at Task Level**: More complex visibility rules
3. **Field Dependencies**: Express inter-field dependencies
4. **Computed Fields**: Define fields calculated from other fields
5. **Task Composition**: Combine multiple tasks into one step
6. **Dynamic Task Selection**: Choose task based on runtime data
7. **Task Templates**: Parameterized tasks
8. **Task Validation Libraries**: Shared validation rule libraries

---

**Created**: 2025-10-21
**Status**: Specification Complete
**Next**: Update planning documents and create example files
