# Business Case – Composable Onboarding Composable Onboardings

## Executive Summary
SLC currently relies on a monolithic LLM prompt that bundles composable_onboardings, tasks, and client state. This approach slows onboarding configuration for new client segments and introduces compliance risk. We will deliver a self-hosted, CopilotKit-based Proof of Concept (POC) that adopts a composable composable_onboarding architecture backed by YAML definitions and a lightweight interpreter. The UI will be decoupled from actions using a component registry pattern so that business logic (actions) and presentation (components) evolve independently.

## Market Opportunity
- Wealth and asset managers increasingly differentiate on onboarding experience; faster time-to-value drives mandate win rates.
- Regulatory environments (KYC/AML, ESG disclosures) shift frequently, requiring adaptable composable_onboardings to stay compliant.
- Competitors are adopting low-code composable_onboarding engines; lack of parity risks client dissatisfaction and slower sales conversions.

## User Value Proposition (POC Scope)
- **Program Managers:** Edit YAML composable_onboarding definitions (steps, required fields, transitions) without code changes; updates take effect immediately.
- **Onboarding Specialists:** See the next required steps and missing fields surfaced by the AI assistant, driven by YAML.
- **Developers:** Build against a self-hosted CopilotKit runtime with clear action/UI separation for rapid iteration.

## Business Value
- Establish a fast, maintainable foundation for onboarding flows using YAML + self-hosted runtime.
- Reduce developer bottlenecks by allowing business-authored definitions.
- Enable progressive enhancement (handlers, integrations) without blocking the POC.

## Cost & Investment
- **Engineering:** 2 squads over 2 quarters to deliver data model, composable_onboarding runtime, and LLM orchestration refactor.
- **Product & Compliance:** Part-time commitment for schema definition, approvals, and training.
- **Infrastructure:** Moderate investment for storage, schema registry, and observability (leveraging existing platform services).

## Success Metrics (POC)
- Edit a YAML file and see updated next-step logic in the app within one refresh.
- Required fields block progression deterministically per YAML.
- Decoupled UI renders via a component registry (action → component ID mapping) at least for two steps.
- All functionality runs self-hosted (no Copilot Cloud keys).

## Risks & Mitigations
- **Schema Learning Curve:** Provide example YAML with comments and fake fields to guide authors.
- **Rule Edge Cases:** Keep expression grammar simple in POC (==, !=, >, >=, <, <=); extend later as needed.
- **Coupling Regression:** Enforce component registry usage in code review to keep action/UI decoupled.

## Scope Note
Non-functional concerns (security, observability, scalability, governance composable_onboardings) are out of scope for this POC and will be revisited after core functionality is validated.
