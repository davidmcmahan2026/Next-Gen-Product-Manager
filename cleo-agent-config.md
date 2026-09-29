# Cleo — Relevance AI agent configuration

This is what to set up in Relevance AI once the Bolt backend above is
deployed somewhere with a stable public URL (see README.md — a StackBlitz
preview URL is not stable enough for this).

## 1. Agent basics

| Setting | Value |
|---|---|
| Agent name | Cleo |
| LLM | Claude (Sonnet, per the earlier model recommendation for tool-calling fidelity) |
| Tools | All 7 from `tools.json`, attached to this agent |
| Output | Structured JSON (schema below) — Relevance AI supports constraining an agent's final output to a schema; use that rather than trusting free-text JSON |

## 2. Where each credential actually goes

Two secrets, moving in opposite directions. Don't put either one in both places — each only needs to exist where the call actually originates.

**`BOLT_TOOL_SECRET` (Relevance AI → Bolt, used when Cleo calls a tool):**
1. Generate one random value yourself, e.g. `openssl rand -hex 32`.
2. Put it in Bolt's backend as `RELEVANCE_TOOL_SECRET` — in `.env` for local dev, and as a real environment variable on whatever host you deploy the backend to (Railway/Render/Fly.io all have an "Environment Variables" section on the service's dashboard). This is the value `requireToolSecret` in `middleware/auth.ts` checks against.
3. In Relevance AI, go to **Integrations & API Keys → Custom API Keys** and store the *same* value there, named `BOLT_TOOL_SECRET`. This is a project-level store, not per-tool.
4. Each of the 7 tools in `tools.json` references it in its `headers` as `{{secrets.BOLT_TOOL_SECRET}}` — that's Relevance AI's actual templating syntax for a Custom API Key (not `{{env.…}}`, which was wrong in an earlier pass of this file).
5. The backend's public URL (`BOLT_BACKEND_URL`) isn't sensitive, but storing it the same way — a second Custom API Key — means you only update one place when the deployment URL changes; every tool's `url` field then reads `{{secrets.BOLT_BACKEND_URL}}` instead of a hardcoded string repeated 7 times.

**`RELEVANCE_AI_API_KEY` (Bolt → Relevance AI, used when Bolt triggers a Cleo run):**
1. In Relevance AI, go to **Integrations & API Keys → Relevance API Keys** and generate one (Editor role or above). It's shown once — copy it immediately, it can't be viewed again later.
2. Put it in Bolt's backend environment only — same place as `RELEVANCE_TOOL_SECRET` above (`.env` locally, host env vars in production). It never goes into Relevance AI itself; Relevance AI doesn't need its own key to call itself.
3. You'll also need the agent's `agent_id` and its trigger URL, both shown on the agent's own **Triggers** tab once you've created it and added an API trigger — store those as `RELEVANCE_CLEO_AGENT_ID` and `RELEVANCE_TRIGGER_URL` in Bolt's backend env too, alongside the API key.

Nothing above goes in the Bolt *frontend* (the React app) — both secrets are backend-only, so they never reach the browser.

## 3. System prompt

```
You are Cleo, a data-cleaning assistant. You recommend changes; you never
execute them. A human always makes the final call.

CORE PRINCIPLE
You have two gated tools (execute_rules_engine, save_workflow) that will
return an error if the change you're asking for hasn't been approved by a
human yet. This is expected and normal — never treat a "denied" response as
a bug, never retry it hoping for a different result, and never tell the
user a change was applied unless the tool call actually returned success.

PROCESS
1. Analyze & propose — call get_profile, then run_validator (and
   get_diff_preview if you need a fresh sample) to gather evidence. Draft
   recommendations strictly from what these tools return.
2. Explain — for every recommendation, write a short explanation that
   cites the specific evidence (rule name, rows affected, sample values).
   Never state a finding without a citation back to a tool result.
3. Score confidence — rate each recommendation high/medium/low:
   - High: format-only changes with no ambiguity (e.g. whitespace,
     casing, a 1:1 categorical mapping).
   - Medium: the change is reasonable but makes an assumption you can't
     fully verify from the data alone (e.g. assuming +1 country code).
   - Low: anything requiring a judgment call a human should make (e.g.
     merging possibly-duplicate records). When in doubt, score lower.
   Call write_audit_log after proposing each recommendation.

TOOLS
Open (call freely): get_profile, run_validator, get_diff_preview,
write_audit_log, check_job_status.
Gated (may be denied): execute_rules_engine, save_workflow. Only call
these when you have a recommendationId you believe was approved — never
speculatively.
You do not have access to the raw file parser or the export function —
you work only with what get_profile and run_validator return.

HARD RULES
- Never state a finding without citing the evidence tool call it came from.
- Never call a gated tool speculatively "to see what happens."
- Never imply a plan was applied unless the gated tool call returned
  { applied: true } or { saved: true }.
- If a gated tool returns { error: "denied" }, report that plainly —
  do not soften it into "this change is in progress."

OUTPUT SCHEMA
Return:
{
  "plan_id": "string",
  "recommendations": [
    {
      "action": "string",
      "confidence": "high" | "medium" | "low",
      "evidence": { "rows": number, "column": "string", "rule": "string" },
      "explanation": "string"
    }
  ],
  "summary": "string"
}
```

(This is the same system prompt established earlier in the architecture
design — reproduced here so the agent config and the backend's tool
contracts stay in one place.)

## 4. The trigger — how Bolt actually invokes Cleo

Relevance AI agents run in response to a Trigger. For this design, use an
**API trigger** on the agent (Relevance AI: agent → Triggers tab → add an
API trigger), called from Bolt's own backend — never directly from the
browser, so `RELEVANCE_AI_API_KEY` never reaches client-side code.

One important correction from an earlier pass of this design: **triggering
an agent is asynchronous**. The trigger call returns quickly (an
acknowledgement, not Cleo's finished output), and the actual result has to
be routed to a destination you configure — most simply, a webhook back
into Bolt. Don't build this expecting `await fetch(...)` to hand you
Cleo's recommendations directly; it won't. That means Bolt needs two
routes, not one: one to kick off the run, one to receive the result.

```ts
// src/routes/cleo.ts — add this alongside routes/tools.ts, and mount it
// in server.ts the same way (behind requireFrontendSession for /analyze;
// /callback needs its own check — see the comment on that route below).
import { Router } from "express";
import { appendAuditEntry } from "../db.js";

export const cleoRouter = Router();

// Called by the "Send to Cleo for analysis" button on the Upload screen.
// Kicks off the run and returns immediately — it does NOT wait for Cleo's
// output. The exact trigger URL is org-specific: copy it from the agent's
// own Triggers tab in Relevance AI rather than assuming the path below.
cleoRouter.post("/analyze", async (req, res) => {
  const { datasetId, jobId } = req.body as { datasetId?: string; jobId?: string };
  if (!datasetId) return res.status(400).json({ error: "datasetId is required" });

  const response = await fetch(process.env.RELEVANCE_TRIGGER_URL!, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `${process.env.RELEVANCE_AI_API_KEY}`, // check the Triggers tab for the exact header format it expects
    },
    body: JSON.stringify({
      agent_id: process.env.RELEVANCE_CLEO_AGENT_ID,
      message: { role: "user", content: JSON.stringify({ datasetId, jobId }) },
    }),
  });

  if (!response.ok) {
    return res.status(502).json({ error: "failed to trigger Cleo", status: response.status });
  }
  res.json({ triggered: true, jobId });
});

// Configure this URL as the trigger's "destination" (webhook) in Relevance
// AI, so Cleo's finished output is POSTed here once the run completes.
// This route is called BY Relevance AI, not by a human — protect it with
// its own shared secret (a THIRD credential, distinct from BOLT_TOOL_SECRET,
// since it authenticates a different direction: Relevance AI delivering a
// result, not Relevance AI calling a tool mid-run) rather than
// requireFrontendSession.
cleoRouter.post("/callback", async (req, res) => {
  const provided = req.header("x-cleo-callback-key");
  if (provided !== process.env.RELEVANCE_CALLBACK_SECRET) {
    return res.status(401).json({ error: "unauthorized" });
  }

  const { jobId, recommendations, summary } = req.body as {
    jobId?: string;
    recommendations?: unknown[];
    summary?: string;
  };

  // Prototype stub: persist recommendations here (a `recommendations`
  // table/store alongside the others in db.ts) so the Review & Approve
  // screen can read them. Not built yet — see README.md's "stubbed" list.
  await appendAuditEntry({
    actor: "Cleo",
    action: "Analysis complete",
    detail: `job ${jobId ?? "unknown"}: ${summary ?? `${recommendations?.length ?? 0} recommendations`}`,
    type: "recommendation",
  });

  res.json({ received: true });
});
```

Sequence, end to end:

1. Analyst clicks **Send to Cleo for analysis** on the Upload screen (Bolt frontend).
2. Bolt frontend calls Bolt's own `POST /api/cleo/analyze { datasetId, jobId }` — this request carries the analyst's session, not the Relevance AI key.
3. Bolt backend calls Relevance AI's trigger URL with `RELEVANCE_AI_API_KEY`, passing `datasetId`/`jobId` as the agent's input, and returns immediately — it does not wait for Cleo to finish.
4. Relevance AI runs Cleo. Cleo calls back into Bolt's `/api/tools/*` endpoints (get_profile, run_validator, …) using `BOLT_TOOL_SECRET` — this is Relevance AI calling Bolt, the reverse direction from step 3, and happens possibly several times over the course of one run.
5. When Cleo finishes, Relevance AI POSTs the structured JSON output (recommendations, confidence, evidence) to the webhook destination you configured — Bolt's `/api/cleo/callback` — authenticated with a third secret (`RELEVANCE_CALLBACK_SECRET`) that only that route checks.
6. Bolt's callback route stores the recommendations (the stubbed `recommendations` table mentioned in README.md) so the Review & Approve screen can render them — likely after the frontend polls `check_job_status` or the callback flips the job to `awaiting_approval`.
7. Analyst clicks Approve → `POST /api/approvals` (human, no Relevance AI involved).
8. Whatever calls `execute_rules_engine` next (either Cleo, re-triggered, or a simpler direct call Bolt makes once it has the approval — either is valid; the gate check in `routes/tools.ts` protects it either way) succeeds because the approval record now exists.

Three secrets, three different directions — worth keeping straight since
mixing them up is the most likely setup mistake:

| Secret | Who calls whom | Lives in |
|---|---|---|
| `RELEVANCE_AI_API_KEY` | Bolt → Relevance AI (start a run) | Bolt backend env only |
| `BOLT_TOOL_SECRET` | Relevance AI → Bolt (mid-run tool calls) | Bolt backend env (as `RELEVANCE_TOOL_SECRET`) **and** Relevance AI's Custom API Keys |
| `RELEVANCE_CALLBACK_SECRET` | Relevance AI → Bolt (delivering the finished result) | Bolt backend env, and wherever Relevance AI lets you set a custom header on the trigger's destination/webhook config |

None of these substitute for the human approval record the gate actually
checks — a valid secret only proves who's calling, never that a human
approved anything.

**Before wiring this up for real:** the trigger URL, its exact auth header
format, and the destination/webhook configuration are shown on your own
agent's Triggers tab in Relevance AI and can differ from the illustrative
values above — copy them from there rather than trusting the literal
strings in this file.
