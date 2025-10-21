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
- **Two-Level YAML Examples**:

**Level 1 - Workflow File** (`data/workflows/corporate_onboarding_v1.yaml`):
  ```yaml
  id: wf_corporate_v1
  name: Corporate Onboarding v1
  version: 1
  applies_to:
    client_type: corporate
    jurisdictions: ["US", "CA"]
  steps:
    - id: getContactInfo
      task_ref: collect_contact_info
      component_id: form                    # Generic form component
      schema:                                # Schema defines fields dynamically
        fields:
          - name: legal_name
            label: "Legal Business Name"
            type: text
            required: true
          - name: entity_type
            label: "Entity Type"
            type: select
            required: true
            options:
              - { value: corporation, label: "Corporation" }
              - { value: llc, label: "LLC" }
              - { value: partnership, label: "Partnership" }
          - name: jurisdiction
            label: "Jurisdiction"
            type: select
            required: true
            options:
              - { value: US, label: "United States" }
              - { value: CA, label: "Canada" }
          - name: contact_email
            label: "Business Email"
            type: email
            required: true
          - name: contact_phone
            label: "Business Phone"
            type: tel
            required: true
        layout: two-column
      required_fields: ["legal_name", "entity_type", "contact_email", "contact_phone"]
      next:
        default: collectDocuments

    - id: collectDocuments
      task_ref: collect_business_documents
      component_id: document-upload         # Generic document upload component
      schema:                                # Schema defines required documents
        documents:
          - id: business_registration
            label: "Certificate of Incorporation"
            required: true
            acceptedTypes: ["application/pdf"]
            maxSize: 10485760
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
      required_fields: ["business_registration", "tax_id", "proof_of_address"]
      next:
        conditions:
          - when: "risk_score > 70"
            then: enhancedDueDiligence
        default: review

    - id: enhancedDueDiligence
      task_ref: perform_edd
      component_id: form                    # SAME form component, different schema
      schema:
        fields:
          - name: source_of_funds
            label: "Source of Funds"
            type: textarea
            required: true
            helpText: "Describe the source of funds for this business"
          - name: business_purpose
            label: "Business Purpose"
            type: textarea
            required: true
          - name: expected_transaction_volume
            label: "Expected Monthly Transaction Volume"
            type: select
            required: true
            options:
              - { value: low, label: "< $10,000" }
              - { value: medium, label: "$10,000 - $100,000" }
              - { value: high, label: "> $100,000" }
      required_fields: ["source_of_funds", "business_purpose", "expected_transaction_volume"]
      next:
        default: review

    - id: review
      task_ref: review_and_submit
      component_id: review-summary          # Review component shows all collected data
      required_fields: []
      next:
        default: END
  ```

**Composable Onboarding Interpreter (TS)**
- Compile step ID → index, pick initial step, evaluate `next` via simple expressions (`==, !=, >, >=, <, <=`).
- Helper functions: `missingRequiredFields`, `nextStepId`.

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
- `GET /api/workflows?client_type=...&jurisdiction=...` → compiled machine JSON with schemas

## POC Task Breakdown
1. Set up self-hosted CopilotKit runtime (~2 hours)
2. Implement YAML workflow loader (~2 hours)
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
