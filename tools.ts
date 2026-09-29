// The 7 endpoints registered as Tools in Relevance AI (see
// relevance-ai/tools.json). Every route here sits behind
// requireToolSecret (mounted in server.ts), so only Relevance AI's Cleo
// agent — or anything else holding RELEVANCE_TOOL_SECRET — can reach them.
//
// 5 are open (get_profile, run_validator, get_diff_preview,
// write_audit_log, check_job_status): Cleo can call these freely, any
// time, with no side effects beyond logging.
//
// 2 are gated (execute_rules_engine, save_workflow): Cleo can CALL them
// (the secret lets the request through), but each one separately checks
// the approvals table for a human decision before doing anything. No
// approval record → 403 "denied", exactly as described in Cleo's system
// prompt. This is the enforcement point for the whole human-in-the-loop
// design — it lives here in code, not in Cleo's instructions.

import { Router } from "express";
import {
  appendAuditEntry,
  getApproval,
  getDataset,
  getJob,
  saveWorkflow as saveWorkflowRecord,
} from "../db.js";
import { runValidator } from "../lib/validator.js";
import { getDiffPreview } from "../lib/diffPreview.js";
import { executeApprovedRule } from "../lib/rulesEngine.js";

export const toolsRouter = Router();

// ---- OPEN: get_profile ----
toolsRouter.post("/get_profile", async (req, res) => {
  const { datasetId } = req.body as { datasetId?: string };
  if (!datasetId) return res.status(400).json({ error: "datasetId is required" });

  const dataset = await getDataset(datasetId);
  if (!dataset) return res.status(404).json({ error: "dataset not found" });

  res.json({ datasetId, rowCount: dataset.rows.length, columns: dataset.columns });
});

// ---- OPEN: run_validator ----
toolsRouter.post("/run_validator", async (req, res) => {
  const { datasetId, column } = req.body as { datasetId?: string; column?: string };
  if (!datasetId) return res.status(400).json({ error: "datasetId is required" });

  const dataset = await getDataset(datasetId);
  if (!dataset) return res.status(404).json({ error: "dataset not found" });

  const violations = runValidator(dataset.rows, column);
  res.json({ datasetId, violations });
});

// ---- OPEN: get_diff_preview ----
toolsRouter.post("/get_diff_preview", async (req, res) => {
  const { datasetId, ruleId, column } = req.body as {
    datasetId?: string;
    ruleId?: string;
    column?: string;
  };
  if (!datasetId || !ruleId || !column) {
    return res.status(400).json({ error: "datasetId, ruleId, and column are required" });
  }

  const dataset = await getDataset(datasetId);
  if (!dataset) return res.status(404).json({ error: "dataset not found" });

  try {
    const preview = getDiffPreview(dataset.rows, ruleId, column);
    res.json({ datasetId, preview });
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : "invalid rule" });
  }
});

// ---- OPEN: write_audit_log ----
// Cleo calls this itself for its own reasoning steps (e.g. "recommendation
// proposed") — separate from the audit entries Bolt writes on its own for
// approvals and executions, which don't need Cleo to ask.
toolsRouter.post("/write_audit_log", async (req, res) => {
  const { actor, action, detail, type } = req.body as {
    actor?: string;
    action?: string;
    detail?: string;
    type?: string;
  };
  if (!actor || !action || !detail || !type) {
    return res.status(400).json({ error: "actor, action, detail, and type are required" });
  }

  const entry = await appendAuditEntry({
    actor,
    action,
    detail,
    type: type as import("../types.js").AuditType,
  });
  res.json({ logged: true, entry });
});

// ---- OPEN: check_job_status ----
toolsRouter.post("/check_job_status", async (req, res) => {
  const { jobId } = req.body as { jobId?: string };
  if (!jobId) return res.status(400).json({ error: "jobId is required" });

  const job = await getJob(jobId);
  if (!job) return res.status(404).json({ error: "job not found" });

  res.json({ jobId: job.id, status: job.status, progress: job.progress });
});

// ---- GATED: execute_rules_engine ----
toolsRouter.post("/execute_rules_engine", async (req, res) => {
  const { datasetId, ruleId, column, recommendationId } = req.body as {
    datasetId?: string;
    ruleId?: string;
    column?: string;
    recommendationId?: string;
  };
  if (!datasetId || !ruleId || !column || !recommendationId) {
    return res.status(400).json({
      error: "datasetId, ruleId, column, and recommendationId are required",
    });
  }

  const approval = await getApproval(recommendationId);
  if (!approval || approval.decision !== "approved") {
    // This is the gate. Cleo's request reached this line — the tool
    // secret was valid — but there is no human approval on record, so
    // nothing executes. Cleo's system prompt tells it to expect exactly
    // this response and never imply the change was applied.
    return res.status(403).json({
      error: "denied",
      reason: approval
        ? `recommendation ${recommendationId} was ${approval.decision}, not approved`
        : `no approval record found for recommendation ${recommendationId}`,
    });
  }

  const dataset = await getDataset(datasetId);
  if (!dataset) return res.status(404).json({ error: "dataset not found" });

  try {
    const result = await executeApprovedRule(dataset, ruleId, column, recommendationId);
    res.json({ applied: true, ...result });
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : "execution failed" });
  }
});

// ---- GATED: save_workflow ----
toolsRouter.post("/save_workflow", async (req, res) => {
  const { name, description, ruleIds, recommendationId, createdBy } = req.body as {
    name?: string;
    description?: string;
    ruleIds?: string[];
    recommendationId?: string;
    createdBy?: string;
  };
  if (!name || !description || !ruleIds?.length || !recommendationId) {
    return res.status(400).json({
      error: "name, description, ruleIds, and recommendationId are required",
    });
  }

  const approval = await getApproval(recommendationId);
  if (!approval || approval.decision !== "approved") {
    return res.status(403).json({
      error: "denied",
      reason: approval
        ? `recommendation ${recommendationId} was ${approval.decision}, not approved`
        : `no approval record found for recommendation ${recommendationId}`,
    });
  }

  const workflow = await saveWorkflowRecord({
    name,
    description,
    ruleIds,
    createdBy: createdBy ?? "Cleo (approved)",
  });

  await appendAuditEntry({
    actor: "Workflow Registry",
    action: "Workflow saved",
    detail: `"${name}" registered with rules: ${ruleIds.join(", ")}`,
    type: "execution",
  });

  res.json({ saved: true, workflow });
});
