---
name: azure-architecture-diagramming
description: >-
  Generate, validate, and cost an Azure architecture diagram during incident
  response, change validation, or post-incident documentation. Renders the
  current/proposed topology as an Azure-branded SVG, checks it against
  Well-Architected Framework (WAF) rules, and produces cost estimates. Use when
  an incident is topology-related, when a proposed change needs WAF validation,
  or when an incident write-up needs an architecture diagram.
tools:
  - azure-diagram-builder_list_services
  - azure-diagram-builder_generate_manifest
  - azure-diagram-builder_validate_architecture
  - azure-diagram-builder_get_waf_rules
  - azure-diagram-builder_estimate_costs
  - azure-diagram-builder_render_diagram
---

## When to use this skill

Activate this skill when any of the following are true:

- An incident appears **topology- or architecture-related** — a missing/misconfigured resource,
  a broken dependency path, an unexpected egress route, a single point of failure, or "why is this
  talking to that?" questions.
- A **proposed mitigation or change** needs to be checked against the Well-Architected Framework
  (reliability, security, cost, operational excellence, performance) *before* it is applied.
- A **post-incident report or RCA** needs a clear architecture diagram and/or a cost snapshot of the
  affected resources.
- A teammate asks to **visualize, diagram, or draw** the current or target Azure architecture.

Do **not** use this skill for log queries, metric analysis, or resource health checks — those are
handled by native SRE Agent tools and other connectors. Use this skill specifically to **turn an
understood set of resources and relationships into a validated, costed picture.**

## Tools this skill uses

These come from the **Azure Diagram Builder MCP connector** (connection id `azure-diagram-builder`).
Tool names are namespaced by the connection id. If you registered the connector under a different id,
substitute it for the `azure-diagram-builder_` prefix below.

| Tool | Use it to |
| --- | --- |
| `azure-diagram-builder_list_services` | Resolve free-text resource names to canonical Azure service types / icons. |
| `azure-diagram-builder_generate_manifest` | Build the structured diagram manifest (services, zones, connections). |
| `azure-diagram-builder_validate_architecture` | Score the architecture against WAF and return findings. |
| `azure-diagram-builder_get_waf_rules` | Retrieve the WAF rule set used for validation (to explain findings). |
| `azure-diagram-builder_estimate_costs` | Produce a monthly cost estimate for the services in the manifest. |
| `azure-diagram-builder_render_diagram` | Render the manifest as an Azure-branded SVG diagram. |

## Inputs you need before calling tools

Gather these from the investigation context (Resource Graph, the incident's affected resources, the
deployment, or the user). Do not invent resources — only diagram what the evidence supports.

- **Services**: the Azure resources in scope, each as `{ name, type, tier? }`.
- **Connections**: directional relationships `{ from, to, label, type }` where `type` is
  `sync` | `async` | `optional`.
- **Zones** (optional but recommended): logical groupings such as `Azure`, `VNet`, `On-prem`,
  or a resource group, each as `{ id, label }`.

See the attached `examples/sample-architecture-manifest.json` for the exact shape.

## Procedure

### A. Topology / architecture drift during an incident

1. Identify the resources and relationships in scope from the incident's affected resources and
   Resource Graph. If any resource type is ambiguous, call `list_services` to canonicalize it.
2. Call `generate_manifest` with the services, connections, and zones you established.
3. Call `validate_architecture` on that manifest. Capture every finding (severity + rule + resource).
4. Call `render_diagram` to produce the SVG. Reference the misconfigured/missing resource explicitly.
5. If a finding needs justification, call `get_waf_rules` and quote the specific rule.
6. Report: the diagram, the prioritized WAF findings, and the single most likely
   architecture-level contributor to the incident.

### B. Pre-deployment / change validation

1. Build the **proposed** manifest with `generate_manifest` (include the change being requested).
2. Call `validate_architecture`; treat any High/Critical WAF finding as a blocker to flag.
3. Optionally call `estimate_costs` to surface the cost delta the change introduces.
4. Call `render_diagram` for the proposed state.
5. Report a go / no-go recommendation with the WAF findings and cost impact as evidence.

### C. Post-incident documentation

1. Build the manifest of the **affected** architecture with `generate_manifest`.
2. Call `render_diagram` for the RCA write-up.
3. Call `estimate_costs` for a cost snapshot of the affected footprint.
4. Optionally call `validate_architecture` to record remediation items as follow-up actions.
5. Attach the diagram, cost snapshot, and follow-ups to the incident record.

## Expected output

Always return a **structured report** containing:

- **Diagram** — the rendered SVG (or a link/handle to it).
- **WAF findings** — a table of `severity | pillar | rule | affected resource | recommendation`,
  sorted by severity. State "no findings" explicitly if validation is clean.
- **Cost estimate** — monthly total plus the top cost drivers, when costs were requested or relevant.
- **Conclusion** — for incidents: the most likely architecture-level contributor. For changes: a
  go / no-go. For documentation: a one-paragraph architecture summary.
- **Evidence** — name the tools you called and the resources you diagrammed so the result is auditable.

## Guardrails

- **Diagram only what the evidence supports.** Never fabricate resources, tiers, or connections to
  make a diagram look complete. Missing information is itself a finding — call it out.
- **Validation is advisory.** WAF findings are recommendations, not automated actions. This skill
  never modifies infrastructure; it only renders, validates, and costs.
- **Keep connections meaningful.** Limit to the primary data/control flow (roughly 12–18 edges).
  Omit obvious implicit edges (e.g., every service reaching Key Vault) — show one representative edge.
- **If the connector is unreachable**, say so plainly and fall back to a text description of the
  architecture and the WAF concerns; do not pretend a diagram was produced.
