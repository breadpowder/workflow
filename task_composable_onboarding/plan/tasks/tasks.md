# Task Breakdown (POC – Self-Hosted + YAML + Decoupled UI)

## 1) Self-Hosted CopilotKit Runtime
- Implement Next.js API route at `/api/copilotkit` using `@copilotkit/runtime` + `OpenAIAdapter`.
- Configure server-only `OPENAI_API_KEY`.
- Acceptance: UI connects via `runtimeUrl="/api/copilotkit"`; no public cloud keys used.

Example (Next.js App Router):
```ts
// app/api/copilotkit/route.ts
import { NextRequest } from 'next/server';
import {
  CopilotRuntime,
  OpenAIAdapter,
  copilotRuntimeNextJSAppRouterEndpoint,
} from '@copilotkit/runtime';
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const serviceAdapter = new OpenAIAdapter({ openai });
const runtime = new CopilotRuntime();

export const POST = async (req: NextRequest) => {
  const { handleRequest } = copilotRuntimeNextJSAppRouterEndpoint({
    runtime,
    serviceAdapter,
    endpoint: '/api/copilotkit',
  });
  return handleRequest(req);
};
```

## 2) YAML Loader and Interpreter
- Add YAML files under `data/composable_onboardings/*` with fake fields for corporate and individual flows.
- Build loader to select applicable composable_onboarding by `client_type` and `jurisdiction`.
- Implement engine helpers: `missingRequiredFields`, `nextStepId`.
- Acceptance: `GET /api/composable_onboardings?...` returns compiled machine with `initialStepId`.

## 3) Decoupled Actions and UI (Component Registry + Schema-Driven Components)

### Goal
Decouple business logic (actions) from presentation (UI components) AND use schema-driven generic components to maximize reusability.

**Key Principle**: Components = Behavior, Schemas = Data
- Instead of creating `individual-contact-form`, `corporate-contact-form`, `trust-contact-form`...
- Create ONE `form` component that accepts different schemas from YAML

### Implementation Steps

**A. Create Component Registry (`src/lib/ui/component-registry.ts`)**
```typescript
// Define standard interface all registry components must implement
interface RegistryComponentProps {
  data: any;                    // Contains: schema (from YAML) + initialValues (collected data)
  status: RenderFunctionStatus; // CopilotKit status (executing, complete, etc.)
  onComplete: (result: any) => void; // Callback when user completes the step
}

// LEAN registry - only GENERIC components
// Each component handles multiple use cases via schemas
const UI_COMPONENT_REGISTRY: Record<string, React.ComponentType<RegistryComponentProps>> = {
  'form': GenericFormWrapper,              // Handles ALL forms via FieldSchema[]
  'document-upload': GenericDocumentUploadWrapper,  // Handles ALL uploads via DocumentSchema
  'data-table': GenericDataTableWrapper,   // Handles ALL tables via TableSchema
  'review-summary': ReviewSummaryWrapper,  // Shows all collected data
};

export function getComponent(componentId: string): React.ComponentType<RegistryComponentProps> | null;
export function getAvailableComponentIds(): string[];
```

**B. Define Schema Types (`src/lib/types/field-schema.ts`)**
```typescript
export type FieldType = 'text' | 'email' | 'tel' | 'number' | 'date' | 'textarea' | 'select' | 'checkbox' | 'radio';

export interface FieldSchema {
  name: string;              // Field identifier (e.g., "legal_name")
  label: string;             // Display label (e.g., "Legal Business Name")
  type: FieldType;           // Input type
  required?: boolean;        // Validation: is field required?
  placeholder?: string;      // Placeholder text
  helpText?: string;         // Additional guidance
  validation?: {
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
  defaultValue?: any;
  visible?: string;          // Conditional visibility (e.g., "entity_type == 'Corporation'")
}

export interface FormSchema {
  fields: FieldSchema[];
  layout?: 'single-column' | 'two-column' | 'grid';
  submitLabel?: string;
  cancelLabel?: string;
}

export interface DocumentSchema {
  documents: Array<{
    id: string;
    label: string;
    required: boolean;
    acceptedTypes: string[];
    maxSize: number;
    helpText?: string;
  }>;
  allowMultiple?: boolean;
  uploadLabel?: string;
}
```

**C. Create Generic Form Wrapper**
Schema-driven wrapper that works with ANY form schema:
```typescript
// src/components/onboarding/generic-form-wrapper.tsx
import { GenericForm } from '@/components/ui/generic-form';
import { RegistryComponentProps } from '@/lib/ui/component-registry';

export function GenericFormWrapper({ data, status, onComplete }: RegistryComponentProps) {
  // Extract schema from YAML (passed via data)
  const schema = data.schema || { fields: [], layout: 'single-column' };
  const initialValues = data.initialValues || {};

  return (
    <GenericForm
      schema={schema}
      initialData={initialValues}
      isLoading={status === 'executing'}
      onSubmit={(formData) => {
        onComplete({ action: 'submit', data: formData });
      }}
      onCancel={() => {
        onComplete({ action: 'cancel', data: {} });
      }}
    />
  );
}
```

**D. Create Generic `renderUI` Action**
Replace individual stage actions with ONE generic action that passes schemas:
```typescript
import { useCopilotAction } from '@copilotkit/react-core';
import { getComponent, getAvailableComponentIds } from '@/lib/ui/component-registry';

useCopilotAction({
  name: "renderUI",
  description: "Render a schema-driven UI component to collect or display information",
  parameters: [
    {
      name: "componentId",
      type: "string",
      enum: getAvailableComponentIds(),
      description: "The generic component to render (form, document-upload, data-table, review-summary)",
      required: false  // Falls back to currentStep.component_id
    },
    {
      name: "data",
      type: "object",
      description: "Initial data to populate the component",
      required: false
    }
  ],
  renderAndWaitForResponse: ({ args, status, respond }) => {
    // Determine which component to render
    const componentId = args.componentId || currentStep?.component_id;
    const Component = getComponent(componentId);

    if (!Component) {
      respond?.(`Error: Unknown component ${componentId}`);
      return <ErrorView message={`Component not found: ${componentId}`} />;
    }

    // Prepare data with schema from YAML + initial values
    const componentData = {
      schema: currentStep?.schema,           // Schema from YAML workflow definition
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
            action: result.action,
            data: result.data,
            nextStepId: progression.nextStepId,
            missingFields: progression.missingFields
          }));
        }}
      />
    );
  }
});
```

**E. Update YAML to Specify Components AND Schemas**
Extend YAML schema to include `component_id` AND `schema`:
```yaml
steps:
  # Individual contact info
  - id: getIndividualContact
    task_ref: collect_contact_info
    component_id: form                    # Generic form component
    schema:                                # Schema defines fields dynamically
      fields:
        - name: full_name
          label: "Full Name"
          type: text
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
      layout: single-column
    required_fields: ["full_name", "email", "phone"]
    next:
      default: collectDocuments

  # Corporate contact info (SAME component, different schema!)
  - id: getCorporateContact
    task_ref: collect_contact_info
    component_id: form                    # SAME component!
    schema:                                # Different schema
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
        - name: business_email
          label: "Business Email"
          type: email
          required: true
        - name: business_phone
          label: "Business Phone"
          type: tel
          required: true
      layout: two-column
    required_fields: ["legal_name", "entity_type", "business_email", "business_phone"]
    next:
      default: collectDocuments
```

### Acceptance Criteria
- ✅ Registry exists with 3-5 **GENERIC** component mappings (form, document-upload, data-table, review-summary)
- ✅ Schema types defined (FieldSchema, FormSchema, DocumentSchema)
- ✅ `renderUI` action successfully renders components by ID and passes schemas
- ✅ No action directly imports UI components (all via registry)
- ✅ YAML specifies **BOTH** `component_id` AND `schema` for each step
- ✅ Same component (e.g., "form") works with different schemas (individual vs. corporate)
- ✅ Unit tests verify registry lookup, schema passing, and error handling

### Benefits Achieved
- **70% code reduction**: 3-5 generic components instead of 50+ specific ones
- **Business user control**: Add entity types by editing YAML schemas (5 minutes, not 2-4 hours)
- **Consistency**: Same validation, styling, behavior across all form variations
- **Rapid iteration**: Change field labels, add/remove fields without code deployment

## 4) Drive Transitions from YAML

### Goal
Replace hardcoded stage transitions with YAML-driven composable_onboarding engine that validates required fields and computes next steps dynamically.

### Implementation Steps

**A. Fetch Composable Onboarding on App Load**
```typescript
// In main component or global state provider
useEffect(() => {
  async function loadComposableOnboarding() {
    const params = new URLSearchParams({
      client_type: 'corporate', // or from user profile
      jurisdiction: 'US'
    });
    const res = await fetch(`/api/composable_onboardings?${params}`);
    const machine: RuntimeMachine = await res.json();

    setComposableOnboardingMachine(machine);
    setCurrentStepId(machine.initialStepId);
  }
  loadComposableOnboarding();
}, []);
```

**B. Create Composable Onboarding State Management Hook**
```typescript
// src/lib/composable_onboarding/use-composable_onboarding-state.ts
export function useComposableOnboardingState() {
  const [machine, setMachine] = useState<RuntimeMachine | null>(null);
  const [currentStepId, setCurrentStepId] = useState<string>('');
  const [collectedInputs, setCollectedInputs] = useState<Record<string, any>>({});

  // Get current step definition
  const currentStep = machine?.steps.find(s => s.id === currentStepId);

  // Check if current step can progress
  const canProgress = () => {
    if (!currentStep) return false;
    const missing = missingRequiredFields(currentStep, collectedInputs);
    return missing.length === 0;
  };

  // Transition to next step
  const progressToNextStep = () => {
    if (!currentStep || !canProgress()) {
      return { success: false, reason: 'Missing required fields' };
    }

    const nextId = nextStepId(currentStep, collectedInputs);
    setCurrentStepId(nextId);
    return { success: true, nextStepId: nextId };
  };

  // Update collected inputs
  const updateInputs = (newData: Record<string, any>) => {
    setCollectedInputs(prev => ({ ...prev, ...newData }));
  };

  return {
    machine,
    currentStep,
    currentStepId,
    collectedInputs,
    canProgress,
    progressToNextStep,
    updateInputs,
    missingFields: currentStep ? missingRequiredFields(currentStep, collectedInputs) : []
  };
}
```

**C. Wire Actions to Use Composable Onboarding Engine**
```typescript
// In component that registers useCopilotAction
import { useCopilotAction, useCopilotReadable } from '@copilotkit/react-core';
const { currentStep, updateInputs, progressToNextStep, missingFields } = useComposableOnboardingState();

// Add context for AI to understand current step requirements
useCopilotReadable({
  description: "Current onboarding step and requirements",
  value: {
    stepId: currentStep?.id,
    taskRef: currentStep?.task_ref,
    requiredFields: currentStep?.required_fields,
    missingFields: missingFields,
    componentId: currentStep?.component_id
  }
});

// Render UI based on current step's component_id
useCopilotAction({
  name: "renderUI",
  renderAndWaitForResponse: ({ args, status, respond }) => {
    // Get component from current step definition
    const componentId = currentStep?.component_id || args.componentId;
    const Component = getComponent(componentId);

    return (
      <Component
        data={args.data}
        status={status}
        onComplete={(result) => {
          // Update collected inputs
          updateInputs(result.data);

          // Try to progress
          const progression = progressToNextStep();
          if (progression.success) {
            respond?.(`Progressed to step: ${progression.nextStepId}`);
          } else {
            respond?.(`Cannot progress: ${progression.reason}. Missing: ${missingFields.join(', ')}`);
          }
        }}
      />
    );
  }
});
```

**D. Add Transition Action for AI Control**
```typescript
// Allow AI to explicitly trigger transitions
useCopilotAction({
  name: "transitionToNextStep",
  description: "Attempt to move to the next step in the composable_onboarding. Only call after all required fields are collected.",
  available: canProgress() ? "enabled" : "disabled",
  handler: () => {
    const result = progressToNextStep();
    if (result.success) {
      return `Successfully moved to step: ${result.nextStepId}`;
    } else {
      return `Cannot transition: ${result.reason}. Still need: ${missingFields.join(', ')}`;
    }
  }
});
```

**E. Extend YAML Schema with Component ID**
Update `src/server/composable_onboarding/schema.ts`:
```typescript
export interface Composable OnboardingStep {
  id: string;
  task_ref: string;
  component_id?: string;  // NEW: UI component to render
  required_fields?: string[];
  next: {
    conditions?: Composable OnboardingStepNextCondition[];
    default: string;
  };
}
```

**F. Update Example YAML Files**
```yaml
# data/composable_onboardings/corporate_v1.yaml
steps:
  - id: collectContactInfo
    task_ref: collect_contact_info
    component_id: contact-form
    required_fields: ["legal_name", "contact_email", "contact_phone"]
    next:
      default: collectDocuments

  - id: collectDocuments
    task_ref: collect_business_documents
    component_id: document-upload
    required_fields: [
      "business_registration_certificate",
      "tax_identification_number",
      "proof_of_address"
    ]
    next:
      conditions:
        - when: "risk_score > 70"
          then: enhancedDueDiligence
      default: review
```

### Acceptance Criteria
- ✅ Composable Onboarding machine fetched from `/api/composable_onboardings` on load
- ✅ UI initializes to `initialStepId` from YAML
- ✅ Transitions use `nextStepId()` engine helper
- ✅ Required fields validated via `missingRequiredFields()`
- ✅ Blocked transitions show clear error messages
- ✅ Conditional transitions work (e.g., `risk_score > 70`)
- ✅ Unit tests for composable_onboarding state management hook
- ✅ Integration test: complete composable_onboarding end-to-end

## 5) UI Implementation - Three-Pane Layout

### Goal
Implement the three-pane onboarding interface based on the approved mockup with improved color scheme and professional design.

### Reference
- **Mockup**: `/home/zineng/workspace/explore_copilotkit/onboarding-mockup-with-form.excalidraw`
- **Design System**: `task_composable_onboarding/plan/design-system.md`

### Implementation Steps

**A. Set Up Design System**
1. Install Tailwind CSS and configure with custom color tokens
2. Choose color scheme (Recommended: Professional Financial palette)
3. Configure typography and spacing system
4. Set up design tokens in CSS custom properties

```bash
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

**B. Create Layout Components**

```typescript
// src/components/layout/three-pane-layout.tsx
export function ThreePaneLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen bg-gray-50">
      {/* Will contain: LeftPane, MiddlePane, RightPane */}
      {children}
    </div>
  );
}

// src/components/layout/left-pane.tsx - Clients List
export function LeftPane() {
  return (
    <aside className="w-[316px] bg-gray-50 border-r border-gray-200 flex flex-col">
      {/* Search box */}
      {/* Corporate folder */}
      {/* Individual folder */}
    </aside>
  );
}

// src/components/layout/middle-pane.tsx - Presentation
export function MiddlePane({ client }: { client: ClientProfile }) {
  return (
    <main className="flex-1 bg-white overflow-y-auto p-6">
      {/* Client header */}
      {/* Profile section */}
      {/* Required fields section */}
      {/* Timeline section */}
    </main>
  );
}

// src/components/layout/right-pane.tsx - Form + Chat
export function RightPane() {
  return (
    <aside className="w-[476px] bg-gray-50 border-l border-gray-200 flex flex-col">
      {/* Form section (top) */}
      {/* Chat section (bottom) */}
    </aside>
  );
}
```

**C. Build Presentation Components (MiddlePane)**

```typescript
// src/components/onboarding/profile-section.tsx
export function ProfileSection({ profile }: { profile: ClientProfile }) {
  return (
    <div className="bg-gray-50 border border-gray-200 rounded-md p-5 mb-5">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Profile</h3>
      <ul className="space-y-2 text-sm text-gray-700">
        <li>• Email: {profile.email}</li>
        <li>• Risk: {profile.risk}</li>
        <li>• Entity Type: {profile.entityType}</li>
        <li>• Jurisdiction: {profile.jurisdiction}</li>
      </ul>
    </div>
  );
}

// src/components/onboarding/required-fields-section.tsx
export function RequiredFieldsSection({ fields }: { fields: RequiredField[] }) {
  return (
    <div className="bg-white border border-gray-200 rounded-md p-5 mb-5">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Required Fields</h3>
      <div className="space-y-2">
        {fields.map(field => (
          <FieldStatus
            key={field.id}
            name={field.name}
            status={field.status}
            value={field.value}
          />
        ))}
      </div>
    </div>
  );
}

// src/components/onboarding/field-status.tsx
export function FieldStatus({ name, status, value }: FieldStatusProps) {
  const bgColor = status === 'completed' ? 'bg-green-50 border-green-300' : 'bg-yellow-50 border-yellow-300';
  const textColor = status === 'completed' ? 'text-green-900' : 'text-yellow-900';
  const icon = status === 'completed' ? '☑' : '☐';

  return (
    <div className={`flex items-center gap-2 px-3 py-2 border rounded ${bgColor}`}>
      <span className={textColor}>{icon}</span>
      <span className={`text-sm ${textColor}`}>
        {name} {value && `(${value})`} {status === 'pending' && '(pending)'}
      </span>
    </div>
  );
}

// src/components/onboarding/timeline-section.tsx
export function TimelineSection({ events }: { events: TimelineEvent[] }) {
  return (
    <div className="bg-gray-50 border border-gray-200 rounded-md p-5">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Timeline</h3>
      <ul className="space-y-2 text-sm text-gray-700">
        {events.map(event => (
          <li key={event.id}>• {event.timestamp} - {event.description}</li>
        ))}
      </ul>
    </div>
  );
}
```

**D. Build Form Components (RightPane Top)**

```typescript
// src/components/onboarding/business-info-form.tsx
export function BusinessInfoForm({ onSubmit }: BusinessInfoFormProps) {
  return (
    <div className="bg-white border border-gray-200 rounded-md p-5">
      <h3 className="text-base font-semibold text-gray-900 mb-4">
        Business Information Form
      </h3>

      <form onSubmit={onSubmit} className="space-y-4">
        <FormField
          label="Business Registration Number"
          required
          placeholder="Enter registration number..."
        />

        <FormField
          label="Tax ID"
          required
          placeholder="Enter tax ID..."
        />

        <FormField
          label="Business Address"
          required
          type="textarea"
          placeholder="Street address&#10;City, State, ZIP&#10;Country"
        />

        <div className="flex gap-3 pt-2">
          <button
            type="button"
            className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 text-sm font-medium
                       rounded-md border border-gray-400 hover:bg-gray-200"
          >
            Save Draft
          </button>
          <button
            type="submit"
            className="flex-1 px-4 py-2 bg-blue-600 text-white text-sm font-medium
                       rounded-md hover:bg-blue-700"
          >
            Submit
          </button>
        </div>
      </form>

      <p className="text-xs text-gray-600 mt-3">* Required fields</p>
    </div>
  );
}

// src/components/ui/form-field.tsx
export function FormField({ label, required, type = 'text', placeholder }: FormFieldProps) {
  const InputComponent = type === 'textarea' ? 'textarea' : 'input';

  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-gray-900">
        {label} {required && '*'}
      </label>
      <InputComponent
        type={type === 'textarea' ? undefined : type}
        rows={type === 'textarea' ? 4 : undefined}
        placeholder={placeholder}
        className="w-full px-3 py-2 border border-gray-300 rounded-md text-xs
                   placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
    </div>
  );
}
```

**E. Build Chat Components (RightPane Bottom)**

```typescript
// src/components/chat/chat-panel.tsx
export function ChatPanel({ messages, onSendMessage }: ChatPanelProps) {
  return (
    <div className="flex-1 bg-gray-50 border-t border-gray-200 flex flex-col p-5">
      <h3 className="text-sm font-semibold text-gray-900 mb-3">Chat Messages</h3>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-3 mb-4">
        {messages.map(msg => (
          <ChatMessage key={msg.id} message={msg} />
        ))}
      </div>

      {/* Input */}
      <div className="flex gap-2">
        <input
          type="text"
          placeholder="Type a message..."
          className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-xs
                     placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button className="px-4 py-2 bg-blue-600 text-white text-xs font-medium rounded-md hover:bg-blue-700">
          Send
        </button>
      </div>
    </div>
  );
}

// src/components/chat/chat-message.tsx
export function ChatMessage({ message }: { message: Message }) {
  const isAI = message.sender === 'ai';
  const bgClass = isAI ? 'bg-blue-50 border-blue-500' : 'bg-white border-gray-300';
  const textClass = isAI ? 'text-blue-900' : 'text-gray-900';

  return (
    <div className={`px-3 py-2 border rounded-md ${bgClass}`}>
      <p className={`text-xs whitespace-pre-wrap ${textClass}`}>
        {isAI ? 'AI: ' : 'User: '}{message.text}
      </p>
    </div>
  );
}
```

### Acceptance Criteria
- ✅ Three-pane layout matches mockup structure
- ✅ Responsive design (collapsible on <1024px)
- ✅ Professional Financial color scheme applied
- ✅ All text readable with proper contrast (WCAG AA)
- ✅ Form inputs have proper focus states
- ✅ Status indicators use color + icons (accessible)
- ✅ Chat messages styled correctly (AI vs User)
- ✅ Buttons have hover/active states
- ✅ Design system documented and reusable

---

## 6) Integration - Wire UI to CopilotKit

### Goal
Connect the UI components to the CopilotKit workflow engine and component registry.

### Implementation Steps

**0. Wrap App with CopilotKit Provider**
```tsx
// app/layout.tsx
import { CopilotKit } from '@copilotkit/react-core';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <CopilotKit runtimeUrl="/api/copilotkit">{children}</CopilotKit>
      </body>
    </html>
  );
}
```

**A. Register UI Components**
```typescript
// src/lib/ui/component-registry.ts
import { BusinessInfoForm } from '@/components/onboarding/business-info-form';

const UI_COMPONENT_REGISTRY: Record<string, React.ComponentType<RegistryComponentProps>> = {
  'business-info-form': BusinessInfoFormWrapper,
  'document-upload': DocumentUploadWrapper,
  'review-summary': ReviewSummaryWrapper,
};

function BusinessInfoFormWrapper({ data, status, onComplete }: RegistryComponentProps) {
  return (
    <BusinessInfoForm
      initialData={data}
      onSubmit={(formData) => {
        onComplete({ action: 'submit', data: formData });
      }}
    />
  );
}
```

**B. Wire MiddlePane to Workflow State**
```typescript
// src/app/page.tsx or main component
const { currentStep, collectedInputs, missingFields } = useComposableOnboardingState();

return (
  <ThreePaneLayout>
    <LeftPane />
    <MiddlePane
      client={{
        name: collectedInputs.legal_name || 'Acme Corp',
        email: collectedInputs.contact_email,
        risk: calculateRiskScore(collectedInputs),
        // ...
      }}
      requiredFields={currentStep?.required_fields?.map(field => ({
        name: field,
        status: collectedInputs[field] ? 'completed' : 'pending',
        value: collectedInputs[field]
      }))}
    />
    <RightPane />
  </ThreePaneLayout>
);
```

**C. Connect Chat to CopilotKit**
```typescript
// Use useCopilotChat hook (if available) or build custom chat integration
import { useCopilotChat } from '@copilotkit/react-core';
const { messages, sendMessage } = useCopilotChat();

<ChatPanel messages={messages} onSendMessage={sendMessage} />
```

### Acceptance Criteria
- ✅ Form submission updates `collectedInputs`
- ✅ MiddlePane reflects current workflow state
- ✅ Required fields update in real-time
- ✅ Timeline shows workflow events
- ✅ Chat integrated with CopilotKit
- ✅ AI can trigger form renders via `renderUI` action

---

## 7) Documentation
- Update developer docs for self-hosting and YAML authoring patterns.
- Document design system and component usage.
- Add mockup reference and design rationale.
- Acceptance: A new contributor can follow docs to run POC end-to-end.
