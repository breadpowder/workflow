# Schema-Driven Component Reusability

## Core Principle

**One component, multiple schemas** - Components should be reusable across different use cases by accepting dynamic field definitions rather than hardcoding specific fields.

---

## The Requirement

### ❌ Anti-Pattern: Creating Multiple Similar Components

```typescript
// DON'T DO THIS - Creates unnecessary duplication
const UI_COMPONENT_REGISTRY = {
  'individual-contact-form': IndividualContactFormWrapper,  // Has: name, email, phone
  'corporate-contact-form': CorporateContactFormWrapper,    // Has: legal_name, contact_email, business_phone, entity_type
  'trust-contact-form': TrustContactFormWrapper,            // Has: trust_name, trustee_email, trustee_phone
  // ... 10 more variants for different entity types
};
```

**Problems:**
- Code duplication (10 forms, all collecting contact info)
- Maintenance nightmare (bug fix needs 10 updates)
- Registry bloat (100 workflow variations = 1000 components)
- YAML can't adapt forms (each needs dedicated component)

### ✅ Correct Pattern: Schema-Driven Components

```typescript
// DO THIS - One component handles all schemas
const UI_COMPONENT_REGISTRY = {
  'contact-form': GenericContactFormWrapper,  // Renders ANY contact fields based on schema
  'document-upload': GenericDocumentUploadWrapper,
  'data-table': GenericDataTableWrapper,
  'questionnaire': GenericQuestionnaireWrapper,
};
```

**Benefits:**
- Single source of truth (one component, one implementation)
- Easy maintenance (fix once, works everywhere)
- Registry stays lean (5 components, not 50)
- YAML defines schemas (full flexibility without code changes)

---

## Architecture: Component + Schema Pattern

### The Two-Part System

```
┌─────────────────────────────────────────────────────────────┐
│ YAML Workflow Definition                                    │
│ ----------------------------------------------------------- │
│ steps:                                                      │
│   - id: collectIndividualContact                            │
│     component_id: "contact-form"    ← WHAT to render        │
│     fields:                         ← HOW to render it      │
│       - name: full_name                                     │
│         label: "Full Name"                                  │
│         type: text                                          │
│         required: true                                      │
│       - name: email                                         │
│         label: "Email Address"                              │
│         type: email                                         │
│         required: true                                      │
│       - name: phone                                         │
│         label: "Phone Number"                               │
│         type: tel                                           │
│         required: true                                      │
│                                                             │
│   - id: collectCorporateContact                             │
│     component_id: "contact-form"    ← SAME component        │
│     fields:                         ← DIFFERENT schema      │
│       - name: legal_name                                    │
│         label: "Legal Business Name"                        │
│         type: text                                          │
│         required: true                                      │
│       - name: entity_type                                   │
│         label: "Entity Type"                                │
│         type: select                                        │
│         options: ["Corporation", "LLC", "Partnership"]      │
│         required: true                                      │
│       - name: business_email                                │
│         label: "Business Email"                             │
│         type: email                                         │
│         required: true                                      │
│       - name: business_phone                                │
│         label: "Business Phone"                             │
│         type: tel                                           │
│         required: true                                      │
│       - name: jurisdiction                                  │
│         label: "Jurisdiction"                               │
│         type: select                                        │
│         options: ["US", "CA", "GB"]                         │
│         required: true                                      │
└─────────────────────────────────────────────────────────────┘
```

### Key Insight: Behavior vs. Data

**Component (behavior)**: HOW to collect/display data
- `contact-form` → Renders a form with validation and submit button
- `document-upload` → Handles file uploads with drag-and-drop
- `data-table` → Displays data in sortable/filterable table
- `questionnaire` → Multi-step question flow with conditional logic

**Schema (data)**: WHAT data to collect/display
- Individual fields: full_name, email, phone
- Corporate fields: legal_name, entity_type, business_email, business_phone, jurisdiction
- Trust fields: trust_name, trustee_email, formation_date
- Different fields for same component behavior

---

## Implementation: Generic Form Component

### Step 1: Define Field Schema

```typescript
// src/lib/types/field-schema.ts

export type FieldType =
  | 'text'
  | 'email'
  | 'tel'
  | 'number'
  | 'date'
  | 'textarea'
  | 'select'
  | 'checkbox'
  | 'radio'
  | 'file';

export interface FieldSchema {
  name: string;              // Field identifier (e.g., "legal_name")
  label: string;             // Display label (e.g., "Legal Business Name")
  type: FieldType;           // Input type
  required?: boolean;        // Validation: is field required?
  placeholder?: string;      // Placeholder text
  helpText?: string;         // Additional guidance
  validation?: {             // Advanced validation
    pattern?: string;        // Regex pattern
    minLength?: number;
    maxLength?: number;
    min?: number;            // For number/date
    max?: number;
  };
  options?: Array<{          // For select/radio
    value: string;
    label: string;
  }>;
  defaultValue?: any;        // Default value
  visible?: string;          // Conditional visibility expression (e.g., "entity_type == 'Corporation'")
}

export interface FormSchema {
  fields: FieldSchema[];
  layout?: 'single-column' | 'two-column' | 'grid';
  submitLabel?: string;
  cancelLabel?: string;
}
```

### Step 2: Create Generic Form Component

```typescript
// src/components/ui/generic-form.tsx

import { useState, useEffect } from 'react';
import { FieldSchema, FormSchema } from '@/lib/types/field-schema';
import { FormField } from '@/components/ui/form-field';

interface GenericFormProps {
  schema: FormSchema;
  initialData?: Record<string, any>;
  isLoading?: boolean;
  onSubmit: (data: Record<string, any>) => void;
  onCancel?: () => void;
}

export function GenericForm({
  schema,
  initialData = {},
  isLoading = false,
  onSubmit,
  onCancel
}: GenericFormProps) {
  const [formData, setFormData] = useState<Record<string, any>>(initialData);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Initialize form data with default values
  useEffect(() => {
    const defaults: Record<string, any> = {};
    schema.fields.forEach(field => {
      if (field.defaultValue !== undefined) {
        defaults[field.name] = field.defaultValue;
      }
    });
    setFormData({ ...defaults, ...initialData });
  }, [schema, initialData]);

  // Evaluate conditional visibility
  const isFieldVisible = (field: FieldSchema): boolean => {
    if (!field.visible) return true;

    // Simple expression evaluation (e.g., "entity_type == 'Corporation'")
    try {
      const [leftVar, operator, rightValue] = field.visible.split(' ');
      const leftValue = formData[leftVar.trim()];
      const cleanRight = rightValue.trim().replace(/['"]/g, '');

      switch (operator.trim()) {
        case '==':
          return leftValue === cleanRight;
        case '!=':
          return leftValue !== cleanRight;
        case 'in':
          return cleanRight.split(',').includes(leftValue);
        default:
          return true;
      }
    } catch {
      return true; // Show field if expression parsing fails
    }
  };

  // Validate field
  const validateField = (field: FieldSchema, value: any): string | null => {
    // Required check
    if (field.required && (!value || value === '')) {
      return `${field.label} is required`;
    }

    // Pattern validation
    if (field.validation?.pattern && value) {
      const regex = new RegExp(field.validation.pattern);
      if (!regex.test(value)) {
        return `${field.label} format is invalid`;
      }
    }

    // Length validation
    if (field.validation?.minLength && value?.length < field.validation.minLength) {
      return `${field.label} must be at least ${field.validation.minLength} characters`;
    }
    if (field.validation?.maxLength && value?.length > field.validation.maxLength) {
      return `${field.label} must be at most ${field.validation.maxLength} characters`;
    }

    // Number range validation
    if (field.type === 'number') {
      const numValue = parseFloat(value);
      if (field.validation?.min !== undefined && numValue < field.validation.min) {
        return `${field.label} must be at least ${field.validation.min}`;
      }
      if (field.validation?.max !== undefined && numValue > field.validation.max) {
        return `${field.label} must be at most ${field.validation.max}`;
      }
    }

    return null;
  };

  // Handle field change
  const handleChange = (fieldName: string, value: any) => {
    setFormData(prev => ({ ...prev, [fieldName]: value }));

    // Clear error when user starts typing
    if (errors[fieldName]) {
      setErrors(prev => {
        const updated = { ...prev };
        delete updated[fieldName];
        return updated;
      });
    }
  };

  // Handle submit
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validate all visible required fields
    const validationErrors: Record<string, string> = {};
    schema.fields.forEach(field => {
      if (isFieldVisible(field)) {
        const error = validateField(field, formData[field.name]);
        if (error) {
          validationErrors[field.name] = error;
        }
      }
    });

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    // Filter out data for hidden fields
    const visibleData: Record<string, any> = {};
    schema.fields.forEach(field => {
      if (isFieldVisible(field) && formData[field.name] !== undefined) {
        visibleData[field.name] = formData[field.name];
      }
    });

    onSubmit(visibleData);
  };

  // Determine layout classes
  const layoutClass = {
    'single-column': 'space-y-4',
    'two-column': 'grid grid-cols-2 gap-4',
    'grid': 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'
  }[schema.layout || 'single-column'];

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className={layoutClass}>
        {schema.fields.map(field => {
          if (!isFieldVisible(field)) return null;

          return (
            <FormField
              key={field.name}
              field={field}
              value={formData[field.name]}
              error={errors[field.name]}
              disabled={isLoading}
              onChange={(value) => handleChange(field.name, value)}
            />
          );
        })}
      </div>

      <div className="flex gap-3 pt-4 border-t">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={isLoading}
            className="flex-1 px-6 py-2.5 bg-gray-100 text-gray-700 text-sm font-medium
                       rounded-md border border-gray-400 hover:bg-gray-200 transition-colors
                       disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {schema.cancelLabel || 'Cancel'}
          </button>
        )}
        <button
          type="submit"
          disabled={isLoading}
          className="flex-1 px-6 py-2.5 bg-blue-600 text-white text-sm font-medium
                     rounded-md hover:bg-blue-700 transition-colors
                     disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Submitting...' : (schema.submitLabel || 'Submit')}
        </button>
      </div>
    </form>
  );
}
```

### Step 3: Create FormField Component (Renders Individual Fields)

```typescript
// src/components/ui/form-field.tsx

import { FieldSchema } from '@/lib/types/field-schema';

interface FormFieldProps {
  field: FieldSchema;
  value: any;
  error?: string;
  disabled?: boolean;
  onChange: (value: any) => void;
}

export function FormField({ field, value, error, disabled, onChange }: FormFieldProps) {
  const baseInputClass = `
    w-full px-3 py-2 border rounded-md text-sm
    focus:outline-none focus:ring-2 focus:ring-blue-500
    disabled:bg-gray-100 disabled:cursor-not-allowed
    ${error ? 'border-red-500' : 'border-gray-300'}
  `;

  const renderInput = () => {
    switch (field.type) {
      case 'textarea':
        return (
          <textarea
            id={field.name}
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder}
            disabled={disabled}
            rows={4}
            className={baseInputClass}
          />
        );

      case 'select':
        return (
          <select
            id={field.name}
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            disabled={disabled}
            className={baseInputClass}
          >
            <option value="">Select...</option>
            {field.options?.map(opt => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        );

      case 'checkbox':
        return (
          <div className="flex items-center">
            <input
              type="checkbox"
              id={field.name}
              checked={value || false}
              onChange={(e) => onChange(e.target.checked)}
              disabled={disabled}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
            />
            <label htmlFor={field.name} className="ml-2 text-sm text-gray-700">
              {field.label}
            </label>
          </div>
        );

      case 'radio':
        return (
          <div className="space-y-2">
            {field.options?.map(opt => (
              <div key={opt.value} className="flex items-center">
                <input
                  type="radio"
                  id={`${field.name}-${opt.value}`}
                  name={field.name}
                  value={opt.value}
                  checked={value === opt.value}
                  onChange={(e) => onChange(e.target.value)}
                  disabled={disabled}
                  className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-2 focus:ring-blue-500"
                />
                <label htmlFor={`${field.name}-${opt.value}`} className="ml-2 text-sm text-gray-700">
                  {opt.label}
                </label>
              </div>
            ))}
          </div>
        );

      default:
        return (
          <input
            type={field.type}
            id={field.name}
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder}
            disabled={disabled}
            min={field.validation?.min}
            max={field.validation?.max}
            minLength={field.validation?.minLength}
            maxLength={field.validation?.maxLength}
            pattern={field.validation?.pattern}
            className={baseInputClass}
          />
        );
    }
  };

  // Checkbox renders label inline
  if (field.type === 'checkbox') {
    return (
      <div className="space-y-1">
        {renderInput()}
        {field.helpText && (
          <p className="text-xs text-gray-600 ml-6">{field.helpText}</p>
        )}
        {error && (
          <p className="text-xs text-red-600 ml-6">{error}</p>
        )}
      </div>
    );
  }

  // Standard label above input
  return (
    <div className="space-y-1">
      <label htmlFor={field.name} className="block text-sm font-medium text-gray-900">
        {field.label}
        {field.required && <span className="text-red-500 ml-1">*</span>}
      </label>
      {renderInput()}
      {field.helpText && (
        <p className="text-xs text-gray-600">{field.helpText}</p>
      )}
      {error && (
        <p className="text-xs text-red-600">{error}</p>
      )}
    </div>
  );
}
```

### Step 4: Create Generic Form Wrapper for Registry

```typescript
// src/components/onboarding/generic-form-wrapper.tsx

import { GenericForm } from '@/components/ui/generic-form';
import { RegistryComponentProps } from '@/lib/ui/component-registry';
import { FormSchema } from '@/lib/types/field-schema';

/**
 * Generic form wrapper that adapts schema-driven forms to the registry interface.
 *
 * This single wrapper handles ALL form variations:
 * - Individual contact forms
 * - Corporate contact forms
 * - Trust contact forms
 * - EDD questionnaires
 * - Any other form-based data collection
 */
export function GenericFormWrapper({
  data,
  status,
  onComplete
}: RegistryComponentProps) {
  // Extract schema from data (passed from YAML via action)
  const schema: FormSchema = data.schema || {
    fields: [],
    layout: 'single-column'
  };

  // Extract initial form values (pre-populated data)
  const initialValues = data.initialValues || {};

  return (
    <GenericForm
      schema={schema}
      initialData={initialValues}
      isLoading={status === 'executing'}
      onSubmit={(formData) => {
        onComplete({
          action: 'submit',
          data: formData
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

### Step 5: Update Registry (One Entry for All Forms!)

```typescript
// src/lib/ui/component-registry.ts

import { GenericFormWrapper } from '@/components/onboarding/generic-form-wrapper';
import { GenericDocumentUploadWrapper } from '@/components/onboarding/generic-document-upload-wrapper';
import { GenericDataTableWrapper } from '@/components/onboarding/generic-data-table-wrapper';

const UI_COMPONENT_REGISTRY: Record<string, React.ComponentType<RegistryComponentProps>> = {
  'form': GenericFormWrapper,              // Handles ALL forms via schema
  'document-upload': GenericDocumentUploadWrapper,  // Handles ALL uploads via schema
  'data-table': GenericDataTableWrapper,   // Handles ALL tables via schema
  // Add more generic components as needed
};
```

---

## YAML Workflow Examples

### Example 1: Individual vs. Corporate Contact Forms

```yaml
# Same component, different schemas!

steps:
  # Individual client workflow
  - id: collectIndividualContact
    task_ref: collect_contact_info
    component_id: form              # Generic form component
    schema:
      fields:
        - name: full_name
          label: "Full Name"
          type: text
          required: true
          placeholder: "John Doe"
        - name: date_of_birth
          label: "Date of Birth"
          type: date
          required: true
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
        - name: ssn
          label: "Social Security Number"
          type: text
          required: true
          helpText: "For identity verification purposes"
      layout: single-column
      submitLabel: "Continue"
    next:
      default: collectIndividualDocuments

  # Corporate client workflow
  - id: collectCorporateContact
    task_ref: collect_contact_info
    component_id: form              # SAME component!
    schema:
      fields:
        - name: legal_name
          label: "Legal Business Name"
          type: text
          required: true
          placeholder: "Acme Corporation"
        - name: entity_type
          label: "Entity Type"
          type: select
          required: true
          options:
            - value: corporation
              label: "Corporation"
            - value: llc
              label: "Limited Liability Company (LLC)"
            - value: partnership
              label: "Partnership"
            - value: sole_proprietorship
              label: "Sole Proprietorship"
        - name: jurisdiction
          label: "Jurisdiction of Incorporation"
          type: select
          required: true
          options:
            - value: US
              label: "United States"
            - value: CA
              label: "Canada"
            - value: GB
              label: "United Kingdom"
        - name: business_email
          label: "Business Email"
          type: email
          required: true
        - name: business_phone
          label: "Business Phone"
          type: tel
          required: true
        - name: tax_id
          label: "Tax ID / EIN"
          type: text
          required: true
          placeholder: "XX-XXXXXXX"
      layout: two-column
      submitLabel: "Continue"
    next:
      default: collectCorporateDocuments
```

### Example 2: Conditional Fields Based on Selection

```yaml
steps:
  - id: collectEntityInfo
    task_ref: collect_entity_information
    component_id: form
    schema:
      fields:
        - name: entity_type
          label: "Entity Type"
          type: select
          required: true
          options:
            - value: individual
              label: "Individual"
            - value: corporation
              label: "Corporation"
            - value: trust
              label: "Trust"

        # Individual-specific fields (only shown if entity_type == individual)
        - name: full_name
          label: "Full Name"
          type: text
          required: true
          visible: "entity_type == 'individual'"

        - name: date_of_birth
          label: "Date of Birth"
          type: date
          required: true
          visible: "entity_type == 'individual'"

        # Corporation-specific fields (only shown if entity_type == corporation)
        - name: legal_name
          label: "Legal Business Name"
          type: text
          required: true
          visible: "entity_type == 'corporation'"

        - name: jurisdiction
          label: "Jurisdiction"
          type: select
          required: true
          visible: "entity_type == 'corporation'"
          options:
            - value: US
              label: "United States"
            - value: CA
              label: "Canada"

        # Trust-specific fields (only shown if entity_type == trust)
        - name: trust_name
          label: "Trust Name"
          type: text
          required: true
          visible: "entity_type == 'trust'"

        - name: trustee_name
          label: "Trustee Name"
          type: text
          required: true
          visible: "entity_type == 'trust'"

        # Common fields (always shown)
        - name: email
          label: "Email Address"
          type: email
          required: true

        - name: phone
          label: "Phone Number"
          type: tel
          required: true
      layout: single-column
    next:
      default: collectDocuments
```

### Example 3: Multi-Step Form (Same Component, Different Schemas)

```yaml
steps:
  # Step 1: Basic Information
  - id: step1_basic
    task_ref: collect_basic_info
    component_id: form
    schema:
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
            - value: corporation
              label: "Corporation"
            - value: llc
              label: "LLC"
      submitLabel: "Next: Contact Information"
    next:
      default: step2_contact

  # Step 2: Contact Information
  - id: step2_contact
    task_ref: collect_contact_info
    component_id: form              # SAME component
    schema:
      fields:
        - name: business_email
          label: "Business Email"
          type: email
          required: true
        - name: business_phone
          label: "Business Phone"
          type: tel
          required: true
      submitLabel: "Next: Address"
    next:
      default: step3_address

  # Step 3: Address Information
  - id: step3_address
    task_ref: collect_address
    component_id: form              # SAME component again
    schema:
      fields:
        - name: street_address
          label: "Street Address"
          type: text
          required: true
        - name: city
          label: "City"
          type: text
          required: true
        - name: state
          label: "State/Province"
          type: text
          required: true
        - name: postal_code
          label: "Postal Code"
          type: text
          required: true
        - name: country
          label: "Country"
          type: select
          required: true
          options:
            - value: US
              label: "United States"
            - value: CA
              label: "Canada"
      layout: two-column
      submitLabel: "Submit"
    next:
      default: review
```

---

## Workflow Engine Integration

### Updated Step Schema

```typescript
// src/lib/workflow/schema.ts

export interface WorkflowStep {
  id: string;
  task_ref: string;
  component_id: string;           // Which component to render
  schema?: FormSchema;            // HOW to configure that component (for forms)
  document_types?: DocumentSchema; // For document uploads
  table_config?: TableConfig;     // For data tables
  required_fields?: string[];     // Fields that must be collected
  next: {
    conditions?: WorkflowStepNextCondition[];
    default: string;
  };
}
```

### Action Passes Schema to Component

```typescript
// src/components/workflow-chat.tsx

useCopilotAction({
  name: "renderUI",
  description: "Render a UI component with its schema",
  parameters: [
    {
      name: "componentId",
      type: "string",
      enum: getAvailableComponentIds(),
      required: false
    },
    {
      name: "data",
      type: "object",
      description: "Initial data including schema and initial values",
      required: false
    }
  ],
  renderAndWaitForResponse: ({ args, status, respond }) => {
    const componentId = args.componentId || currentStep?.component_id;
    const Component = getComponent(componentId);

    if (!Component) {
      return <ErrorComponent message={`Unknown component: ${componentId}`} />;
    }

    // Prepare data with schema from workflow definition
    const componentData = {
      schema: currentStep?.schema,           // Pass schema from YAML
      initialValues: {
        ...collectedInputs,                  // Pre-populate with existing data
        ...(args.data || {})
      }
    };

    return (
      <Component
        data={componentData}
        status={status}
        onComplete={(result) => {
          if (result.action === 'submit') {
            updateInputs(result.data);
          }
          const progression = progressToNextStep();
          respond?.(JSON.stringify({
            success: progression.canProgress,
            data: result.data,
            nextStepId: progression.nextStepId
          }));
        }}
      />
    );
  }
});
```

---

## Benefits of Schema-Driven Approach

### 1. Massive Code Reduction

**Before (Component per Use Case):**
```
10 entity types × 5 forms each = 50 components
50 components × 100 lines each = 5,000 lines of code
```

**After (Schema-Driven):**
```
1 generic form component = 300 lines
5 generic components total = 1,500 lines
Reduction: 70% less code
```

### 2. Business User Empowerment

Business users can:
- Add new entity types without developer involvement
- Modify field labels, help text, placeholders
- Change field order and layout
- Add/remove fields from workflows
- Implement conditional logic
- A/B test different form designs

**All via YAML edits - no code deployment needed!**

### 3. Consistency Across Workflows

- Same validation logic everywhere
- Same styling and UX patterns
- Same accessibility features
- Single source of truth for form behavior

### 4. Rapid Iteration

**Scenario**: Need to add "Industry" field to corporate onboarding

**Old way** (dedicated components):
1. Edit CorporateContactForm component
2. Add field to form
3. Update validation
4. Update styling
5. Test
6. Deploy
**Time: 2 hours**

**New way** (schema-driven):
1. Edit YAML:
```yaml
- name: industry
  label: "Industry"
  type: select
  required: true
  options:
    - { value: finance, label: "Financial Services" }
    - { value: tech, label: "Technology" }
    - { value: healthcare, label: "Healthcare" }
```
**Time: 2 minutes**

### 5. Testing Advantages

- Test generic component once with different schemas
- Schema validation prevents invalid configurations
- Easy to create test fixtures (just JSON schemas)
- Component behavior consistent across all use cases

---

## Other Generic Components

### Generic Document Upload Component

```typescript
// document-upload-wrapper uses schema to define:
interface DocumentSchema {
  documents: Array<{
    id: string;
    label: string;
    required: boolean;
    acceptedTypes: string[];  // ['application/pdf', 'image/*']
    maxSize: number;          // bytes
    helpText?: string;
  }>;
  allowMultiple: boolean;
  uploadLabel?: string;
}
```

```yaml
# YAML usage
- id: uploadIndividualDocs
  component_id: document-upload
  schema:
    documents:
      - id: id_document
        label: "Government-Issued ID"
        required: true
        acceptedTypes: ["image/*", "application/pdf"]
        maxSize: 5242880  # 5MB
        helpText: "Driver's license, passport, or national ID"
      - id: proof_of_address
        label: "Proof of Address"
        required: true
        acceptedTypes: ["application/pdf", "image/*"]
        maxSize: 5242880
        helpText: "Utility bill or bank statement (within 3 months)"
    allowMultiple: false
    uploadLabel: "Upload Documents"

- id: uploadCorporateDocs
  component_id: document-upload  # SAME component
  schema:
    documents:
      - id: business_registration
        label: "Certificate of Incorporation"
        required: true
        acceptedTypes: ["application/pdf"]
        maxSize: 10485760  # 10MB
      - id: tax_id
        label: "Tax ID Document"
        required: true
        acceptedTypes: ["application/pdf"]
        maxSize: 10485760
      - id: beneficial_ownership
        label: "Beneficial Ownership Declaration"
        required: true
        acceptedTypes: ["application/pdf"]
        maxSize: 10485760
    allowMultiple: true
    uploadLabel: "Upload Corporate Documents"
```

### Generic Data Table Component

```typescript
// data-table-wrapper uses schema to define:
interface TableSchema {
  columns: Array<{
    key: string;
    label: string;
    type: 'text' | 'number' | 'date' | 'status' | 'action';
    sortable?: boolean;
    filterable?: boolean;
  }>;
  actions?: Array<{
    id: string;
    label: string;
    icon?: string;
  }>;
  pagination?: boolean;
}
```

```yaml
# YAML usage
- id: reviewBeneficialOwners
  component_id: data-table
  schema:
    columns:
      - key: name
        label: "Owner Name"
        type: text
        sortable: true
        filterable: true
      - key: ownership_percentage
        label: "Ownership %"
        type: number
        sortable: true
      - key: date_of_birth
        label: "Date of Birth"
        type: date
        sortable: true
    actions:
      - id: edit
        label: "Edit"
        icon: "pencil"
      - id: delete
        label: "Remove"
        icon: "trash"
    pagination: true
```

---

## Summary

### The Core Principle

**Components = Behavior, Schemas = Data**

- **Don't create**: `individual-form`, `corporate-form`, `trust-form`
- **Do create**: `form` (one component handles all via schemas)

### Implementation Pattern

1. **Define schema types** (FieldSchema, DocumentSchema, TableSchema)
2. **Create generic components** that render based on schema
3. **YAML specifies both**: `component_id` (what) + `schema` (how)
4. **Action passes schema to component** via `data` prop
5. **Component renders dynamically** based on schema

### Benefits

- ✅ **Code reduction**: 70%+ less component code
- ✅ **Business user control**: Edit schemas in YAML without code changes
- ✅ **Consistency**: Same behavior across all workflows
- ✅ **Rapid iteration**: Add fields in minutes, not hours
- ✅ **Testing**: Test once, works everywhere

### Rule of Thumb

> **If components serve similar functionality but differ only in attributes/fields/configuration, use ONE schema-driven component instead of many specialized components.**

---

**Next**: Update decision log and task breakdown to reflect schema-driven architecture.
