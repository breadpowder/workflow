# YAML-Driven Workflows (Phase 1 – Option A)

This project adds a minimal YAML → TypeScript interpreter so business users can edit workflow definitions as YAML files, and the app consumes them dynamically without code generation.

## Where files live
- Workflows: `CopilotKit/examples/copilot-state-machine/data/workflows/*.yaml`
  - Example: `CopilotKit/examples/copilot-state-machine/data/workflows/onboarding_corporate_v1.yaml`
- Loader & Engine:
  - `CopilotKit/examples/copilot-state-machine/src/server/workflow/schema.ts`
  - `CopilotKit/examples/copilot-state-machine/src/server/workflow/loader.ts`
  - `CopilotKit/examples/copilot-state-machine/src/server/workflow/engine.ts`
- Read via API:
  - `GET /api/workflows?client_type=corporate&jurisdiction=US` returns a compiled runtime machine with step indices and the initial step id.

## Authoring schema (example)
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
    required_fields: ["name", "email", "phone"]
    next:
      default: buildCar
  - id: sellFinancing
    task_ref: offer_financing
    required_fields: ["financing_decision"]
    next:
      conditions:
        - when: "financing_decision == 'yes'"
          then: getFinancingInfo
      default: getPaymentInfo
```

## How it works
- `loader.ts` reads YAML files and selects the most applicable workflow by `client_type` and `jurisdiction`.
- `engine.ts` compiles a `RuntimeMachine`:
  - Maps step IDs → indices
  - Returns `initialStepId`
  - Provides helpers to:
    - Evaluate `next` transitions via simple expressions (e.g., `x > 10`, `y == 'yes'`)
    - Compute `missingRequiredFields`
- No codegen: YAML edits reflect immediately on next request. This keeps authoring simple and removes manual TS changes.

## UI usage (incremental)
- Current example still uses hard-coded car sales stages. To switch to YAML-driven flow:
  - Fetch `GET /api/workflows?...` on app load.
  - Drive `stage` from the returned `RuntimeMachine.initialStepId`.
  - On action completion, call `nextStepId(currentStep, collectedInputs)` to transition.
  - Use `missingRequiredFields` to guard transitions.

## Notes
- Keep provider self-hosted: `layout.tsx` uses `runtimeUrl="/api/copilotkit"`.
- Server-only keys (e.g., `OPENAI_API_KEY`) belong in `.env.local`.
- Expressions supported: `> >= < <= == !=` against numbers and strings.
- Extend engine later to add more complex rule evaluation or validations.
