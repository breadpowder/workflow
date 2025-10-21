# Decision Log - Composable Onboarding Composable Onboardings POC

## Overview
This document records key architectural and implementation decisions made during the planning phase of the Composable Onboarding Composable Onboardings POC.

---

## D1: Project Structure - Standalone vs. Modify Example

**Date:** 2025-10-21
**Status:** ✅ Decided
**Decision:** Create new standalone Next.js project

**Options Considered:**

### Option A: Modify Existing copilot-state-machine Example
**Pros:**
- YAML loader and engine already implemented
- Self-hosted runtime already configured
- Saves initial setup time

**Cons:**
- Tightly coupled to car sales domain
- Hardcoded stages still present
- Would require significant refactoring
- Mixing POC with example code
- Harder to extract and deploy separately

### Option B: Create New Standalone Project ✅ SELECTED
**Pros:**
- Clean slate aligned with financial onboarding domain
- No legacy coupling to remove
- Easier to understand as complete reference implementation
- Can be independently deployed and maintained
- Better demonstrates production-ready structure

**Cons:**
- Requires reimplementing YAML engine (can copy with attribution)
- More initial setup work
- Duplicate some CopilotKit boilerplate

**Rationale:**
The POC is meant to demonstrate a production-ready pattern for composable composable_onboardings. Starting fresh allows us to build exactly what we need without fighting existing abstractions. The extra setup time (≈30 min) is worth the clarity and maintainability gains.

**Context7 Reference:**
- CopilotKit documentation: `/copilotkit/copilotkit` - State machine patterns and self-hosting

---

## D2: Domain Selection - Car Sales vs. Financial Onboarding

**Date:** 2025-10-21
**Status:** ✅ Decided
**Decision:** Use financial services onboarding (corporate/individual)

**Options Considered:**

### Option A: Keep Car Sales Domain
**Pros:**
- Can reuse existing UI components as reference
- Well-understood domain
- Simple data model

**Cons:**
- Doesn't match actual use case (onboarding)
- Missing compliance concepts (KYC/AML, EDD)
- Less relevant to target users

### Option B: Financial Onboarding (Corporate/Individual) ✅ SELECTED
**Pros:**
- Matches actual business requirements
- Demonstrates compliance composable_onboardings (risk scoring, EDD)
- Shows value of conditional branching (risk_score > 70)
- Realistic multi-step process
- Different composable_onboardings for different client types

**Cons:**
- More domain-specific concepts
- Requires understanding of KYC/AML basics

**Rationale:**
The POC should demonstrate real-world value. Financial onboarding showcases the key benefits: different composable_onboardings per segment, compliance-driven conditional logic, and required field enforcement. This makes the POC more compelling to stakeholders.

**External Reference:**
- KYC/AML regulations require different due diligence based on risk assessment
- Enhanced Due Diligence (EDD) triggered for high-risk clients
- Beneficial ownership disclosure requirements for corporate entities

---

## D3: Component Decoupling Strategy

**Date:** 2025-10-21
**Status:** ✅ Decided
**Decision:** Component Registry Pattern (Medium Decoupling)

**Options Considered:**

### Option A: Hardcoded Action → Component Coupling
**Pros:**
- Simple to implement
- Strong type safety
- Easy to debug

**Cons:**
- No flexibility - one action per component
- Cannot reuse actions across components
- YAML cannot control UI rendering

### Option B: Component Registry Pattern ✅ SELECTED
**Pros:**
- YAML controls which component renders (`component_id`)
- Moderate complexity
- Still type-safe through registry interface
- Easy to add new components
- Decouples business logic from presentation
- Supports multiple UI variations for same action

**Cons:**
- Requires registry infrastructure
- One level of indirection
- Wrapper components needed

### Option C: Schema-Based Dynamic UI
**Pros:**
- Maximum AI flexibility
- Novel UI compositions possible

**Cons:**
- High complexity
- Difficult to type-check
- Security concerns (XSS)
- Over-engineered for POC

**Rationale:**
Component Registry strikes the right balance for the POC. It demonstrates decoupling without excessive complexity. YAML can specify `component_id`, allowing business users to control UI without code changes, while maintaining developer control over the available components.

**Context7 Reference:**
- Analysis from `knowledge_base/code_analysis_03_decoupling_ui_components.md`
- CopilotKit `useCopilotAction` with `renderAndWaitForResponse` pattern

---

## D4: Testing Strategy - Coverage Level

**Date:** 2025-10-21
**Status:** ✅ Decided
**Decision:** Moderate - Unit tests for engine + integration test

**Options Considered:**

### Option A: Minimal - Manual Testing Only
**Pros:**
- Fastest to build
- No test infrastructure needed

**Cons:**
- No regression protection
- Hard to verify edge cases
- Not production-ready

### Option B: Moderate - Unit + Integration Tests ✅ SELECTED
**Pros:**
- Validates core engine logic
- Integration test proves E2E flow
- Catches regressions
- Demonstrates quality standards
- Reasonable time investment

**Cons:**
- Requires test setup
- Adds ~2 hours to implementation

### Option C: Comprehensive - Full Test Suite (80%+ coverage)
**Pros:**
- Maximum confidence
- Production-ready quality

**Cons:**
- Significant time investment (4-6 hours)
- Over-engineered for POC
- Diminishing returns for demo

**Rationale:**
Unit tests for the composable_onboarding engine (expression evaluation, field validation, transitions) are critical since that's the core innovation. One integration test proves the complete composable_onboarding executes correctly. This provides sufficient quality assurance without excessive overhead.

**Target Coverage:**
- Composable Onboarding engine: >90%
- Component registry: >80%
- Integration: E2E happy path + conditional branching

---

## D5: YAML Schema Extension - Component ID Placement

**Date:** 2025-10-21
**Status:** ✅ Decided
**Decision:** Add `component_id` field directly to Composable OnboardingStep

**Options Considered:**

### Option A: Component ID in Step Definition ✅ SELECTED
```yaml
steps:
  - id: collectContactInfo
    task_ref: collect_contact_info
    component_id: contact-form  # ← HERE
    required_fields: [...]
```
**Pros:**
- Clear and explicit
- Easy to parse
- Validates with TypeScript schema
- One component per step (simple mental model)

**Cons:**
- Slightly verbose
- Duplicates component ID if reused

### Option B: Component ID in Separate Mapping
```yaml
component_mapping:
  collectContactInfo: contact-form
  collectDocuments: document-upload
```
**Pros:**
- Centralized mapping
- Easier to bulk-update components

**Cons:**
- Indirection makes YAML harder to read
- Disconnected from step definition
- Extra lookup layer

**Rationale:**
Keeping `component_id` with the step definition makes the YAML self-documenting and easier for business users to understand. Each step clearly states what task it performs and how it's presented. This aligns with the goal of business-user-editable composable_onboardings.

---

## D6: Composable Onboarding Loading Strategy - File-Based vs. Database

**Date:** 2025-10-21
**Status:** ✅ Decided
**Decision:** File-based YAML loading (with future database path)

**Options Considered:**

### Option A: File-Based YAML Loading ✅ SELECTED
**Pros:**
- Simple for POC
- Git-friendly (version control)
- Easy to edit
- No database dependency
- Fast development iteration

**Cons:**
- Not suitable for runtime editing
- No audit trail
- Harder to add governance (approval composable_onboardings)

### Option B: Database-Backed Storage
**Pros:**
- Supports runtime editing
- Audit trail built-in
- Can add approval composable_onboardings
- Better for production

**Cons:**
- Requires database setup
- More complexity for POC
- Slower iteration during development

**Rationale:**
For the POC, file-based YAML is sufficient and faster to develop. It demonstrates the core concept while staying out of scope for governance features. The architecture supports migrating to database storage later without changing the runtime engine or API contracts.

**Migration Path:**
```typescript
// Current: loadComposable Onboardings() reads from filesystem
// Future: loadComposable Onboardings() reads from database
// API contract remains: GET /api/composable_onboardings?client_type=...&jurisdiction=...
```

---

## D7: Error Handling Strategy

**Date:** 2025-10-21
**Status:** ✅ Decided
**Decision:** Graceful degradation with fallback composable_onboardings

**Strategy:**

**YAML Loading Errors:**
- Invalid YAML syntax → Skip file, log warning, continue
- Schema validation failure → Skip file, log warning, continue
- No composable_onboardings found → Return 404 from API

**Composable Onboarding Selection:**
- No matching composable_onboarding → Fallback to first available composable_onboarding
- No composable_onboardings at all → Return 404 with clear error message

**Component Registry:**
- Unknown component_id → Render error component, respond to AI with error
- Missing component_id → Use default error component

**Transition Failures:**
- Missing required fields → Block progression, return specific missing fields
- Invalid expression → Log error, treat as false, use default transition

**Rationale:**
Graceful degradation keeps the system operational even with partial failures. Business users can fix YAML errors incrementally without breaking the entire system. Clear error messages help debug issues quickly.

---

## D8: CopilotKit Action Design - Single vs. Multiple

**Date:** 2025-10-21
**Status:** ✅ Decided
**Decision:** Single generic `renderUI` action with component registry

**Options Considered:**

### Option A: Individual Actions per Step
```typescript
useCopilotAction({ name: "showContactForm", ... });
useCopilotAction({ name: "showDocumentUpload", ... });
useCopilotAction({ name: "showEDDQuestionnaire", ... });
```
**Pros:**
- Specific descriptions per action
- Clear to AI what each does

**Cons:**
- Action proliferation
- Cannot add new steps without code changes
- Violates DRY principle

### Option B: Single Generic `renderUI` Action ✅ SELECTED
```typescript
useCopilotAction({
  name: "renderUI",
  parameters: [{ name: "componentId", enum: [...] }],
  renderAndWaitForResponse: ({ args }) => {
    const Component = getComponent(args.componentId);
    return <Component ... />;
  }
});
```
**Pros:**
- One action handles all UI rendering
- Adding new components doesn't require new actions
- Scales with YAML additions
- Cleaner codebase

**Cons:**
- Less specific AI guidance
- Requires registry lookup

**Rationale:**
The single action design aligns with the goal of YAML-driven extensibility. Business users can add new steps with new `component_id` values, and as long as developers add the component to the registry, no action code changes are needed. The AI receives sufficient guidance through the `useCopilotReadable` context.

**Context7 Reference:**
- CopilotKit `useCopilotAction` documentation: `/copilotkit/copilotkit`
- Generative UI patterns with `renderAndWaitForResponse`

---

## D9: State Management - Hook vs. Context vs. Global Store

**Date:** 2025-10-21
**Status:** ✅ Decided
**Decision:** Custom hook (`useComposable OnboardingState`) with local state

**Options Considered:**

### Option A: Custom Hook with useState ✅ SELECTED
```typescript
const { currentStep, updateInputs, progressToNextStep } = useComposable OnboardingState();
```
**Pros:**
- Simple and focused
- No additional dependencies
- Easy to test
- Encapsulates composable_onboarding logic

**Cons:**
- State isolated to component tree
- Not global (but not needed for POC)

### Option B: React Context Provider
**Pros:**
- Global state access
- Can consume from any component

**Cons:**
- Over-engineered for POC
- More boilerplate
- Harder to test

### Option C: External Store (Zustand/Redux)
**Pros:**
- Powerful state management
- DevTools integration

**Cons:**
- Overkill for POC
- Additional dependency
- Learning curve

**Rationale:**
A custom hook provides just enough state management for the POC. It encapsulates composable_onboarding logic cleanly, is easy to test, and doesn't require additional dependencies. If the POC scales to multiple components needing composable_onboarding state, we can wrap it in Context later without changing the hook API.

---

## Summary of Key Decisions

| Decision | Chosen Option | Impact |
|----------|---------------|--------|
| Project Structure | Standalone project | Clean implementation, easier to deploy |
| Domain | Financial onboarding | Realistic use case, better demo |
| Component Decoupling | Registry pattern | YAML controls UI, maintainable |
| Testing | Moderate (unit + integration) | Quality without excessive overhead |
| YAML Schema | component_id in step | Self-documenting, business-friendly |
| Composable Onboarding Loading | File-based | Simple for POC, migration path exists |
| Error Handling | Graceful degradation | Operational resilience |
| CopilotKit Actions | Single renderUI action | Scalable, extensible |
| State Management | Custom hook | Simple, testable, sufficient |

---

## D10: UI Design - Mockup-Based Three-Pane Layout

**Date:** 2025-10-21
**Status:** ✅ Decided
**Decision:** Three-pane layout with improved color scheme based on approved mockup

**Reference Mockup:**
- **Location**: `/home/zineng/workspace/explore_copilotkit/onboarding-mockup-with-form.excalidraw`
- **Screenshot**: Provided mockup showing Clients | Presentation | Form + Chat layout
- **Total Elements**: 64 elements across three panes

**Design Rationale:**

### Layout Structure
The three-pane design provides:
1. **LeftPane (316px)** - Client selection and navigation
2. **MiddlePane (648px)** - Current client state presentation (profile, fields, timeline)
3. **RightPane (476px)** - Interactive form + AI chat interface

**Pros:**
- Contextual awareness: Users see client info while filling forms
- Efficient workflow: No page switching required
- AI guidance: Chat provides real-time assistance
- Status transparency: Timeline shows progress immediately
- Desktop-optimized: Leverages wide screens effectively

**Cons:**
- Requires minimum 1024px width
- More complex responsive implementation
- Higher initial development time vs single-pane

### Color Scheme Options Evaluated

**Current Mockup Colors (Bootstrap-inspired):**
- Primary: #0d6efd (Blue)
- Success: #28a745 (Green)
- Warning: #ffc107 (Yellow)
- Danger: #dc3545 (Red)
- **Assessment**: Good baseline but lacks visual refinement for financial services

**Option 1: Professional Financial Palette** ✅ SELECTED
- Primary: #1e40af (Deep Blue) - Trust, stability
- Accent: #14b8a6 (Teal) - Modern, approachable
- Success: #10b981 (Emerald)
- Warning: #f59e0b (Amber)
- Danger: #ef4444 (Rose)

**Option 2: Modern SaaS Palette**
- Primary: #6366f1 (Indigo)
- Accent: #a855f7 (Purple)
- **Assessment**: Too playful for financial services context

**Option 3: Warm & Approachable Palette**
- Primary: #3b82f6 (Blue)
- Accent: #f97316 (Orange)
- **Assessment**: Less formal than required for finance

**Rationale**: The Professional Financial palette conveys professionalism and trustworthiness expected in financial services while maintaining modern appeal. The deep blue primary color suggests stability and reliability—critical attributes for financial onboarding. This palette also ensures WCAG 2.1 AA contrast ratios across all component states.

### Typography & Spacing

**Font Stack**: System fonts for performance and native feel
```
-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', Arial
```

**Type Scale** (aligned with mockup):
- Display: 24px (client names, page titles)
- Headings: 18px (section headers)
- Body: 14px (most content)
- Small: 12px (labels, notes)
- Micro: 10px (timestamps)

**Spacing System**: 8px grid for consistency
- Component padding: 20px
- Field gaps: 20px
- Section spacing: 24px

### Component Design Decisions

**Status Indicators** - Dual encoding (accessible):
- Icons (☐/☑) + Color (yellow/green)
- Never rely on color alone
- Clear text labels for screen readers

**Chat Messages** - Visual distinction:
- AI: Blue background (#e7f3ff) with blue border
- User: White background with gray border
- Font size: 11-12px for compact display

**Form Inputs** - Professional styling:
- Border: #ced4da (subtle)
- Focus ring: 2px blue (#0d6efd)
- Placeholder: #adb5bd (muted)
- Compact sizing for space efficiency

### Accessibility Compliance

**WCAG 2.1 AA Standards:**
- Minimum contrast ratio 4.5:1 for normal text
- Minimum contrast ratio 3:1 for large text and UI components
- Visible focus indicators on all interactive elements
- Color-independent information encoding

**Implementation Requirements:**
- All inputs have associated labels
- Focus states clearly visible
- Keyboard navigation fully supported
- Status conveyed through text + color

### Technology Choice

**Selected: Tailwind CSS** ✅

**Pros:**
- Utility-first approach matches mockup precision
- Excellent responsive design utilities
- Consistent spacing/sizing system
- No runtime CSS-in-JS overhead
- Strong TypeScript support
- Customizable design tokens

**Cons:**
- Longer class names
- Learning curve for team

**Alternatives Considered:**
- **CSS Modules**: More verbose, harder to maintain consistency
- **Styled Components**: Runtime overhead, harder to theme
- **Vanilla CSS**: Too much custom code, inconsistency risk

### Responsive Strategy

**Breakpoint**: 1024px
- **≥ 1024px**: Show all three panes side-by-side (default)
- **< 1024px**: Stack panes vertically, collapsible sidebar

**Future Consideration**: Mobile-specific view with tabbed navigation

---

## D11: Component Organization - Mockup-Driven Structure

**Date:** 2025-10-21
**Status:** ✅ Decided
**Decision**: Organize components by pane/feature area with shared UI primitives

**Directory Structure:**
```
src/components/
├── layout/          # Three-pane structure
│   ├── three-pane-layout.tsx
│   ├── left-pane.tsx
│   ├── middle-pane.tsx
│   └── right-pane.tsx
├── onboarding/      # Business domain components
│   ├── profile-section.tsx
│   ├── required-fields-section.tsx
│   ├── timeline-section.tsx
│   ├── field-status.tsx
│   └── business-info-form.tsx
├── chat/            # Chat-specific components
│   ├── chat-panel.tsx
│   └── chat-message.tsx
└── ui/              # Reusable primitives
    ├── form-field.tsx
    ├── button.tsx
    └── card.tsx
```

**Rationale:**
- Clear separation of concerns
- Reusable UI primitives
- Easy to locate components by pane
- Aligns with mockup structure

**Design System Location:**
- `task_composable_onboarding/plan/design-system.md` - Comprehensive guide
- `tailwind.config.js` - Token configuration
- `src/styles/globals.css` - CSS custom properties

---

## D12: Schema-Driven Component Reusability

**Date:** 2025-10-21
**Status:** ✅ Decided
**Decision:** Components must accept dynamic schemas instead of hardcoding fields

**Core Principle:**
> **Components = Behavior, Schemas = Data**
>
> One component should handle multiple use cases by accepting dynamic field/attribute definitions rather than creating separate components for similar functionality.

### The Requirement

**❌ Anti-Pattern**: Creating multiple components for similar functionality
```typescript
// DON'T DO THIS
const UI_COMPONENT_REGISTRY = {
  'individual-contact-form': IndividualContactFormWrapper,  // name, email, phone
  'corporate-contact-form': CorporateContactFormWrapper,    // legal_name, entity_type, business_email, jurisdiction
  'trust-contact-form': TrustContactFormWrapper,            // trust_name, trustee_email, formation_date
};
```

**Problems**:
- Code duplication (3 forms, all collecting contact info)
- Maintenance nightmare (bug fix needs 3 updates)
- Registry bloat (10 entity types × 5 forms = 50 components)
- YAML can't adapt forms (each needs dedicated component)

**✅ Correct Pattern**: Schema-driven components
```typescript
// DO THIS
const UI_COMPONENT_REGISTRY = {
  'form': GenericFormWrapper,              // Handles ALL forms via schema
  'document-upload': GenericDocumentUploadWrapper,  // Handles ALL uploads via schema
  'data-table': GenericDataTableWrapper,   // Handles ALL tables via schema
};
```

**Benefits**:
- Single source of truth (one component, one implementation)
- Easy maintenance (fix once, works everywhere)
- Registry stays lean (3 components instead of 50)
- YAML defines schemas (full flexibility without code changes)

### Options Considered

#### Option A: Dedicated Component per Use Case
```yaml
# Individual workflow uses individual-specific component
- id: collectIndividualContact
  component_id: individual-contact-form

# Corporate workflow uses corporate-specific component
- id: collectCorporateContact
  component_id: corporate-contact-form
```

**Pros:**
- Simple to implement initially
- Type-safe per use case
- Clear component naming

**Cons:**
- Massive code duplication
- Hard to maintain consistency
- Cannot adapt without code changes
- Registry grows linearly with variations

#### Option B: Schema-Driven Components ✅ SELECTED
```yaml
# Individual workflow configures generic form via schema
- id: collectIndividualContact
  component_id: form
  schema:
    fields:
      - { name: full_name, label: "Full Name", type: text, required: true }
      - { name: email, label: "Email", type: email, required: true }
      - { name: phone, label: "Phone", type: tel, required: true }

# Corporate workflow uses SAME component with different schema
- id: collectCorporateContact
  component_id: form
  schema:
    fields:
      - { name: legal_name, label: "Legal Business Name", type: text, required: true }
      - { name: entity_type, label: "Entity Type", type: select, required: true, options: [...] }
      - { name: jurisdiction, label: "Jurisdiction", type: select, required: true, options: [...] }
      - { name: business_email, label: "Business Email", type: email, required: true }
```

**Pros:**
- One component handles unlimited variations
- YAML controls field definitions
- Business users can modify schemas
- 70%+ code reduction
- Consistent behavior across all forms

**Cons:**
- More complex initial implementation
- Schema validation required
- Less type safety (fields defined at runtime)

### Rationale

The schema-driven approach is essential for true YAML-driven workflows. Business users should be able to:
- Add new entity types without developer involvement
- Modify field labels, help text, placeholders
- Change field order and layout
- Add/remove fields from workflows
- Implement conditional field visibility

**All via YAML edits - no code deployment needed.**

**Rule of Thumb:**
> If components serve similar functionality but differ only in attributes/fields/configuration, use ONE schema-driven component instead of many specialized components.

### Examples of Schema-Driven Components

**Generic Form Component:**
- Renders any form based on field schema
- Handles: text, email, tel, number, date, textarea, select, checkbox, radio, file
- Supports: validation, conditional visibility, layouts, custom labels
- Use cases: Contact forms, questionnaires, profile editors, settings panels

**Generic Document Upload Component:**
- Accepts schema defining required documents
- Configurable: file types, size limits, descriptions, drag-and-drop
- Use cases: Individual docs, corporate docs, compliance docs

**Generic Data Table Component:**
- Accepts schema defining columns and actions
- Configurable: sorting, filtering, pagination, row actions
- Use cases: Beneficial owners, transaction history, document lists

### Impact on Implementation

**Task 3 (Component Registry)**: Create generic components that accept schemas
**Task 5 (UI Implementation)**: Build schema-driven form, upload, table components
**YAML Workflows**: Include `schema` field alongside `component_id`

**Code Reduction:**
- Before: 10 entity types × 5 forms = 50 components × 100 lines = 5,000 lines
- After: 3 generic components × 500 lines = 1,500 lines
- **Reduction: 70% less code**

**Time to Add New Entity Type:**
- Before: 2-4 hours (create components, test, deploy)
- After: 5 minutes (edit YAML schema)
- **Speedup: 24-48x faster**

### Reference Documentation

Comprehensive guide: `task_composable_onboarding/plan/schema-driven-components.md`

This document includes:
- Problem explanation with examples
- Schema type definitions (FieldSchema, FormSchema, etc.)
- Complete implementation of GenericForm component
- YAML examples for multiple use cases
- Conditional field visibility patterns
- Testing strategies
- Benefits analysis

---

## Summary of Key Decisions

| Decision | Chosen Option | Impact |
|----------|---------------|--------|
| Project Structure | Standalone project | Clean implementation, easier to deploy |
| Domain | Financial onboarding | Realistic use case, better demo |
| Component Decoupling | Registry pattern | YAML controls UI, maintainable |
| Testing | Moderate (unit + integration) | Quality without excessive overhead |
| YAML Schema | component_id in step | Self-documenting, business-friendly |
| Workflow Loading | File-based | Simple for POC, migration path exists |
| Error Handling | Graceful degradation | Operational resilience |
| CopilotKit Actions | Single renderUI action | Scalable, extensible |
| State Management | Custom hook | Simple, testable, sufficient |
| **UI Layout** | **Three-pane mockup-based** | **Context-rich, professional, efficient** |
| **Color Scheme** | **Professional Financial** | **Trustworthy, modern, accessible** |
| **Styling** | **Tailwind CSS** | **Precision, consistency, performance** |
| **Component Reusability** | **Schema-driven components** | **70% code reduction, business user control** |

**Total Estimated Implementation Time:** ~18 hours (increased to account for UI implementation)

**Breakdown:**
- Tasks 1-4 (Backend + Engine): ~10 hours
- Task 5 (UI Implementation): ~6 hours
- Task 6 (Integration): ~1 hour
- Task 7 (Documentation): ~1 hour

**Next Steps:** Proceed to implementation phase with approval
