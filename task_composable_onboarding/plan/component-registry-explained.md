# Component Registry + Schema-Driven Components - Detailed Explanation

## Overview
This document explains the **two-part architectural pattern** used in the Composable Onboarding workflow system:

1. **Component Registry Pattern**: Decouples actions from UI via lookup table
2. **Schema-Driven Components**: Uses generic components that accept schemas instead of hardcoding fields

**Key Insight**: The registry pattern is powerful, but becomes truly transformative when combined with schema-driven components. This enables:
- YAML controls **which** component renders (via `component_id`)
- YAML controls **how** that component renders (via `schema`)
- 70% code reduction through component reusability
- Business users can edit workflows without developer involvement

---

## Part 1: The Problem - Two Types of Tight Coupling

### Problem 1A: Actions Hardcoded to Specific UI Components

### Traditional Approach (Tightly Coupled)

In a typical CopilotKit application, you might write actions like this:

```typescript
// ❌ PROBLEM: Each action is hardcoded to a specific UI component
useCopilotAction({
  name: "collectContactInfo",
  description: "Collect customer contact information",
  parameters: [
    { name: "name", type: "string", required: true },
    { name: "email", type: "string", required: true },
    { name: "phone", type: "string", required: true }
  ],
  renderAndWaitForResponse: ({ args, status, respond }) => {
    // Directly renders ContactForm - can't swap it out
    return (
      <ContactForm
        initialName={args.name}
        initialEmail={args.email}
        initialPhone={args.phone}
        status={status}
        onSubmit={(data) => {
          respond?.(JSON.stringify(data));
        }}
      />
    );
  }
});

useCopilotAction({
  name: "collectDocuments",
  description: "Collect business documents",
  parameters: [
    { name: "documentTypes", type: "array", required: true }
  ],
  renderAndWaitForResponse: ({ args, status, respond }) => {
    // Another hardcoded component
    return (
      <DocumentUpload
        requiredDocs={args.documentTypes}
        status={status}
        onUpload={(files) => {
          respond?.(JSON.stringify(files));
        }}
      />
    );
  }
});

// ... and so on for every workflow step
```

### Why This Is Problematic

#### Problem 1: Action Proliferation
Every workflow step needs its own dedicated action, even if the logic is similar:
- `collectContactInfo` → renders `ContactForm`
- `collectDocuments` → renders `DocumentUpload`
- `collectBeneficialOwners` → renders `BeneficialOwnerForm`
- `performEDD` → renders `EDDQuestionnaire`
- `reviewAndSubmit` → renders `ReviewSummary`

**Result**: 10 workflow steps = 10 different actions with nearly identical boilerplate code.

#### Problem 2: Cannot Be Driven by YAML
Business users want to edit workflows without changing code. But with tight coupling:

```yaml
# This YAML is useless because the UI is hardcoded in the action
steps:
  - id: step1
    task_ref: collect_contact_info
    # ❌ Can't specify WHICH component to use - it's baked into the action
    next:
      default: step2
```

To change the UI, a developer must:
1. Edit the action code
2. Import a different component
3. Redeploy the application

**Business users can't make these changes themselves.**

#### Problem 3: No Flexibility or Reusability
What if you want to:
- Show the contact form with a different layout for mobile?
- Use a wizard-style multi-step form instead of a single-page form?
- A/B test different form designs?
- Reuse the same action with different UI variations?

**You can't.** The UI is hardcoded into the action logic.

#### Problem 4: Violates Separation of Concerns
Actions should handle **business logic**:
- When to trigger
- What data to collect
- How to validate
- Where to transition next

UI components should handle **presentation**:
- How to display the form
- Layout and styling
- User interactions
- Accessibility

Mixing these concerns makes code hard to maintain, test, and evolve.

---

### Problem 1B: Components with Hardcoded Fields

Even if we solved Problem 1A with a registry, we'd still have a problem if each component hardcodes its fields:

```typescript
// ❌ PROBLEM: Each entity type needs its own form component
function IndividualContactForm({ onSubmit }: Props) {
  return (
    <form>
      <input name="full_name" label="Full Name" />
      <input name="email" label="Email" />
      <input name="phone" label="Phone" />
      <button>Submit</button>
    </form>
  );
}

function CorporateContactForm({ onSubmit }: Props) {
  return (
    <form>
      <input name="legal_name" label="Legal Business Name" />
      <select name="entity_type" label="Entity Type" />
      <input name="business_email" label="Business Email" />
      <input name="business_phone" label="Business Phone" />
      <select name="jurisdiction" label="Jurisdiction" />
      <button>Submit</button>
    </form>
  );
}

function TrustContactForm({ onSubmit }: Props) {
  return (
    <form>
      <input name="trust_name" label="Trust Name" />
      <input name="trustee_email" label="Trustee Email" />
      <input name="formation_date" label="Formation Date" />
      <button>Submit</button>
    </form>
  );
}
```

**Registry with hardcoded components**:
```typescript
const UI_COMPONENT_REGISTRY = {
  'individual-contact-form': IndividualContactFormWrapper,
  'corporate-contact-form': CorporateContactFormWrapper,
  'trust-contact-form': TrustContactFormWrapper,
  // ... 10 entity types × 5 forms = 50 components!
};
```

**Problems**:
- **Code duplication**: All three forms do the same thing (collect contact info) but with different fields
- **Maintenance nightmare**: Bug fix in validation logic needs to be applied to 50 components
- **Registry bloat**: Registry grows linearly with variations (10 entity types × 5 forms = 50 entries)
- **YAML still can't adapt**: Business users can select component_id but can't modify which fields appear

**Example**: Want to add "Industry" field to corporate form?
1. Edit `CorporateContactForm.tsx`
2. Add new input field
3. Update validation
4. Redeploy
**Time: 2-4 hours**

---

## Part 2: The Two-Part Solution

### Solution Part A: Component Registry Pattern

Instead of hardcoding which component each action renders, we introduce a **registry** - a lookup table that maps string IDs to React components.

### Solution Part B: Schema-Driven Components

Instead of creating multiple similar components with hardcoded fields, we create **ONE generic component** that accepts a schema defining fields dynamically.

**Combined Power**: Registry + Schemas = YAML controls BOTH which component renders AND how it's configured

### The Final Registry (Lean & Generic)

```typescript
// ✅ SOLUTION: Only GENERIC components in registry
const UI_COMPONENT_REGISTRY = {
  'form': GenericFormWrapper,              // Handles ALL forms via FieldSchema[]
  'document-upload': GenericDocumentUploadWrapper,  // Handles ALL uploads via DocumentSchema
  'data-table': GenericDataTableWrapper,   // Handles ALL tables via TableSchema
  'review-summary': ReviewSummaryWrapper,  // Shows all collected data
};
```

**Registry size**: 3-5 components (not 50!)

### Core Idea: Indirection via Registry

Instead of hardcoding which component each action renders, we introduce a **registry** - a lookup table that maps string IDs to React components:

```
"form"              →  GenericForm component (works with ANY field schema)
"document-upload"   →  GenericDocumentUpload component (works with ANY document schema)
"data-table"        →  GenericDataTable component (works with ANY table schema)
"review-summary"    →  ReviewSummary component
```

### Key Insight: YAML Controls BOTH Which Component and How It's Configured

With a registry + schemas, the YAML workflow specifies:
1. **Which** component to render (via `component_id`)
2. **How** to configure that component (via `schema`)

```yaml
steps:
  # Individual contact info
  - id: collectIndividualContact
    task_ref: collect_contact_info
    component_id: form                    # ← Generic form component
    schema:                                # ← Schema controls fields!
      fields:
        - { name: full_name, label: "Full Name", type: text, required: true }
        - { name: email, label: "Email", type: email, required: true }
        - { name: phone, label: "Phone", type: tel, required: true }
      layout: single-column
    required_fields: [full_name, email, phone]
    next:
      default: collectDocuments

  # Corporate contact info (SAME component, different schema!)
  - id: collectCorporateContact
    task_ref: collect_contact_info
    component_id: form                    # ← SAME component!
    schema:                                # ← Different schema!
      fields:
        - { name: legal_name, label: "Legal Business Name", type: text, required: true }
        - { name: entity_type, label: "Entity Type", type: select, required: true, options: [...] }
        - { name: jurisdiction, label: "Jurisdiction", type: select, required: true, options: [...] }
        - { name: business_email, label: "Business Email", type: email, required: true }
      layout: two-column
    required_fields: [legal_name, entity_type, business_email]
    next:
      default: collectDocuments

  - id: collectDocuments
    task_ref: collect_business_documents
    component_id: document-upload         # ← Generic document upload
    schema:                                # ← Schema defines required docs
      documents:
        - { id: business_registration, label: "Certificate of Incorporation", required: true }
        - { id: tax_id, label: "Tax ID Document", required: true }
    required_fields: [business_registration, tax_id]
    next:
      default: review
```

Now business users can:
- Change which form appears at each step (select different `component_id`)
- Modify field labels, validation, layouts (edit `schema`)
- Add/remove fields without code changes (edit `schema.fields`)
- Create new entity types by copying and modifying schemas (5 minutes, not hours)
- A/B test different form designs by swapping schemas

### The Three-Layer Architecture (with Schemas)

```
┌─────────────────────────────────────────────────────────────┐
│ Layer 1: YAML Workflow Definition                          │
│ ----------------------------------------------------------- │
│ steps:                                                      │
│   - id: step1                                               │
│     component_id: "form"           ← Which component        │
│     schema:                        ← How to configure it    │
│       fields:                                               │
│         - { name: legal_name, label: "Business Name", ... } │
│         - { name: email, label: "Email", ... }             │
│     required_fields: [legal_name, email]                    │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ Layer 2: Component Registry (Lean Lookup Table)            │
│ ----------------------------------------------------------- │
│ {                                                           │
│   "form": GenericFormWrapper,              // ALL forms    │
│   "document-upload": GenericDocumentUploadWrapper, // ALL uploads │
│   "data-table": GenericDataTableWrapper,   // ALL tables   │
│   "review-summary": ReviewSummaryWrapper                    │
│ }                                                           │
│                                                             │
│ Registry size: 3-5 components (not 50!)                     │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ Layer 3: Generic UI Components (Schema-Driven)             │
│ ----------------------------------------------------------- │
│ GenericForm: Renders ANY form based on FieldSchema[]       │
│ GenericDocumentUpload: Handles ANY upload via DocumentSchema │
│ GenericDataTable: Displays ANY table via TableSchema       │
│                                                             │
│ Each component accepts schema prop and renders dynamically  │
└─────────────────────────────────────────────────────────────┘
```

**Key Difference from Traditional Registry**:
- Traditional: 50+ specific components (individual-contact-form, corporate-contact-form, trust-contact-form, etc.)
- Schema-driven: 3-5 generic components that accept schemas from YAML

### Single Generic Action

Instead of many specific actions, we have **ONE** generic action that uses the registry:

```typescript
// ✅ SOLUTION: One action, multiple components
useCopilotAction({
  name: "renderUI",
  description: "Render a UI component from the registry to collect or display information",
  parameters: [
    {
      name: "componentId",
      type: "string",
      description: "The ID of the component to render from the registry",
      enum: Object.keys(UI_COMPONENT_REGISTRY), // List all available components
      required: false  // Falls back to currentStep.component_id if not provided
    },
    {
      name: "data",
      type: "object",
      description: "Initial data to populate the component with",
      required: false
    }
  ],
  renderAndWaitForResponse: ({ args, status, respond }) => {
    // Determine which component to render
    const componentId = args.componentId || currentStep?.component_id;

    // Look up the component in the registry
    const Component = getComponent(componentId);

    if (!Component) {
      // Handle unknown component gracefully
      return <ErrorComponent message={`Unknown component: ${componentId}`} />;
    }

    // Render the component with standard interface
    return (
      <Component
        data={args.data || currentStepData}
        status={status}
        onComplete={(result) => {
          // Update workflow state
          updateInputs(result.data);

          // Progress to next step
          const progression = progressToNextStep();

          // Respond to AI
          respond?.(JSON.stringify({
            success: true,
            data: result.data,
            nextStep: progression.nextStepId
          }));
        }}
      />
    );
  }
});
```

---

## Part 3: How It Works - Step by Step

### Step 1: Define the Registry Interface

All components in the registry must implement a standard interface:

```typescript
// src/lib/ui/component-registry.ts

import { RenderFunctionStatus } from '@copilotkit/react-core';

/**
 * Standard interface that all registry components must implement.
 *
 * This ensures the generic renderUI action can work with any component
 * without knowing its specific implementation details.
 */
export interface RegistryComponentProps {
  /**
   * Initial data to populate the component with.
   * Can come from:
   * - Action parameters (AI-provided)
   * - Workflow state (previously collected inputs)
   * - Default values from YAML
   */
  data: any;

  /**
   * CopilotKit execution status.
   * Used to show loading states, disable inputs during execution, etc.
   */
  status: RenderFunctionStatus;

  /**
   * Callback to invoke when the user completes this step.
   * The result should include:
   * - action: What the user did ("submit", "cancel", "skip", etc.)
   * - data: The collected data (form values, uploaded files, etc.)
   */
  onComplete: (result: { action: string; data: any }) => void;
}
```

**Why this interface?**
- **`data`**: Allows pre-populating forms with existing data (e.g., editing vs. creating)
- **`status`**: Enables responsive UI (show spinners, disable buttons during execution)
- **`onComplete`**: Standardized callback ensures all components communicate results the same way

### Step 2: Create the Registry

```typescript
// src/lib/ui/component-registry.ts (continued)

import { ContactFormWrapper } from '@/components/onboarding/contact-form-wrapper';
import { DocumentUploadWrapper } from '@/components/onboarding/document-upload-wrapper';
import { EDDQuestionnaireWrapper } from '@/components/onboarding/edd-questionnaire-wrapper';
import { ReviewSummaryWrapper } from '@/components/onboarding/review-summary-wrapper';

/**
 * Component Registry - Maps string IDs to React components.
 *
 * To add a new component:
 * 1. Create the component following RegistryComponentProps interface
 * 2. Add it to this registry with a unique ID
 * 3. Use the ID in your YAML workflow definitions
 *
 * That's it! No action code changes needed.
 */
const UI_COMPONENT_REGISTRY: Record<string, React.ComponentType<RegistryComponentProps>> = {
  'contact-form': ContactFormWrapper,
  'document-upload': DocumentUploadWrapper,
  'edd-questionnaire': EDDQuestionnaireWrapper,
  'review-summary': ReviewSummaryWrapper,
  // Add more components here as needed
};

/**
 * Get a component from the registry by ID.
 *
 * @param componentId - The ID specified in YAML or action parameters
 * @returns The React component, or null if not found
 */
export function getComponent(
  componentId: string
): React.ComponentType<RegistryComponentProps> | null {
  return UI_COMPONENT_REGISTRY[componentId] ?? null;
}

/**
 * Get all available component IDs.
 * Used by the renderUI action to provide an enum to the AI.
 */
export function getAvailableComponentIds(): string[] {
  return Object.keys(UI_COMPONENT_REGISTRY);
}
```

### Step 3: Create Wrapper Components

Real UI components (like `ContactForm`) don't need to know about the registry. We create thin **wrapper components** that adapt them to the `RegistryComponentProps` interface:

```typescript
// src/components/onboarding/contact-form-wrapper.tsx

import { ContactForm } from '@/components/onboarding/contact-form';
import { RegistryComponentProps } from '@/lib/ui/component-registry';

/**
 * Wrapper that adapts ContactForm to the registry interface.
 *
 * This is a thin adapter layer - it handles the interface translation
 * but doesn't contain business logic.
 */
export function ContactFormWrapper({
  data,
  status,
  onComplete
}: RegistryComponentProps) {
  return (
    <ContactForm
      // Map registry data to component props
      initialName={data?.name || ''}
      initialEmail={data?.email || ''}
      initialPhone={data?.phone || ''}

      // Pass through status for loading states
      isLoading={status === 'executing'}

      // Adapt the component's callback to registry interface
      onSubmit={(formData) => {
        onComplete({
          action: 'submit',
          data: {
            name: formData.name,
            email: formData.email,
            phone: formData.phone
          }
        });
      }}

      onCancel={() => {
        onComplete({
          action: 'cancel',
          data: {}
        });
      }}
    />
  );
}
```

**Why wrappers?**
- Existing components don't need to change
- Clear separation: wrappers handle registry interface, components handle UI
- Easy to adapt third-party components to the registry
- Type safety: TypeScript ensures wrapper implements the interface correctly

### Step 4: Implement the Generic Action

```typescript
// src/components/workflow-chat.tsx (or similar)

import { useCopilotAction, useCopilotReadable } from '@copilotkit/react-core';
import { getComponent, getAvailableComponentIds } from '@/lib/ui/component-registry';
import { useWorkflowState } from '@/lib/workflow/use-workflow-state';

export function WorkflowChat() {
  const {
    currentStep,
    collectedInputs,
    updateInputs,
    progressToNextStep
  } = useWorkflowState();

  // Provide context to the AI about current workflow state
  useCopilotReadable({
    description: "Current workflow step and requirements",
    value: {
      stepId: currentStep?.id,
      taskRef: currentStep?.task_ref,
      componentId: currentStep?.component_id,
      requiredFields: currentStep?.required_fields,
      collectedData: collectedInputs,
      missingFields: currentStep?.required_fields?.filter(
        field => !collectedInputs[field]
      )
    }
  });

  // Single generic action that works with ANY component in the registry
  useCopilotAction({
    name: "renderUI",
    description: `Render a UI component from the registry to collect or display information.

    Available components:
    - contact-form: Collect customer contact information (name, email, phone)
    - document-upload: Upload business documents (registration, tax ID, proof of address)
    - edd-questionnaire: Enhanced Due Diligence questionnaire for high-risk clients
    - review-summary: Review all collected information before submission

    If componentId is not provided, the current workflow step's component_id will be used.`,

    parameters: [
      {
        name: "componentId",
        type: "string",
        description: "The ID of the component to render",
        enum: getAvailableComponentIds(),
        required: false
      },
      {
        name: "data",
        type: "object",
        description: "Initial data to populate the component (optional)",
        required: false
      }
    ],

    // Control when this action is available
    available: currentStep ? "enabled" : "disabled",

    renderAndWaitForResponse: ({ args, status, respond }) => {
      // Determine which component to render
      const componentId = args.componentId || currentStep?.component_id;

      if (!componentId) {
        return (
          <div className="p-4 bg-red-50 border border-red-200 rounded">
            <p className="text-red-900 text-sm">
              Error: No component specified and no current workflow step
            </p>
          </div>
        );
      }

      // Look up component in registry
      const Component = getComponent(componentId);

      if (!Component) {
        return (
          <div className="p-4 bg-red-50 border border-red-200 rounded">
            <p className="text-red-900 text-sm">
              Error: Unknown component ID: {componentId}
            </p>
            <p className="text-red-700 text-xs mt-2">
              Available: {getAvailableComponentIds().join(', ')}
            </p>
          </div>
        );
      }

      // Merge provided data with collected inputs
      const componentData = {
        ...collectedInputs,
        ...(args.data || {})
      };

      // Render the component with standard interface
      return (
        <Component
          data={componentData}
          status={status}
          onComplete={(result) => {
            console.log(`[renderUI] Component completed:`, result);

            // Update workflow state with collected data
            if (result.action === 'submit' && result.data) {
              updateInputs(result.data);
            }

            // Check if we can progress to next step
            const progression = progressToNextStep();

            if (!progression.canProgress) {
              // Missing required fields - inform AI
              respond?.(JSON.stringify({
                success: false,
                error: 'Missing required fields',
                missingFields: progression.missingFields,
                message: `Cannot proceed. Please collect: ${progression.missingFields.join(', ')}`
              }));
            } else {
              // Success - inform AI and provide next step info
              respond?.(JSON.stringify({
                success: true,
                action: result.action,
                data: result.data,
                nextStepId: progression.nextStepId,
                nextComponentId: progression.nextStep?.component_id,
                message: `Step completed. Next: ${progression.nextStep?.task_ref}`
              }));
            }
          }}
        />
      );
    }
  });

  return (
    <div className="workflow-chat">
      {/* Chat UI here */}
    </div>
  );
}
```

### Step 5: Configure YAML Workflows

Now business users can control the UI through YAML:

```yaml
# data/workflows/corporate_onboarding_v1.yaml

id: wf_corporate_v1
name: Corporate Onboarding v1
version: 1

applies_to:
  client_type: corporate
  jurisdictions: ["US", "CA", "GB"]

steps:
  - id: collectContactInfo
    task_ref: collect_contact_info
    component_id: contact-form          # ← Controls which UI renders
    required_fields:
      - legal_name
      - contact_email
      - contact_phone
    next:
      default: collectDocuments

  - id: collectDocuments
    task_ref: collect_business_documents
    component_id: document-upload       # ← Different component
    required_fields:
      - business_registration
      - tax_id
      - proof_of_address
    next:
      conditions:
        - when: "risk_score > 70"
          then: enhancedDueDiligence
      default: review

  - id: enhancedDueDiligence
    task_ref: perform_edd
    component_id: edd-questionnaire     # ← Yet another component
    required_fields:
      - source_of_funds
      - business_purpose
      - expected_transaction_volume
    next:
      default: review

  - id: review
    task_ref: review_and_submit
    component_id: review-summary        # ← Final component
    required_fields: []
    next:
      default: END
```

**Key Point**: To change the UI, business users just edit the `component_id` field. No code changes needed!

---

## Part 4: Benefits and Tradeoffs

### Benefits

#### 1. YAML-Driven UI Composition
Business users can:
- Change which component renders at each step
- Reorder workflow steps
- Add new steps using existing components
- Create A/B test variants

**Example**: Want to test a multi-step wizard vs. single-page form?
```yaml
# Variant A: Single page
steps:
  - id: collectAll
    component_id: contact-form-single-page

# Variant B: Wizard
steps:
  - id: step1
    component_id: contact-form-step1-name
  - id: step2
    component_id: contact-form-step2-email
  - id: step3
    component_id: contact-form-step3-phone
```

#### 2. Action Reusability
One action (`renderUI`) works with unlimited components:
- Current: 4 components → 1 action
- Add 10 more components → Still 1 action
- No action code changes needed

#### 3. Developer Productivity
To add a new workflow step:
1. Create the UI component (or reuse existing)
2. Create a thin wrapper implementing `RegistryComponentProps`
3. Add to registry: `'my-component': MyComponentWrapper`
4. Use in YAML: `component_id: my-component`

**No action code changes. No deployment changes. Just add and use.**

#### 4. Easier Testing
- Test components in isolation (standard props)
- Test registry lookup logic separately
- Test action logic without UI coupling
- Mock components easily for integration tests

#### 5. Type Safety Maintained
- Registry interface ensures type safety
- TypeScript validates wrapper implementations
- Enum provides autocomplete for component IDs
- Compile-time errors if interface violated

### Tradeoffs

#### 1. Indirection Complexity
**Cost**: One level of indirection (registry lookup)
**Mitigation**: Clear naming conventions, good documentation, TypeScript support

#### 2. Runtime Errors Possible
**Cost**: Invalid `component_id` in YAML → runtime error (not caught at compile time)
**Mitigation**:
- Validation on YAML load
- Graceful error handling with helpful messages
- Development-time YAML schema validation

#### 3. Wrapper Boilerplate
**Cost**: Each component needs a wrapper
**Mitigation**:
- Wrappers are thin (5-10 lines)
- Can be auto-generated from templates
- One-time cost per component

#### 4. Less AI Specificity
**Cost**: Generic action has less specific guidance than dedicated actions
**Mitigation**:
- Provide detailed component descriptions in registry
- Use `useCopilotReadable` to give context about current step
- Include component documentation in action description

---

## Part 5: Comparison - Before and After

### Before: Tightly Coupled (10 Workflow Steps = 10 Actions)

```typescript
// File: src/components/workflow-actions.tsx (hypothetical)
// Lines of code: ~500 (50 lines × 10 actions)

useCopilotAction({ name: "collectContactInfo", ... }); // 50 lines
useCopilotAction({ name: "collectDocuments", ... });   // 50 lines
useCopilotAction({ name: "collectOwners", ... });      // 50 lines
useCopilotAction({ name: "performKYC", ... });         // 50 lines
useCopilotAction({ name: "performEDD", ... });         // 50 lines
useCopilotAction({ name: "verifyAddress", ... });      // 50 lines
useCopilotAction({ name: "reviewData", ... });         // 50 lines
useCopilotAction({ name: "submitApplication", ... });  // 50 lines
useCopilotAction({ name: "uploadDocuments", ... });    // 50 lines
useCopilotAction({ name: "scheduleInterview", ... });  // 50 lines
```

**YAML workflow**:
```yaml
steps:
  - id: step1
    task_ref: collect_contact_info
    # ❌ Cannot control UI - it's hardcoded in action
```

### After: Component Registry (10 Workflow Steps = 1 Action + Registry)

```typescript
// File: src/lib/ui/component-registry.ts
// Lines of code: ~30

const UI_COMPONENT_REGISTRY = {
  'contact-form': ContactFormWrapper,
  'document-upload': DocumentUploadWrapper,
  'owner-list': OwnerListWrapper,
  'kyc-form': KYCFormWrapper,
  'edd-questionnaire': EDDQuestionnaireWrapper,
  'address-verification': AddressVerificationWrapper,
  'review-summary': ReviewSummaryWrapper,
  'submission-form': SubmissionFormWrapper,
  'file-upload': FileUploadWrapper,
  'interview-scheduler': InterviewSchedulerWrapper,
};

export function getComponent(id: string) { ... }
```

```typescript
// File: src/components/workflow-chat.tsx
// Lines of code: ~80 (one generic action)

useCopilotAction({
  name: "renderUI",
  parameters: [{ name: "componentId", enum: [...] }],
  renderAndWaitForResponse: ({ args }) => {
    const Component = getComponent(args.componentId);
    return <Component ... />;
  }
});
```

**YAML workflow**:
```yaml
steps:
  - id: step1
    task_ref: collect_contact_info
    component_id: contact-form        # ✅ YAML controls UI!
  - id: step2
    task_ref: collect_documents
    component_id: document-upload     # ✅ Can change without code
```

**Code reduction**: 500 lines → 110 lines (78% reduction)
**Flexibility**: Fixed UI → Configurable via YAML
**Extensibility**: New component = 10 lines wrapper + 1 line registry entry

---

## Part 6: Real-World Example - Complete Flow

Let's trace a complete user interaction through the system:

### Scenario: User Completes Contact Form

**1. AI receives context about current step:**
```typescript
useCopilotReadable({
  description: "Current workflow state",
  value: {
    stepId: "collectContactInfo",
    componentId: "contact-form",
    requiredFields: ["legal_name", "contact_email", "contact_phone"],
    missingFields: ["legal_name", "contact_email", "contact_phone"]
  }
});
```

**2. AI decides to call `renderUI` action:**
```json
{
  "action": "renderUI",
  "parameters": {
    "componentId": "contact-form",
    "data": {}
  }
}
```

**3. Action looks up component in registry:**
```typescript
const Component = getComponent("contact-form");
// Returns: ContactFormWrapper
```

**4. Component renders with standard interface:**
```typescript
<ContactFormWrapper
  data={{}}
  status="executing"
  onComplete={(result) => { ... }}
/>
```

**5. User fills out form and clicks Submit:**
```
Legal Name: "Acme Corporation"
Email: "contact@acme.com"
Phone: "+1-555-0100"
```

**6. Wrapper calls `onComplete` callback:**
```typescript
onComplete({
  action: 'submit',
  data: {
    legal_name: "Acme Corporation",
    contact_email: "contact@acme.com",
    contact_phone: "+1-555-0100"
  }
});
```

**7. Action updates workflow state:**
```typescript
updateInputs({
  legal_name: "Acme Corporation",
  contact_email: "contact@acme.com",
  contact_phone: "+1-555-0100"
});
```

**8. Action progresses to next step:**
```typescript
const progression = progressToNextStep();
// Returns: {
//   canProgress: true,
//   nextStepId: "collectDocuments",
//   nextStep: { component_id: "document-upload", ... }
// }
```

**9. Action responds to AI:**
```json
{
  "success": true,
  "action": "submit",
  "data": { "legal_name": "...", "contact_email": "...", "contact_phone": "..." },
  "nextStepId": "collectDocuments",
  "nextComponentId": "document-upload",
  "message": "Step completed. Next: collect_business_documents"
}
```

**10. AI updates UI and prompts for next step:**
```
AI: Great! I've saved your contact information. Now let's collect your business documents.
    I need: business registration, tax ID, and proof of address.
```

**11. Cycle repeats with next component from registry:**
```typescript
const Component = getComponent("document-upload");
return <Component ... />;
```

---

## Part 7: Adding a New Component - Step by Step

Let's say we want to add a "Beneficial Owners" form to collect ownership information.

### Step 1: Create the UI Component (Pure Presentation)

```typescript
// src/components/onboarding/beneficial-owners-form.tsx

interface Owner {
  name: string;
  ownership_percentage: number;
  date_of_birth: string;
}

interface BeneficialOwnersFormProps {
  initialOwners?: Owner[];
  isLoading?: boolean;
  onSubmit: (owners: Owner[]) => void;
  onCancel?: () => void;
}

export function BeneficialOwnersForm({
  initialOwners = [],
  isLoading = false,
  onSubmit,
  onCancel
}: BeneficialOwnersFormProps) {
  const [owners, setOwners] = useState<Owner[]>(initialOwners);

  const addOwner = () => {
    setOwners([...owners, { name: '', ownership_percentage: 0, date_of_birth: '' }]);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(owners);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <h3 className="text-lg font-semibold">Beneficial Owners</h3>
      <p className="text-sm text-gray-600">
        List all individuals who own 25% or more of the company
      </p>

      {owners.map((owner, index) => (
        <div key={index} className="border rounded p-4 space-y-3">
          <input
            type="text"
            placeholder="Full Name"
            value={owner.name}
            onChange={(e) => {
              const updated = [...owners];
              updated[index].name = e.target.value;
              setOwners(updated);
            }}
            className="w-full px-3 py-2 border rounded"
            disabled={isLoading}
          />
          <input
            type="number"
            placeholder="Ownership %"
            value={owner.ownership_percentage}
            onChange={(e) => {
              const updated = [...owners];
              updated[index].ownership_percentage = parseFloat(e.target.value);
              setOwners(updated);
            }}
            className="w-full px-3 py-2 border rounded"
            disabled={isLoading}
          />
          <input
            type="date"
            value={owner.date_of_birth}
            onChange={(e) => {
              const updated = [...owners];
              updated[index].date_of_birth = e.target.value;
              setOwners(updated);
            }}
            className="w-full px-3 py-2 border rounded"
            disabled={isLoading}
          />
        </div>
      ))}

      <button
        type="button"
        onClick={addOwner}
        disabled={isLoading}
        className="px-4 py-2 bg-gray-100 border rounded hover:bg-gray-200"
      >
        + Add Owner
      </button>

      <div className="flex gap-3 pt-4">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={isLoading}
            className="flex-1 px-4 py-2 border rounded"
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          disabled={isLoading}
          className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          {isLoading ? 'Submitting...' : 'Submit'}
        </button>
      </div>
    </form>
  );
}
```

### Step 2: Create the Wrapper (Registry Adapter)

```typescript
// src/components/onboarding/beneficial-owners-wrapper.tsx

import { BeneficialOwnersForm } from './beneficial-owners-form';
import { RegistryComponentProps } from '@/lib/ui/component-registry';

/**
 * Wrapper that adapts BeneficialOwnersForm to the registry interface.
 */
export function BeneficialOwnersWrapper({
  data,
  status,
  onComplete
}: RegistryComponentProps) {
  return (
    <BeneficialOwnersForm
      initialOwners={data?.beneficial_owners || []}
      isLoading={status === 'executing'}
      onSubmit={(owners) => {
        onComplete({
          action: 'submit',
          data: { beneficial_owners: owners }
        });
      }}
      onCancel={() => {
        onComplete({
          action: 'cancel',
          data: {}
        });
      }}
    />
  );
}
```

### Step 3: Add to Registry

```typescript
// src/lib/ui/component-registry.ts

import { BeneficialOwnersWrapper } from '@/components/onboarding/beneficial-owners-wrapper';

const UI_COMPONENT_REGISTRY: Record<string, React.ComponentType<RegistryComponentProps>> = {
  'contact-form': ContactFormWrapper,
  'document-upload': DocumentUploadWrapper,
  'edd-questionnaire': EDDQuestionnaireWrapper,
  'review-summary': ReviewSummaryWrapper,
  'beneficial-owners': BeneficialOwnersWrapper,  // ← Add this line
};
```

### Step 4: Use in YAML

```yaml
# data/workflows/corporate_onboarding_v1.yaml

steps:
  - id: collectContactInfo
    task_ref: collect_contact_info
    component_id: contact-form
    required_fields: [legal_name, contact_email, contact_phone]
    next:
      default: collectOwners  # ← Go to new step

  - id: collectOwners         # ← New step
    task_ref: collect_beneficial_owners
    component_id: beneficial-owners  # ← Use new component
    required_fields:
      - beneficial_owners
    next:
      default: collectDocuments

  - id: collectDocuments
    task_ref: collect_business_documents
    component_id: document-upload
    required_fields: [business_registration, tax_id, proof_of_address]
    next:
      default: review
```

### That's It!

**No changes needed to:**
- ✅ Action code (still uses generic `renderUI`)
- ✅ Workflow engine
- ✅ State management
- ✅ Other components

**Total work:**
- Create component: 50 lines
- Create wrapper: 15 lines
- Add to registry: 1 line
- Update YAML: 8 lines

**Total time: ~30 minutes**

---

## Part 8: Testing Strategy

### Unit Test: Registry Lookup

```typescript
// src/lib/ui/component-registry.test.ts

import { getComponent, getAvailableComponentIds } from './component-registry';

describe('Component Registry', () => {
  it('should return component for valid ID', () => {
    const Component = getComponent('contact-form');
    expect(Component).toBeDefined();
    expect(Component).not.toBeNull();
  });

  it('should return null for invalid ID', () => {
    const Component = getComponent('nonexistent-component');
    expect(Component).toBeNull();
  });

  it('should list all available component IDs', () => {
    const ids = getAvailableComponentIds();
    expect(ids).toContain('contact-form');
    expect(ids).toContain('document-upload');
    expect(ids).toContain('edd-questionnaire');
    expect(ids).toContain('review-summary');
  });
});
```

### Integration Test: Wrapper Implementation

```typescript
// src/components/onboarding/contact-form-wrapper.test.tsx

import { render, screen, fireEvent } from '@testing-library/react';
import { ContactFormWrapper } from './contact-form-wrapper';
import { RenderFunctionStatus } from '@copilotkit/react-core';

describe('ContactFormWrapper', () => {
  it('should render with initial data', () => {
    render(
      <ContactFormWrapper
        data={{ name: 'Test Company', email: 'test@example.com' }}
        status={'executing' as RenderFunctionStatus}
        onComplete={() => {}}
      />
    );

    expect(screen.getByDisplayValue('Test Company')).toBeInTheDocument();
    expect(screen.getByDisplayValue('test@example.com')).toBeInTheDocument();
  });

  it('should call onComplete with submitted data', () => {
    const onComplete = jest.fn();

    render(
      <ContactFormWrapper
        data={{}}
        status={'executing' as RenderFunctionStatus}
        onComplete={onComplete}
      />
    );

    fireEvent.change(screen.getByLabelText(/name/i), {
      target: { value: 'Acme Corp' }
    });
    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: 'contact@acme.com' }
    });
    fireEvent.click(screen.getByText(/submit/i));

    expect(onComplete).toHaveBeenCalledWith({
      action: 'submit',
      data: {
        name: 'Acme Corp',
        email: 'contact@acme.com',
        phone: expect.any(String)
      }
    });
  });
});
```

### E2E Test: Complete Workflow with Registry

```typescript
// tests/integration/workflow-with-registry.test.tsx

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { WorkflowApp } from '@/app/workflow/page';

describe('Workflow with Component Registry', () => {
  it('should progress through workflow using registry components', async () => {
    render(<WorkflowApp />);

    // Step 1: Contact form (from registry: 'contact-form')
    expect(screen.getByText(/Contact Information/i)).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/legal name/i), {
      target: { value: 'Acme Corp' }
    });
    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: 'contact@acme.com' }
    });
    fireEvent.click(screen.getByText(/submit/i));

    // Step 2: Document upload (from registry: 'document-upload')
    await waitFor(() => {
      expect(screen.getByText(/Upload Documents/i)).toBeInTheDocument();
    });

    // Upload mock files
    const file = new File(['dummy'], 'registration.pdf', { type: 'application/pdf' });
    const input = screen.getByLabelText(/business registration/i);
    fireEvent.change(input, { target: { files: [file] } });
    fireEvent.click(screen.getByText(/submit/i));

    // Step 3: Review (from registry: 'review-summary')
    await waitFor(() => {
      expect(screen.getByText(/Review & Submit/i)).toBeInTheDocument();
      expect(screen.getByText(/Acme Corp/i)).toBeInTheDocument();
    });
  });
});
```

---

## Part 9: Common Pitfalls and Solutions

### Pitfall 1: Forgetting to Add Component to Registry

**Problem**:
```yaml
steps:
  - id: collectData
    component_id: my-new-form  # ← Component not in registry
```

**Error**:
```
Error: Unknown component ID: my-new-form
Available: contact-form, document-upload, edd-questionnaire, review-summary
```

**Solution**: Add to registry before using in YAML.

### Pitfall 2: Wrapper Doesn't Implement Interface Correctly

**Problem**:
```typescript
// ❌ Wrong: Missing onComplete callback
export function BadWrapper({ data, status }: RegistryComponentProps) {
  return <SomeForm initialData={data} />;
}
```

**Error**: TypeScript compilation error or runtime error when action tries to call `onComplete`.

**Solution**: Always implement full interface:
```typescript
// ✅ Correct
export function GoodWrapper({ data, status, onComplete }: RegistryComponentProps) {
  return (
    <SomeForm
      initialData={data}
      onSubmit={(result) => onComplete({ action: 'submit', data: result })}
    />
  );
}
```

### Pitfall 3: YAML Typo in component_id

**Problem**:
```yaml
steps:
  - id: step1
    component_id: contcat-form  # ← Typo: "contcat" instead of "contact"
```

**Solution**: Implement YAML schema validation on load:
```typescript
function validateWorkflow(def: WorkflowDefinition): ValidationResult {
  const availableComponents = getAvailableComponentIds();
  const errors: string[] = [];

  def.steps.forEach(step => {
    if (step.component_id && !availableComponents.includes(step.component_id)) {
      errors.push(
        `Step "${step.id}" references unknown component: "${step.component_id}". ` +
        `Available: ${availableComponents.join(', ')}`
      );
    }
  });

  return { valid: errors.length === 0, errors };
}
```

### Pitfall 4: Not Handling Component Render Errors

**Problem**: Component crashes, entire workflow breaks.

**Solution**: Add error boundary:
```typescript
renderAndWaitForResponse: ({ args, status, respond }) => {
  const Component = getComponent(args.componentId);

  if (!Component) {
    return <ErrorComponent message={`Unknown component: ${args.componentId}`} />;
  }

  return (
    <ErrorBoundary
      fallback={
        <div className="p-4 bg-red-50 border border-red-200 rounded">
          <p className="text-red-900 text-sm">
            Component "{args.componentId}" failed to render
          </p>
        </div>
      }
    >
      <Component data={args.data} status={status} onComplete={onComplete} />
    </ErrorBoundary>
  );
}
```

---

## Summary

### The Problem
Traditional CopilotKit apps tightly couple actions to UI components, requiring:
- One action per UI component
- Code changes to modify workflows
- Developer involvement for business logic changes

### The Solution
Component Registry Pattern provides:
- **Indirection**: Map string IDs → React components
- **YAML control**: Business users specify `component_id` in workflows
- **Single action**: One `renderUI` action serves all components
- **Standard interface**: All components implement `RegistryComponentProps`
- **Thin wrappers**: Adapt real components to registry interface

### How to Achieve It
1. Define `RegistryComponentProps` interface
2. Create component registry mapping IDs to components
3. Create wrappers implementing the interface
4. Implement generic `renderUI` action using registry lookup
5. Configure YAML workflows with `component_id` fields

### Benefits
- ✅ YAML-driven UI composition
- ✅ Business user autonomy
- ✅ Developer productivity
- ✅ Code reusability (one action, unlimited components)
- ✅ Type safety maintained
- ✅ Easy testing

### Result
**Decoupled, flexible, maintainable workflows that business users can edit without code changes.**

---

**Next Steps**: Proceed to implementation of this pattern in Task 3.
