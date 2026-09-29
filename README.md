# DataClean Studio — Bolt backend (Cleo's tools)

This is the backend half of the Bolt + Relevance AI split: a real,
runnable Express/TypeScript API implementing every tool in the
architecture — the 5 open tools Cleo can call freely, the 2 gated tools
that only execute after human approval, and the 2 internal capabilities
(file parsing, export) Cleo never sees at all. It's meant to sit in your
Bolt project's backend folder; everything here runs in plain Node, no
native binaries, so it works inside Bolt's WebContainer dev environment.

It was built and smoke-tested end to end while putting this together:
upload → profile → validate → attempt gated execution (denied) → approve
→ execute (succeeds) → audit trail records all of it. See "Verifying the
gate" below to reproduce that yourself.

## Project layout

```
src/
  types.ts              shared types (Dataset, ColumnProfile, Approval, AuditEntry, ...)
  db.ts                  in-memory store for the prototype — see the note at
                          the top of the file for swapping in real Postgres
  middleware/auth.ts     requireToolSecret (Cleo) vs requireFrontendSession (humans)
  lib/
    parseFile.ts          CSV/Excel → rows (used only by the internal upload route)
    profiler.ts           deterministic column profiling → get_profile
    validator.ts           the 4 deterministic cleaning rules, shared by
                           run_validator, get_diff_preview, and rulesEngine
    diffPreview.ts         thin wrapper → get_diff_preview
    rulesEngine.ts         the only code that mutates data → execute_rules_engine
  routes/
    tools.ts               the 7 Cleo-facing endpoints (behind requireToolSecret)
    internal.ts            upload (Parser) + export, audit-log read (behind requireFrontendSession)
    approvals.ts            the only place an approval record can be created
  server.ts               wires it all together
relevance-ai/
  tools.json              exact Tool configs to paste into Relevance AI
  cleo-agent-config.md    Cleo's system prompt, agent settings, and the trigger flow
```

## The two locks — read this before changing anything

There are two independent checks in this codebase, and they protect
against two different things. Don't collapse them into one.

1. **`x-cleo-tool-key` (`requireToolSecret`, `middleware/auth.ts`)** — proves
   the caller of `/api/tools/*` is Relevance AI (i.e., Cleo), not some
   random request. Every one of the 7 tools requires this, including the
   gated ones. This is an authentication check, not an authorization check.
2. **The approvals table (`db.ts`, written only by `routes/approvals.ts`)** —
   proves a human clicked Approve in the Bolt UI for a specific
   `recommendationId`. `execute_rules_engine` and `save_workflow` both
   check this, separately from the tool secret, before doing anything.

A request can pass check 1 and fail check 2 — that's the normal case for
every gated call until a human approves it, and it's what makes this
"agentic but supervised" rather than "agentic and autonomous." If you ever
find yourself tempted to let `execute_rules_engine` run because "Cleo said
it was fine," that defeats the entire design; the check belongs in
`getApproval()`, not in Cleo's prompt.

## Running it locally

```
npm install
cp .env.example .env   # then edit RELEVANCE_TOOL_SECRET to a real random value
npm run dev
```

This starts the server on `:8787` (or `$PORT`). `/api/tools/*` needs the
`x-cleo-tool-key` header; `/api/upload`, `/api/export`, `/api/audit-log`,
and `/api/approvals` need an `x-dcs-user` header standing in for a real
session until you wire up actual auth (Supabase Auth, your own JWT,
whatever Bolt's frontend ends up using).

### Verifying the gate yourself

```
# 1. Upload a file (Parser — human session, no tool secret)
curl -X POST http://localhost:8787/api/upload -H "x-dcs-user: Maya Chen" -F "file=@sample.csv"
# → { datasetId, jobId, rowCount, columns }

# 2. Try to execute a rule with no approval on record
curl -X POST http://localhost:8787/api/tools/execute_rules_engine \
  -H "Content-Type: application/json" -H "x-cleo-tool-key: <your secret>" \
  -d '{"datasetId":"<id>","ruleId":"state_code_normalization_v3","column":"state","recommendationId":"rec-001"}'
# → 403 { "error": "denied", "reason": "no approval record found..." }

# 3. Approve it as a human would
curl -X POST http://localhost:8787/api/approvals \
  -H "Content-Type: application/json" -H "x-dcs-user: Maya Chen" \
  -d '{"recommendationId":"rec-001","decision":"approved"}'

# 4. Same execute call now succeeds
curl -X POST http://localhost:8787/api/tools/execute_rules_engine \
  -H "Content-Type: application/json" -H "x-cleo-tool-key: <your secret>" \
  -d '{"datasetId":"<id>","ruleId":"state_code_normalization_v3","column":"state","recommendationId":"rec-001"}'
# → { "applied": true, "rowsAffected": N }
```

## Deploying so Relevance AI can actually reach it

This is the part that trips people up: Bolt's live preview runs inside a
StackBlitz **WebContainer**, and its preview URL is real and HTTPS, but
it's tied to that browser tab staying open — it's fine for you to develop
against, but not something you want a third-party service depending on
for a demo that needs to reliably work. Before wiring up Relevance AI:

1. Export/deploy this backend to somewhere with a stable URL — Railway,
   Render, or Fly.io are the fastest for a Node/Express app like this; a
   `Dockerfile` isn't included here since Railway/Render both build
   directly from `package.json`, but add one if your host needs it.
2. Set `RELEVANCE_TOOL_SECRET` and `FRONTEND_ORIGIN` as real environment
   variables on that host (not the `.env` file, which is dev-only).
3. Put that deployed URL into Relevance AI as `BOLT_BACKEND_URL` (see
   `relevance-ai/cleo-agent-config.md`).
4. Keep developing the frontend in Bolt against `localhost` or the
   WebContainer preview — only the deployed backend needs to be stable,
   since that's the only part Relevance AI calls into.

## What's a stub vs. what's real

Real and tested: upload/parse (CSV + Excel), profiling, the 4 validation
rules, diff preview, the gate, rule execution (actually mutates rows and
re-profiles the column), the audit trail, and the auth boundary between
Cleo and humans.

Intentionally stubbed for a 2-day prototype: `/api/export` returns 501 —
wire in a CSV/XLSX writer (`papaparse.unparse` / `XLSX.utils.json_to_sheet`
are already dependencies) when the Audit & Export screen needs a real
download. There's also no `recommendations` table yet — Cleo's proposed
recommendations are currently just its structured JSON output, not
persisted server-side; add one alongside the others in `db.ts` if the
Review & Approve screen should survive a page refresh mid-review. Only 4
of the 6 rules discussed earlier are implemented (state, email, phone,
categorical canonicalization) — median imputation and the cross-source
duplicate heuristic need either a second dataset or a grouping strategy
that felt like scope creep for this pass; `validator.ts`'s `RuleDefinition`
interface is built so adding either is a self-contained addition, not a
refactor.
