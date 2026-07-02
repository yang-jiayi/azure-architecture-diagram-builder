# Azure Diagram Builder — Usage & Feedback Report

**Generated:** 2026-06-30
**Window:** Last 90 days (unless noted)
**Source:** Application Insights `aq-app-insights-001` (`AQ-FOUNDRY-RG`), appId `198f0a43-f1a5-4a49-bda5-41c925456771`

> Note: this App Insights resource is **shared**. Unrelated agent/SRE events
> (`AgentToolExecution`, `ModelGeneration`, `AgentResponse`, `MetaAgent`, etc.,
> each from a single user) were **excluded** — only diagram-builder telemetry is
> reported below.

---

## Audience (90 days)

| Metric | Value |
|---|---|
| Unique visitors (pageViews) | **898** |
| Users taking tracked actions (customEvents) | **423** |
| Sessions | **1,427** |
| Countries | **49** |
| Total page views | 1,901 |

**Top countries (by users):** United States 535 · India 52 · Netherlands 39 ·
United Kingdom 39 · Germany 24 · Australia 23 · Canada 17 · Greece 16 ·
Singapore 14 · Japan 14

---

## Feature usage (90 days)

| Feature | Events | Unique users |
|---|---|---|
| Architecture generated | **757** | 277 |
| AI model calls (`AI_Model_Usage`) | 1,823 | 304 |
| Diagram exported | 605 | 127 |
| Region changed | 267 | 149 |
| Architecture validated | 191 | 99 |
| Start fresh | 105 | 93 |
| Image/sketch imported | 92 | 55 |
| Deployment guide generated | 73 | 45 |
| Models compared | 68 | 8 |
| Help opened | 44 | 11 |
| Recommendations applied | 37 | 16 |
| Template imported (IaC) | 27 | 15 |
| Version save/restore | 21 | 15 |
| Validation findings/compared/critique | 6 combined | — |

### Most-used models (Architecture generation)

| Model | Generations | Users |
|---|---|---|
| gpt-5.2 | 259 | 167 |
| (unknown — pre-tagging) | 240 | 83 |
| gpt-5.4 | 95 | 25 |
| gpt-5.1 | 84 | 13 |
| mistral-large-3 | 15 | 3 |
| gpt-5.3-codex | 12 | 7 |
| gpt-5.4-mini | 9 | 4 |
| Kimi-K2.5 | 8 | 5 |
| deepseek-v3.2-speciale | 6 | 2 |
| gpt-5.2-codex | 6 | 3 |
| grok-4-1-fast-non-reasoning | 5 | 1 |
| grok-4.3 | 4 | 1 |

---

## Feedback — ratings & comments (90 days)

| Metric | Value |
|---|---|
| Feedback submissions | **18** |
| Unique users who gave feedback | **9** |
| Submissions with a written comment | **11** |
| Average rating | **4.17 / 5** |

**Rating distribution:** 5★ ×11 · 4★ ×3 · 3★ ×1 · 2★ ×2 · 1★ ×1

| Category | Count | Users | Avg rating |
|---|---|---|---|
| Quick rating | 7 | 6 | 4.29 |
| General | 6 | 4 | 3.83 |
| Diagram quality | 3 | 3 | 5.00 |
| Bug / something broke | 1 | 1 | 3.00 |
| Feature request | 1 | 1 | 4.00 |

> The **comment text itself** is NOT stored in App Insights (only `hasComment`,
> `commentLength`, `category`, and `rating`). The full written comments live in
> **Cosmos DB** (`diagrams-db` / `feedback` container) — see the gotcha about the
> Cosmos firewall below.

---

## Trend — last 30 days vs. prior 60 (growth)

| Event | Last 30d | Prev 30–90d |
|---|---|---|
| Architecture generated | **458** | 299 |
| Diagram exported | **407** | 198 |
| Architecture validated | 109 | 82 |
| Image imported | 68 | 24 |
| Deployment guide generated | 49 | 24 |
| Models compared | 36 | 32 |
| Template imported | 17 | 10 |
| User feedback | 18 | 0 |

Usage is trending up across the board; exports more than doubled. The
`User_Feedback` event is new — all 18 submissions are from the last 30 days.

---

## How this data was gathered (reference for next time)

Environment prerequisites after a fresh machine / re-image:

1. **Azure CLI + login** (keyless auth for both App Insights and Cosmos):
   ```bash
   brew install azure-cli      # if not present
   az login
   ```
2. **App Insights CLI extension** (auto-installed on first query):
   ```bash
   az config set extension.use_dynamic_install=yes_without_prompt
   # the 'application-insights' extension installs automatically on first
   # `az monitor app-insights query` call
   ```

The App Insights **appId** comes from the `ApplicationId=...` field of
`VITE_APPINSIGHTS_CONNECTION_STRING` in `.env`
(confirmed it maps to resource `aq-app-insights-001`).

```bash
APPID=198f0a43-f1a5-4a49-bda5-41c925456771
```

### ⚠️ Gotchas we hit (and the fixes)

1. **`az monitor app-insights query` defaults to a 1-hour window.**
   A KQL `where timestamp > ago(30d)` is silently clipped to the last hour, so
   queries returned almost nothing. **Fix:** always pass `--offset` (the API
   timespan), e.g. `--offset 90d`. The KQL time filter then works within it.

2. **`-o table` renders blank for some single-row aggregations.**
   Aggregations like `summarize count(), dcount(...)` with no `by` printed an
   empty table. **Fix:** use `-o json` and format yourself. We used a small
   Node formatter:
   ```bash
   fmt() { node -e 'const d=JSON.parse(require("fs").readFileSync(0,"utf8"));const t=d.tables[0];if(!t||!t.rows.length){console.log("(no rows)");}else{const w=t.columns.map((c,i)=>Math.max(c.name.length,...t.rows.map(r=>String(r[i]??"").length)));const line=a=>a.map((v,i)=>String(v??"").padEnd(w[i])).join("  ");console.log(line(t.columns.map(c=>c.name)));console.log(w.map(x=>"-".repeat(x)).join("  "));t.rows.forEach(r=>console.log(line(r)));}'; }
   ```
   (Node one-liners with `node -e` cannot use a top-level `return` — guard with
   an `if/else` instead.)

3. **Shared App Insights resource.** It also receives agent/SRE telemetry.
   Filter to the diagram-builder event set (the `DB_EVENTS` list mirrored from
   `scripts/workbook-content.json`) or exclude the single-user agent events.

4. **Cosmos DB feedback is firewall-protected.** Reading the actual comment
   text via `server/read-feedback.js` failed with:
   `Request originated from IP <ip> ... blocked by your Cosmos DB account
   firewall settings`. A re-imaged machine has a new public IP that must be
   added to the Cosmos firewall allow-list before the feedback container is
   reachable.

### Key queries used

Overview:
```kusto
customEvents
| summarize TotalEvents=count(), UniqueUsers=dcount(user_Id), Sessions=dcount(session_Id)
```

Events by type:
```kusto
customEvents
| summarize Count=count(), Users=dcount(user_Id) by name
| order by Count desc
```

Audience + countries:
```kusto
pageViews
| summarize Views=count(), Users=dcount(user_Id), Sessions=dcount(session_Id), Countries=dcount(client_CountryOrRegion)

pageViews
| summarize Users=dcount(user_Id), Views=count() by client_CountryOrRegion
| order by Users desc | take 10
```

Models used:
```kusto
customEvents
| where name == "Architecture_Generated"
| extend model=tostring(customDimensions.model)
| summarize Generations=count(), Users=dcount(user_Id) by model
| order by Generations desc
```

Feedback:
```kusto
customEvents
| where name == "User_Feedback"
| summarize FeedbackSubmissions=count(), UniqueUsers=dcount(user_Id),
            WithComment=countif(tobool(customDimensions.hasComment)==true),
            AvgRating=round(avg(toint(customMeasurements.rating)),2)

customEvents
| where name == "User_Feedback"
| summarize Count=count(), Users=dcount(user_Id),
            AvgRating=round(avg(toint(customMeasurements.rating)),2)
  by Category=tostring(customDimensions.category)
| order by Count desc
```

Trend (30d vs prior):
```kusto
let DB=dynamic(["Architecture_Generated","Architecture_Validated",
  "DeploymentGuide_Generated","Diagram_Exported","Models_Compared",
  "Image_Imported","Template_Imported","User_Feedback"]);
customEvents
| where name in (DB)
| summarize Last30d=countif(timestamp>ago(30d)),
            Prev30_90d=countif(timestamp<=ago(30d)) by name
| order by Last30d desc
```

Reading actual feedback comments (requires Cosmos firewall allow-list of the
current public IP):
```bash
cd server && node read-feedback.js          # human-readable
cd server && node read-feedback.js --json    # raw JSON
```
