# User Stories

## Summary (POC)
| Story ID | Persona | Story | Priority | Points |
|----------|---------|-------|----------|--------|
| COS-POC-1 | Program Manager | Edit YAML composable_onboardings to control steps, required fields, and transitions | Must | 5 |
| COS-POC-2 | Onboarding Specialist | See next step and missing fields; progress deterministically | Must | 5 |
| COS-POC-3 | Developer | Decouple actions and UI using a component registry | Must | 3 |
| COS-POC-4 | Developer | Run all functionality self-hosted with CopilotKit runtime | Must | 3 |

## Story Details

### COS-POC-1 – Edit YAML composable_onboardings
- **Persona:** Program Manager  
- **As a** program manager  
- **I want** to edit YAML files to define steps with required fields and transitions  
- **So that** I can adapt onboarding by segment without code changes.
- **Acceptance Criteria**
  - YAML supports `steps`, `required_fields`, `next.conditions`, and `applies_to`.
  - Changes reflect in the UI after refresh; no redeploy required.
  - Example YAMLs include fake fields for corporate and individual flows.

### COS-POC-2 – Next steps for specialists
- **Persona:** Onboarding Specialist  
- **As a** specialist  
- **I want** the assistant to show required fields and compute next steps deterministically  
- **So that** I can guide clients without missing steps.
- **Acceptance Criteria**
  - `missingRequiredFields` lists unmet fields for the current step.
  - `nextStepId` selects the next step using YAML `conditions` and `default`.
  - UI prevents progression until required fields are satisfied.

### COS-POC-3 – Action/UI decoupling
- **Persona:** Developer  
- **As a** developer  
- **I want** to render UI via a component registry keyed by `componentId`  
- **So that** the same actions can be reused across different presentations.
- **Acceptance Criteria**
  - At least two steps render different components via the registry.
  - No action imports a UI component directly; registry resolves rendering.

### COS-POC-4 – Self-hosted runtime
- **Persona:** Developer  
- **As a** developer  
- **I want** to run CopilotKit runtime locally in a Next.js route  
- **So that** all functionality works without cloud keys.
- **Acceptance Criteria**
  - The UI initializes with `runtimeUrl`.
  - The endpoint processes chat and tool calls.
  - No `NEXT_PUBLIC_*` Copilot Cloud keys are required.

Notes: Governance, audit, and integrations are deferred for the POC.
