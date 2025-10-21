# Composable Onboarding Composable Onboarding PRD

## Problem Statement
- Current onboarding agent prompt couples composable_onboarding definitions, client state, and task lists into a single monolithic context, making updates brittle and error-prone.
- Non-technical stakeholders cannot adjust composable_onboarding steps for different client segments (e.g., corporate vs. individual) without developer intervention.
- The LLM lacks selective retrieval, increasing hallucination risk and forcing round-trip edits to multiple markdown files.
- There is no lifecycle management (versioning, approvals, rollback) for composable_onboarding definitions, creating compliance risk for regulated onboarding processes.

## In Scope (POC)
- Self-hosted CopilotKit integration (no public cloud API keys):
  - Next.js UI with `CopilotKit` provider using `runtimeUrl="/api/copilotkit"`.
  - Next.js API route hosting `@copilotkit/runtime` with `OpenAIAdapter` (server-only `OPENAI_API_KEY`).
- YAML-driven composable_onboardings (file-based, editable by business users):
  - YAML schema: steps, required_fields, and `next` transitions with simple expressions.
  - Loader + interpreter compiles to a runtime machine (step map, initial step, helpers).
  - API: `GET /api/composable_onboardings?client_type=...&jurisdiction=...` returns compiled machine.
- Decoupled Actions & UI (component registry):
  - Actions declare intent and parameters.
  - UI rendering selected via `componentId` in action parameters, resolved through a registry mapping.
  - Required fields enforcement blocks transitions until satisfied.

## Out of Scope (POC)
- Governance and approvals (draft/publish lifecycles).
- Full audit trails, observability dashboards, rollouts.
- Production-grade auth, security hardening, scalability concerns.
- Advanced rule engines, vector search; any non-essential integrations.

## User Stories (POC)
- As a Program Manager, I can edit YAML files to define steps, required fields, and transitions; changes reflect without code changes.
- As a Specialist, I see the next step and missing fields; completing fields triggers deterministic transitions.
- As a Developer, I can map an action intent to a component via a registry, not hardcoded in the action.

## Functional Requirements (POC)
- YAML schema supports:
  - steps: `id`, `task_ref`, `required_fields`, and `next` with `conditions[]` (simple expressions) and `default`.
  - top-level `applies_to` with `client_type` and `jurisdictions` for composable_onboarding selection.
- Loader and engine:
  - loads YAML files, selects applicable composable_onboarding by profile, compiles `RuntimeMachine`.
  - helper functions: `missingRequiredFields(step, inputs)`, `nextStepId(step, inputs)`.
- API:
  - `GET /api/composable_onboardings?client_type=...&jurisdiction=...` returns `RuntimeMachine` JSON with `initialStepId` and `stepIndexById`.
- UI integration (decoupled):
  - Actions take a `componentId` and `payload`.
  - A component registry maps `componentId` → React component; actions do not directly import UI components.
  - Progression uses engine helpers and blocks until `required_fields` are satisfied.

## Non-Functional Requirements
Deferred. POC prioritizes functionality only.

## API Contracts (POC)
```yaml
openapi: 3.1.0
info:
  title: Composable Onboarding API
  version: 0.1.0
paths:
  /composable_onboardings:
    get:
      summary: List published composable_onboardings
  /composable_onboardings/{composable_onboarding_id}:
    get:
      summary: Retrieve composable_onboarding definition including tasks and segment rules
  /clients/{client_id}/state:
    get:
      summary: Fetch client composable_onboarding state and pending tasks
    post:
      summary: Update client task progress or transition state
  /composable_onboarding-drafts:
    post:
      summary: Create or update composable_onboarding drafts for review
  /composable_onboarding-drafts/{draft_id}/submit:
    post:
      summary: Submit draft for approval
```

## Success Metrics (POC)
- YAML edits reflected at runtime without code changes.
- Required fields enforcement prevents invalid transitions.
- Action/UI decoupling verified with at least two components via registry.

## Risk Assessment
POC scope intentionally limits complexity; rule grammar and UI registry are kept simple to reduce risk.

## Open Questions
- When to introduce a basic admin UI for YAML authoring.
- Which additional expression operators are most valuable next.
