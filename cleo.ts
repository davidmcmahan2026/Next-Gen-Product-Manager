// Starts a Cleo run (Bolt -> Relevance AI) and receives its result
// (Relevance AI -> Bolt). See relevance-ai/cleo-agent-config.md section 4
// for the full sequence and why this is two routes, not one — triggering
// an agent in Relevance AI is asynchronous, so /analyze does not return
// Cleo's output; /callback receives it later, separately, as a webhook.

import { Router } from "express";
import { appendAuditEntry } from "../db.js";

// Two separate routers, deliberately: they're mounted with two different
// auth checks in server.ts. Combining them under one Router would force
// both routes to share whichever middleware wraps it, which is exactly
// wrong here — /analyze needs a human session, /callback needs its own
// secret and must NOT require a human session (Relevance AI's webhook
// call has no analyst session to send).

export const cleoRouter = Router();
export const cleoCallbackRouter = Router();

// Mounted behind requireFrontendSession in server.ts — called by the
// "Send to Cleo for analysis" button, carrying the analyst's own session.
cleoRouter.post("/analyze", async (req, res) => {
  const { datasetId, jobId } = req.body as { datasetId?: string; jobId?: string };
  if (!datasetId) return res.status(400).json({ error: "datasetId is required" });

  const triggerUrl = process.env.RELEVANCE_TRIGGER_URL;
  const apiKey = process.env.RELEVANCE_AI_API_KEY;
  const agentId = process.env.RELEVANCE_CLEO_AGENT_ID;
  if (!triggerUrl || !apiKey || !agentId) {
    console.error("Relevance AI trigger is not configured (RELEVANCE_TRIGGER_URL / RELEVANCE_AI_API_KEY / RELEVANCE_CLEO_AGENT_ID).");
    return res.status(500).json({ error: "server_misconfigured" });
  }

  // Copy the exact URL and auth header format from your agent's own
  // Triggers tab in Relevance AI — both can differ from this example.
  const response = await fetch(triggerUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: apiKey },
    body: JSON.stringify({
      agent_id: agentId,
      message: { role: "user", content: JSON.stringify({ datasetId, jobId }) },
    }),
  });

  if (!response.ok) {
    return res.status(502).json({ error: "failed to trigger Cleo", status: response.status });
  }

  // The trigger response is an acknowledgement, not Cleo's output — the
  // real result arrives later at /callback below.
  res.json({ triggered: true, jobId });
});

// Configure this route's full URL as the trigger's destination/webhook in
// Relevance AI. Called BY Relevance AI when Cleo's run finishes — never by
// a human — so it is mounted separately in server.ts (NOT behind
// requireFrontendSession) and checks its own secret instead.
cleoCallbackRouter.post("/callback", async (req, res) => {
  const provided = req.header("x-cleo-callback-key");
  const expected = process.env.RELEVANCE_CALLBACK_SECRET;
  if (!expected || provided !== expected) {
    return res.status(401).json({ error: "unauthorized" });
  }

  const { jobId, recommendations, summary } = req.body as {
    jobId?: string;
    recommendations?: unknown[];
    summary?: string;
  };

  // Prototype stub: this is where parsed recommendations would be
  // persisted (a `recommendations` store alongside the others in db.ts)
  // so the Review & Approve screen can render them instead of mock data.
  // Not built yet — logging to the audit trail so the round trip is at
  // least visible end to end.
  await appendAuditEntry({
    actor: "Cleo",
    action: "Analysis complete",
    detail: `job ${jobId ?? "unknown"}: ${summary ?? `${recommendations?.length ?? 0} recommendations`}`,
    type: "recommendation",
  });

  res.json({ received: true });
});
