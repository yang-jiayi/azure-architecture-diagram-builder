# Azure Architecture Diagram Builder — MCP Server Tools

This is the running reference for every tool the MCP server exposes
([`src/index.ts`](src/index.ts)). Endpoint: `POST /mcp` (streamable-HTTP) with
`Authorization: Bearer <token from .env.mcp>`. Health: `GET /healthz`.

All tools are deterministic (no LLM) unless noted. Design-time only — nothing
deploys Azure resources.

## Tool inventory

| # | Tool | Purpose | Stage |
|---|------|---------|-------|
| 1 | `list_services` | Browse the Azure service catalog (names, categories, aliases, pricing availability, cost ranges) | Discovery |
| 2 | `validate_architecture` | WAF score (0–100) + findings by pillar, deterministic rule engine | Analyze |
| 3 | `estimate_costs` | Numeric monthly costs (low/expected/high) from distilled Azure Retail Prices | Cost |
| 4 | `generate_manifest` | `az prototype` interchange manifest (JSON) | Export |
| 5 | `generate_bicep` | Deployable Bicep with WAF secure defaults pre-set; maps each setting to the finding it resolves | IaC |
| 6 | `harden_architecture` | **NEW** — deterministically clear pattern-level WAF anti-patterns (topology remediation) | Remediate |
| 7 | `get_waf_rules` | Query the WAF rule knowledge base by pillar / service | Discovery |
| 8 | `render_diagram` | Azure-branded SVG or interactive HTML diagram | Visualize |
| 9 | `export_reactflow_scene` | React Flow scene JSON importable into the web app | Export |
| 10 | `import_architecture` | **NEW** — inverse of the export tools; parse a manifest / React Flow scene back to canonical shape | Import |
| 11 | `generate_terraform` | **NEW** — deployable Terraform (azurerm) with the same WAF secure defaults as the Bicep tool | IaC |
| 12 | `generate_deployment_guide` | **NEW** — step-by-step Markdown deploy runbook (Bicep or Terraform) with a post-deploy hardening checklist | Deploy |

---

## 6. `harden_architecture` (new)

**Module:** [`src/hardener.ts`](src/hardener.ts)

Collapses the manual *add-service → re-validate* loop (that agents like Scout
previously did by hand) into a single deterministic call. Given an
architecture, it detects the pattern-level WAF anti-patterns and adds the
remediating services + connections, iterating until the pattern set stops
shrinking, then re-validates.

### Patterns cleared (topology / diagram-addressable)

| Anti-pattern | Remediation added |
|--------------|-------------------|
| `no-identity` | Microsoft Entra ID (+ authN/authZ edge) |
| `no-waf` | Azure Front Door + WAF Policy on the edge |
| `single-region` | Azure Front Door (global entry + failover) |
| `no-api-gateway` | API Management (unified gateway) |
| `direct-db-access` | Reroutes frontend→DB through the API layer |
| `single-database` | Geo-replicated read replica (`<db> Replica`) |
| `no-cache` | Azure Cache for Redis |
| `no-key-vault` | Key Vault |
| `no-backup` | Azure Backup |
| `no-monitoring` | Application Insights + Azure Monitor |

> **Scope:** only *topology* is fixed here. Config-level findings (HTTPS-only,
> TDE, Key Vault soft-delete, autoscale, …) are **not** diagram-addressable and
> are resolved by `generate_bicep`. So the WAF score rises but is still capped
> at the diagram layer — that's expected and intentional.

### Input

```jsonc
{
  "services":   [{ "name": "...", "type": "...", "description?": "...", "groupId?": "..." }],
  "connections?": [{ "from": "...", "to": "...", "label?": "...", "type?": "sync|async|optional" }],
  "groups?":    [{ "id": "...", "label": "..." }]
}
```

### Output

```jsonc
{
  "summary":   "Hardened: WAF score 10 → 18. Patterns 7 → 0 (all cleared). 7 change(s) applied.",
  "before":    { "score": 10, "patternsDetected": [...], "totalFindings": N },
  "after":     { "score": 18, "patternsDetected": [], "totalFindings": M },
  "changes":   [{ "pattern": "no-identity", "action": "...", "addedServices": [...], "addedConnections": ["A → B"] }],
  "unresolved":[],          // topology patterns that couldn't be auto-fixed
  "note":      "All pattern-level anti-patterns cleared. Remaining WAF findings are config-level — resolve them with generate_bicep.",
  "services":  [...],       // hardened architecture — pass straight to render_diagram / generate_bicep / export_reactflow_scene
  "connections":[...],
  "groups":    [...]        // new groups (Global Edge & Security, API Gateway, Security & Ops) appended
}
```

### Typical flow

`validate_architecture` → `harden_architecture` → `render_diagram` (show the
hardened topology) → `generate_bicep` (resolve config-level findings) →
`export_reactflow_scene` (hand to the web app).

Idempotent: hardening an already-hardened architecture is a no-op.

---

## 10. `import_architecture` (new)

**Module:** [`src/importer.ts`](src/importer.ts)

The inverse of `generate_manifest` and `export_reactflow_scene` — closes the
round-trip so an agent can reload a previously saved design and keep working.

### Accepts

| Format | Detection | Type recovery |
|--------|-----------|---------------|
| az prototype **manifest** | has `architecture` | explicit `services[].type` (lossless) |
| React Flow **scene** | has `nodes` | `data.azureServiceType` → icon-path reverse-lookup → `data.label` |

### Input

```jsonc
{
  "content": "<JSON string — a manifest or a React Flow scene>",
  "format?": "auto | manifest | reactflow"   // auto-detected when omitted
}
```

### Output

```jsonc
{
  "summary": "Imported reactflow: 3 service(s), 1 connection(s), 1 group(s).",
  "format": "manifest | reactflow",
  "projectName?": "...",
  "location?": "...",
  "warnings": [ ... ],          // non-fatal parse notes (e.g. unresolved type)
  "services": [ ... ],          // canonical shape — feed straight into any tool
  "connections": [ ... ],
  "groups": [ ... ]
}
```

### Typical flow

`import_architecture` → `validate_architecture` / `harden_architecture` /
`render_diagram`. Edges that touch group nodes are dropped; service types are
reverse-resolved from the icon map (`ICON_FILE_TO_TYPE` in `index.ts`) when a
scene has no explicit type field.

---

## Resources (new)

Beyond tools, the server exposes read-only MCP **resources** so clients can
browse reference data without a tool round-trip (they're cacheable):

| URI | Title | Contents |
|-----|-------|----------|
| `azure://catalog/services` | Azure service catalog | Every known service: category, aliases, pricing availability, cost range |
| `azure://waf/rules` | WAF rules | Pattern rules + per-service best practices used by `validate_architecture` |
| `azure://pricing/meta` | Pricing metadata | Regions and priced service entries available to `estimate_costs` |

All return `application/json`.

## Prompts (new)

Reusable MCP **prompt templates** that guide any client through the full
design workflow:

| Name | Argument | What it drives |
|------|----------|----------------|
| `design-secure-web-app` | `workload` | Propose → validate → harden → cost → render → bicep for a secure web app |
| `design-event-driven-platform` | `workload` | Same flow for an ingest→process→store→analytics platform |
| `harden-and-cost` | `region?` | Import (if needed) → validate → harden → cost → render → bicep on an existing design |

---

## 11. `generate_terraform` (new)

**Module:** [`src/terraformGenerator.ts`](src/terraformGenerator.ts)

Terraform (azurerm provider `~> 4.0`) counterpart to `generate_bicep`. Emits a
provider block + resource group, then the same secure-default resources so the
config-level WAF findings resolve out of the gate.

### Coverage (secure defaults pre-set)

| Service | azurerm resource(s) | Hardening |
|---------|---------------------|-----------|
| App Service | `azurerm_service_plan` + `azurerm_linux_web_app` (+ slot, autoscale) | `https_only`, TLS 1.2, `identity`, health check, autoscale, staging slot |
| Key Vault | `azurerm_key_vault` | soft-delete 90d, purge protection, RBAC, no public network |
| Storage | `azurerm_storage_account` | HTTPS-only, TLS 1.2, no public/nested access, ZRS |
| Cosmos DB | `azurerm_cosmosdb_account` | automatic failover, continuous backup, Session consistency |
| Redis | `azurerm_redis_cache` | TLS 1.2 min, non-SSL port disabled |
| AI Search | `azurerm_search_service` | keyless (`local_authentication_enabled = false`), identity |
| Container Apps | `azurerm_container_app*` | HTTPS-only ingress, managed identity, LA-backed env |
| Monitoring | `azurerm_log_analytics_workspace` + `azurerm_application_insights` | workspace-based |

Managed identities are granted **Key Vault Secrets User** via
`azurerm_role_assignment` (keyless auth). Services without a template emit a
commented placeholder and are listed in `servicesGeneric`.

### Output

```jsonc
{
  "iacTool": "terraform",
  "servicesCovered": [ ... ],
  "servicesGeneric": [ ... ],
  "findingsResolved": [ { "ruleId", "pillar", "service", "setting", "terraformAttribute" } ],
  "findingsResolvedCount": 12,
  "note": "...",
  "terraform": "terraform { ... }"   // full HCL
}
```

> Use `generate_bicep` for Bicep and `generate_terraform` for Terraform — they
> share coverage and secure-default semantics so agents can offer either format.

---

## 12. `generate_deployment_guide` (new)

**Module:** [`src/deploymentGuide.ts`](src/deploymentGuide.ts)

Produces a Markdown deployment **runbook** for the architecture, tailored to the
chosen IaC tool. Pairs with `generate_bicep` / `generate_terraform` (which emit
the IaC the guide deploys).

### Sections (7 steps)

1. Prerequisites (Azure CLI, role, Bicep/Terraform, quota)
2. `az login` + subscription select
3. Region & naming
4. Resource group create
5. **Deploy** — `az deployment group create` (Bicep) or `terraform init/plan/apply`
6. **Post-deploy hardening checklist** — derived from the WAF *service-level*
   findings (`detectWafPatterns`), so operators verify the settings the IaC
   pre-sets (HTTPS-only, TLS, TDE, soft-delete, …)
7. **Smoke tests** — per-service verification hints (deduped by resolved type)
8. Teardown (`az group delete` or `terraform destroy`)

### Input / output

Input mirrors the IaC tools: `{ services, connections?, projectName?, location?, iacTool? }`
(`iacTool`: `bicep` default, or `terraform`).

```jsonc
{
  "iacTool": "bicep | terraform",
  "steps": 7,
  "checklistItems": 8,       // config findings turned into checklist items
  "markdown": "# Deployment Guide — ..."
}
```

> Design-time only — the guide documents the steps, it never deploys.
