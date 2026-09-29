import type { NextFunction, Request, Response } from "express";

// Guards every /api/tools/* route. This is the ONLY thing that proves a
// call came from Cleo's Relevance AI agent rather than some other caller —
// it is deliberately separate from the human-approval check inside
// execute_rules_engine / save_workflow (see routes/tools.ts). A valid
// secret lets Cleo call any tool, including the gated ones; it does not by
// itself let a gated tool actually execute anything.
export function requireToolSecret(req: Request, res: Response, next: NextFunction) {
  const provided = req.header("x-cleo-tool-key");
  const expected = process.env.RELEVANCE_TOOL_SECRET;

  if (!expected) {
    console.error("RELEVANCE_TOOL_SECRET is not set — refusing all tool calls.");
    return res.status(500).json({ error: "server_misconfigured" });
  }

  if (!provided || provided !== expected) {
    return res.status(401).json({ error: "unauthorized", reason: "missing or invalid x-cleo-tool-key header" });
  }

  next();
}

// Guards the human-facing endpoints (/api/approvals, /api/upload,
// /api/export) called directly from the browser by a signed-in analyst,
// governance lead, or manager — never by Cleo. This prototype stands in a
// single check for whatever your real session/auth layer will be
// (Supabase Auth, Auth0, your own JWT, etc.) — replace the body, keep the
// shape: reject unauthenticated requests, attach the caller's identity.
export function requireFrontendSession(req: Request, res: Response, next: NextFunction) {
  const actor = req.header("x-dcs-user"); // e.g. "Maya Chen" — replace with real session lookup
  if (!actor) {
    return res.status(401).json({ error: "unauthorized", reason: "no authenticated user on request" });
  }
  req.actor = actor;
  next();
}
