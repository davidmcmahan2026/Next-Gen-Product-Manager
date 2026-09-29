// The ONLY place an approval record can be created. This route is called
// from the Review & Approve screen's Approve/Reject buttons — by a signed-in
// human, behind requireFrontendSession — never by Cleo, and never by
// anything holding just the Relevance AI tool secret. execute_rules_engine
// and save_workflow (in routes/tools.ts) both check getApproval() before
// doing anything; this route is the only writer of that table.

import { Router } from "express";
import { recordApproval, appendAuditEntry } from "../db.js";

export const approvalsRouter = Router();

approvalsRouter.post("/", async (req, res) => {
  const { recommendationId, decision } = req.body as {
    recommendationId?: string;
    decision?: "approved" | "rejected";
  };
  const actor = req.actor;

  if (!recommendationId || !decision || !actor) {
    return res.status(400).json({ error: "recommendationId, decision, and an authenticated user are required" });
  }
  if (decision !== "approved" && decision !== "rejected") {
    return res.status(400).json({ error: "decision must be 'approved' or 'rejected'" });
  }

  const approval = await recordApproval(recommendationId, decision, actor);

  await appendAuditEntry({
    actor,
    action: decision === "approved" ? "Recommendation approved" : "Recommendation rejected",
    detail: recommendationId,
    type: decision === "approved" ? "approval" : "rejection",
  });

  res.json({ approval });
});
