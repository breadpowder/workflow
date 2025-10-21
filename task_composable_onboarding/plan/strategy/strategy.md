# Composable Onboarding – Strategy (POC)

## Context
- Focus areas: YAML definitions, workflow interpreter, CopilotKit UI/runtime, action/UI decoupling, schema-driven components.
- Non-functional requirements are deferred to keep momentum on functional delivery.

## Core Architectural Principles

### 1. YAML-Driven Workflows
Business logic defined in YAML files that can be edited without code deployment.

### 2. Component Registry Pattern
Decouple actions from UI via lookup table (component_id → React component).

### 3. Schema-Driven Components ⭐
**Key Innovation**: Components accept dynamic schemas instead of hardcoding fields.
- **Rule**: If components serve similar functionality but differ in attributes/fields, use ONE schema-driven component
- **Example**: Instead of `individual-contact-form`, `corporate-contact-form`, `trust-contact-form` → Use ONE `form` component with different schemas
- **Benefits**: 70% code reduction, business user control, rapid iteration

### 4. Two-Level YAML Architecture ⭐ NEW
**Key Innovation**: Separate workflow orchestration from field schema definitions (ground truth).
- **Workflow files** (Level 1): Define WHAT to do, WHEN to do it, WHERE to go next
- **Task files** (Level 2): Define HOW to collect data, WHICH fields, validation rules
- **Benefits**: Single source of truth, task reusability across workflows, maintainability

## Chosen Approach – Modular YAML + Self-Hosted CopilotKit
**Overview**
- Keep definitions file-based for ease of authoring while introducing a minimal interpreter.
- Self-host the CopilotKit runtime in a Next.js API route; UI uses `runtimeUrl`.
- Use schema-driven generic components for maximum reusability and YAML control.
- Use two-level YAML architecture (workflow + task files) for ground truth management.

**Data Model & Storage** - Two-Level Architecture
- Directory structure:
  ```
  data/
    workflows/                           # Level 1: Workflow orchestration
      corporate_onboarding_v1.yaml
      individual_onboarding_v1.yaml
      trust_onboarding_v1.yaml
    tasks/                               # Level 2: Ground truth schemas
      _base/                             # Base task definitions (for inheritance)
        contact_info_base.yaml
        documents_base.yaml
      contact_info/
        corporate.yaml
        individual.yaml
        trust.yaml
      documents/
        corporate.yaml
        individual.yaml
      due_diligence/
        enhanced.yaml
        standard.yaml
      review/
        summary.yaml
  ```
- **Two-Level YAML Architecture**: Workflows reference tasks, tasks contain schemas

**Key Separation**:
- ✅ Workflows: Orchestration only (task references, transitions, conditions)
- ✅ Tasks: Ground truth schemas (fields, validation, component config)
- ❌ Workflows do NOT contain schemas or required_fields
- ❌ Tasks cannot be overridden by workflows (strict ground truth)

**Level 1 - Workflow File** (`data/workflows/corporate_onboarding_v1.yaml`):
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
      task_ref: contact_info/corporate      # Reference to task file
      next:
        default: collectDocuments

    # Step 2: Collect business documents
    - id: collectDocuments
      task_ref: documents/corporate         # Reference to task file
      next:
        conditions:
          - when: "risk_score > 70"
            then: enhancedDueDiligence
        default: review

    # Step 3: Enhanced Due Diligence (conditional)
    - id: enhancedDueDiligence
      task_ref: due_diligence/enhanced      # Reference to task file
      next:
        default: review

    # Step 4: Review and submit
    - id: review
      task_ref: review/summary              # Reference to task file
      next:
        default: END
  ```

**Level 2 - Task Files** (Ground Truth Schemas):

**Base Task** (`data/tasks/_base/contact_info_base.yaml`):
  ```yaml
  id: task_contact_info_base
  name: Contact Information (Base)
  description: Base task with common contact fields
  version: 1

  component_id: form

  required_fields:
    - email
    - phone

  schema:
    fields:
      - name: email
        label: "Email Address"
        type: email
        required: true
        validation:
          pattern: "^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$"

      - name: phone
        label: "Phone Number"
        type: tel
        required: true
        validation:
          pattern: "^\\+?[1-9]\\d{1,14}$"

  expected_output_fields:
    - email
    - phone
  ```

**Corporate Contact Task** (`data/tasks/contact_info/corporate.yaml`):
  ```yaml
  id: task_contact_info_corporate
  name: Corporate Contact Information
  version: 1

  extends: _base/contact_info_base          # Inherits email/phone

  component_id: form

  required_fields:
    - legal_name
    - entity_type
    - jurisdiction
    - business_email
    - business_phone

  schema:
    fields:
      - name: legal_name
        label: "Legal Business Name"
        type: text
        required: true
        validation:
          minLength: 2
          maxLength: 200

      - name: entity_type
        label: "Entity Type"
        type: select
        required: true
        options:
          - { value: corporation, label: "Corporation" }
          - { value: llc, label: "LLC" }
          - { value: partnership, label: "Partnership" }

      - name: jurisdiction
        label: "Jurisdiction of Incorporation"
        type: select
        required: true
        options:
          - { value: US, label: "United States" }
          - { value: CA, label: "Canada" }
          - { value: GB, label: "United Kingdom" }

      # Renamed inherited fields
      - name: business_email
        inherits: email                     # Inherits validation from base
        label: "Business Email Address"

      - name: business_phone
        inherits: phone
        label: "Business Phone Number"

    layout: two-column
    submitLabel: "Continue to Documents"

  expected_output_fields:
    - legal_name
    - entity_type
    - jurisdiction
    - business_email
    - business_phone
  ```

**Corporate Documents Task** (`data/tasks/documents/corporate.yaml`):
  ```yaml
  id: task_documents_corporate
  name: Corporate Document Upload
  version: 1

  component_id: document-upload

  required_fields:
    - business_registration
    - tax_id
    - proof_of_address

  schema:
    documents:
      - id: business_registration
        label: "Certificate of Incorporation"
        required: true
        acceptedTypes: ["application/pdf"]
        maxSize: 10485760
        helpText: "Official registration from government authority"

      - id: tax_id
        label: "Tax ID Document"
        required: true
        acceptedTypes: ["application/pdf"]
        maxSize: 10485760

      - id: proof_of_address
        label: "Proof of Business Address"
        required: true
        acceptedTypes: ["application/pdf", "image/*"]
        maxSize: 5242880
        helpText: "Must be dated within last 3 months"

    allowMultiple: true
    uploadLabel: "Upload Corporate Documents"

  expected_output_fields:
    - business_registration
    - tax_id
    - proof_of_address
  ```

**Composable Onboarding Interpreter (TS)**
- **Two-Stage Loading**:
  1. Load workflow definition from `data/workflows/*.yaml`
  2. Resolve all task references from `data/tasks/**/*.yaml`
  3. Resolve task inheritance (if task `extends` base task)
  4. Compile into runtime machine with resolved schemas
- **Runtime Engine**:
  - Compile step ID → index, pick initial step
  - Evaluate `next` via simple expressions (`==, !=, >, >=, <, <=`)
  - Helper functions: `missingRequiredFields`, `nextStepId`
  - Task's `required_fields` are ground truth for validation

**UI & Runtime (CopilotKit)**
- Next.js UI wraps with `CopilotKit runtimeUrl="/api/copilotkit"`.
- Runtime endpoint implemented with `@copilotkit/runtime` and `OpenAIAdapter`.
- Decoupling via component registry: actions pass a `componentId`; registry resolves to components.
- **Schema-driven components**: Generic components accept schemas from YAML for maximum reusability.

**Component Registry Strategy**
```typescript
// LEAN registry - only generic components
const UI_COMPONENT_REGISTRY = {
  'form': GenericFormWrapper,              // Handles ALL forms via schema
  'document-upload': GenericDocumentUploadWrapper,  // Handles ALL uploads via schema
  'data-table': GenericDataTableWrapper,   // Handles ALL tables via schema
  'review-summary': ReviewSummaryWrapper,  // Shows collected data
};
```

**Schema-Driven Components**
- **GenericForm**: Renders any form based on FieldSchema[]
  - Supports: text, email, tel, number, date, textarea, select, checkbox, radio
  - Features: validation, conditional visibility, multiple layouts
  - Use cases: Contact forms, questionnaires, EDD forms, settings
- **GenericDocumentUpload**: Accepts DocumentSchema defining required docs
  - Configurable: file types, size limits, help text
  - Use cases: Individual IDs, corporate docs, compliance uploads
- **GenericDataTable**: Accepts TableSchema for columns/actions
  - Features: sorting, filtering, pagination
  - Use cases: Beneficial owners, transaction lists

## Minimal Endpoints
- `GET /api/workflows?client_type=...&jurisdiction=...` → compiled machine JSON with resolved schemas
  - Workflow file loaded from disk
  - All task references resolved
  - Task inheritance computed
  - Schemas merged into steps
  - Returns: fully compiled workflow ready for execution

## POC Task Breakdown
1. Set up self-hosted CopilotKit runtime (~2 hours)
2. **Implement two-stage YAML workflow loader** (~2 hours):
   - Load workflow files
   - Load and resolve task files
   - Resolve task inheritance
   - Validate references and schemas
3. Build component registry with generic renderUI action (~2 hours)
4. Create workflow engine (transitions, validation, state management) (~4 hours)
5. **Build schema-driven UI components** (~6 hours):
   - Define FieldSchema, DocumentSchema, TableSchema types
   - Implement GenericForm with validation and conditional fields
   - Implement GenericDocumentUpload
   - Create three-pane layout (mockup-based)
   - Build chat components
6. Integration: Wire UI to workflow state (~1 hour)
7. Documentation and testing (~1 hour)

**Total Estimated Time**: ~18 hours

## Key Benefits of This Strategy

### Code Reduction
- **Before**: 10 entity types × 5 forms = 50 components = 5,000 lines
- **After**: 3-5 generic components = 1,500 lines
- **Reduction**: 70%

### Business User Empowerment
- Add new entity types by editing YAML (5 minutes)
- Modify field labels, validation, layouts without code
- Create workflow variations through YAML composition

### Developer Productivity
- Build component once, reuse unlimited times
- Fix bugs in one place, works everywhere
- Clear separation: business logic (YAML) vs. presentation (components)

## Deferred Options
- Database-backed workflow storage (currently file-based YAML)
- Advanced rule evaluation and complex expressions
- Rules engine and vector search
- Governance workflows (approval chains)
- Multi-language support
