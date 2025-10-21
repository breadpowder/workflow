# Composable Onboarding — Feature PRD

## Problem Statement
- Current onboarding is manual, static, and spreadsheet/email–driven. Progress is hard to track, updates are brittle, and only one person typically has a clear view of status.
- The existing POC demonstrates guided onboarding but relies on file-based definitions and manual chat-driven changes that do not scale to multi-user, role-based usage.
- Non-technical stakeholders cannot safely adjust onboarding steps for different client types (e.g., institutional vs. SMA) without developer help.
- There is no deterministic, configuration-driven progression of tasks and stages; governance (versioning/approvals/rollback) is absent.

Goals (P0 from DOCX, aligned to current architecture):
- Standardize a simplified onboarding template with predefined stages, tasks, and statuses.
- Enable dynamic progression: completing all tasks in a stage moves the workflow forward deterministically.
- Support roles (read-only, edit, admin) to control who can view, update, and configure workflows.
- Allow admins to modify workflows via configuration (YAML) instead of code.

## In Scope (POC)
- Self-hosted CopilotKit runtime in Next.js (no cloud keys), with `runtimeUrl="/api/copilotkit"` and server-only key management.
- YAML-driven onboarding definitions editable by admins/business users:
  - Steps with required fields, stage membership, and `next` transitions using simple expressions.
  - Loader + interpreter compile YAML to a runtime machine (initial step, step index, helpers).
- Deterministic task/stage progression:
  - Completing all tasks in a stage advances to the next stage; failures can revert or branch per YAML `conditions`.
- Decoupled actions and UI via a component registry:
  - Actions declare intent; `componentId` selects UI at render time.
  - Required fields enforcement blocks transitions until satisfied.
- Client state persistence (POC):
  - File-based key-value storage in `data/client_state/{clientId}.json`
  - Persists workflow progress (currentStepId, collectedInputs, stage status)
  - Simple JSON format for POC; database migration path documented for P1
- Role-based access (P1 design, P0 guardrails):
  - Read-only can view clients, stages, and task status.
  - Edit-role can update task fields and mark complete.
  - Admin can author YAML templates and client-specific overrides.

## Out of Scope (POC)
- Multi-user real-time collaboration and shared session state.
- Persistent DB backend (files are acceptable for POC).
- Full audit trail, observability dashboards, rollout/backout automation.
- Advanced rule engines, vector search, or third-party integrations beyond minimal stubs.
- Production-grade SSO/RBAC (documented design only for P1).

## User Stories (Primary)
- Read-only user: “As a read-only user, I want to view the client profile and current onboarding status, so I can track progress.”
- Edit-role user: “As an edit-role user, I want to update onboarding tasks and required fields so that the workflow automatically advances when complete.”
- Admin user: “As an admin, I want to modify workflow templates, tasks, and client types via configuration so the system adapts to different onboarding needs.”
- Developer: “As a developer, I want actions decoupled from UI via a registry so I can reuse logic across multiple components.”

Acceptance (P0):
- YAML updates reflect at runtime without redeploy; example templates for institutional/SMA included.
- `missingRequiredFields` and `nextStepId` compute gating and transitions deterministically.
- At least two steps render distinct components via the registry.

## Functional Requirements
F1 Client view (existing): Display key client fields (name/type/status) and assigned tasks per stage.
F2 Task progress (P0): Edit-role users can update, complete, or reopen tasks; gating enforced by required fields.
F3 Workflow progression (P0): When all tasks in a stage are complete, transition to the next stage; handle failure branches per YAML.
F4 Role-based access (P1 design, P0 guardrails): Enforce read-only vs. edit vs. admin capabilities.
F5 Template management (P1): Admins can define templates (baseline + client-specific overrides) as YAML; stored under version control.
F6 Audit trail (P2): Optional logging of who changed what and when.

YAML schema (P0):
- Top-level `applies_to` with `client_type` and optional `jurisdictions` to select definitions.
- `steps[]`: `id`, `stage`, `task_ref`, `required_fields[]`.
- `next`: `conditions[]` with simple operators (==, !=, >, >=, <, <=) and `default`.

Engine/loader (P0):
- Select applicable definition by profile; compile to `RuntimeMachine` (e.g., `initialStepId`, `stepIndexById`).
- Provide helpers `missingRequiredFields(step, inputs)` and `nextStepId(step, inputs)`.

UI integration (P0):
- Actions accept `componentId` and `payload`; a registry resolves `componentId → React component`.
- Progression is driven by engine helpers; UI cannot advance when required fields are missing.
- **Chat-first overlay pattern**: Forms render as overlays on top of chat; chat remains primary interface.

UI/UX Flow (P0):
- Right panel starts as chat-only (full height)
- When form needed: overlay slides in/appears on top of chat with backdrop
- Form submission: overlay closes, returns to chat with success message
- Workflow progresses based on form data and YAML transitions

Reference workflows (examples from DOCX, for test data):
- Institutional: Stages for Client Information, Account Setup, Compliance Review, Finalization with representative tasks (KYC, corporate docs, AML checks, W8/W9, activation).
- SMA: Stages for Initial Setup, Custodian Integration, Activation (contact details, portfolio guidelines, custodian account, holding file template, test trade cycle).

## UI/UX Requirements (Dynamic Chat-First Flow)

**Primary Interaction Model**: Chat-driven workflow with on-demand form overlays

### Right Panel Behavior

**State 1: Chat-Only (Default)**
- Full-height chat interface
- No form UI visible
- AI guides user through conversation
- Chat history scrollable
- Input box at bottom

**State 2: Form Overlay (When Needed)**
- Form appears as overlay on top of chat
- Chat remains visible but dimmed (backdrop)
- Overlay contains:
  - Form component from registry
  - Submit and Close/Cancel buttons
  - Validation messages inline
- Overlay sizing:
  - Desktop: 80% width, centered, max-height with scroll
  - Mobile: Full-screen modal
- Close triggers: X button, Cancel, Escape key, click backdrop
- Animation: Slide-in from bottom or fade-in (200-300ms)

**State 3: Post-Submission (Return to Chat)**
- Overlay closes automatically on successful submit
- Returns to full-height chat
- System message appears: "Form submitted successfully!"
- AI may confirm and proceed
- Workflow advances to next step

**Error State**
- Validation errors keep overlay open
- Error messages shown in form
- User corrects and resubmits
- Close/Cancel returns to chat without saving

### Three-Column Layout

```
┌─────────────┬──────────────┬─────────────────────┐
│  Clients    │ Presentation │   Chat (Default)    │
│  List       │  & Status    │  - Messages         │
│             │  - Profile   │  - Input            │
│             │  - Timeline  │                     │
│             │  - Stages    │                     │
│             │  - Required  │                     │
│             │    Fields    │                     │
└─────────────┴──────────────┴─────────────────────┘

When form overlay active:
┌─────────────┬──────────────┬─────────────────────┐
│  Clients    │ Presentation │  ┌───────────────┐  │
│  List       │  & Status    │  │ Form Overlay  │  │
│             │              │  │ [Fields...]   │  │
│             │              │  │ [Submit] [X]  │  │
│             │              │  └───────────────┘  │
│             │              │  Chat (dimmed bkg)  │
└─────────────┴──────────────┴─────────────────────┘
```

### Chat System Messages

- Form opening: "Please fill out the form to continue"
- Submit success: "Form submitted! Moving to [next step]..."
- Validation error: "Please correct errors in the form"
- Processing: Loading indicator during workflow transition

### Optional Manual Triggers

- Middle pane "Required Fields" section may include "Open Form" button
- Provides non-AI way to access current form
- Opens same overlay as AI-driven flow

## Non-Functional Requirements
- P0 single-user focus; acceptable page-to-page response < 1s for typical operations.
- Deterministic behavior: identical inputs → identical transitions; no latent LLM state required for progression.
- Self-hosted runtime; no dependency on public Copilot Cloud keys.
- P1: Introduce RBAC and persistent storage; plan for concurrency and basic auditability.

## API Contracts (POC)

**Note**: The POC uses simplified endpoints (`/api/workflows`, `/api/copilotkit`) for faster implementation. The full API contract below represents the P1 production design. POC endpoints provide equivalent functionality with simpler naming.

```yaml
openapi: 3.1.0
info:
  title: Composable Onboarding API (POC)
  version: 0.1.0
paths:
  /composable_onboardings:
    get:
      summary: List onboarding templates (YAML-backed)
  /composable_onboardings/compiled:
    get:
      summary: Compile onboarding for profile (client_type, jurisdiction)
  /clients/{client_id}/state:
    get:
      summary: Fetch client onboarding state and pending tasks
    post:
      summary: Update task values and recompute next step
```

**POC Implementation**:
- GET `/api/workflows?client_type=X&jurisdiction=Y` → returns compiled RuntimeMachine
- Client state managed via file-based storage (`data/client_state/{clientId}.json`)

## Success Metrics
- YAML edits reflect in the UI without code changes (reload only).
- Required fields gating prevents invalid transitions 100% of the time in POC test flows.
- Two or more steps render through different components using the registry.
- Roles respected per P0 guardrails (read-only vs. edit actions visible/enabled appropriately).

## Risk Assessment
- Expression complexity: keep operators limited in P0; expand later with validation.
- Authoring errors: provide example YAMLs and minimal schema validation with helpful messages.
- Coupling regression: enforce component registry in code review and tests.
- Streamlit POC deltas: prior limitations (re-runs, state reset) mitigated by moving to Next.js + CopilotKit.

## Open Questions
- Typical role definitions (business wants TBD in DOCX) and mapping to org permissions.
- Minimal admin UI scope vs. editing YAML directly in POC.
- Migration path to persistent backend and multi-user concurrency.
- Governance needs (draft/publish/rollback) and owners/timelines.
