// In-memory data store for the 2-day prototype.
//
// This is intentionally NOT Postgres yet: Bolt's dev runtime (StackBlitz
// WebContainers) can't run native binaries, so a locally-installed Postgres
// or a native driver like `pg` won't work inside it. For the prototype,
// keeping everything in memory in this one file means zero setup and the
// exact same code runs whether you're iterating in Bolt or have deployed
// the backend elsewhere.
//
// To make this durable later without changing the routes/lib files above
// it, swap the bodies of the functions below for calls to a Postgres
// provider with an HTTP/WebSocket driver (WebContainer-compatible,
// unlike a raw TCP driver) — e.g. Neon's serverless driver:
//
//   import { neon } from "@neondatabase/serverless";
//   const sql = neon(process.env.DATABASE_URL!);
//   export async function getDataset(id: string) {
//     const rows = await sql`select * from datasets where id = ${id}`;
//     return rows[0];
//   }
//
// Every function here is already `async` for that reason, even though the
// in-memory version doesn't need to be.

import { randomUUID } from "node:crypto";
import type {
  Approval,
  ApprovalDecision,
  AuditEntry,
  AuditType,
  Dataset,
  Job,
  Workflow,
} from "./types.js";

const datasets = new Map<string, Dataset>();
const approvalsByRecommendation = new Map<string, Approval>();
const auditLog: AuditEntry[] = [];
const jobs = new Map<string, Job>();
const workflows: Workflow[] = [];

// ---- Datasets (written by the internal /api/upload route — Parser) ----

export async function createDataset(input: Omit<Dataset, "id" | "uploadedAt">): Promise<Dataset> {
  const dataset: Dataset = {
    ...input,
    id: randomUUID(),
    uploadedAt: new Date().toISOString(),
  };
  datasets.set(dataset.id, dataset);
  return dataset;
}

export async function getDataset(id: string): Promise<Dataset | undefined> {
  return datasets.get(id);
}

// ---- Approvals — the gate's source of truth ----
// A row here can ONLY be created by /api/approvals, which is called from
// the Review & Approve screen when a human clicks a button. Cleo has no
// path to this table — it isn't one of Cleo's tools.

export async function recordApproval(
  recommendationId: string,
  decision: ApprovalDecision,
  approvedBy: string
): Promise<Approval> {
  const approval: Approval = {
    id: randomUUID(),
    recommendationId,
    decision,
    approvedBy,
    timestamp: new Date().toISOString(),
  };
  approvalsByRecommendation.set(recommendationId, approval);
  return approval;
}

export async function getApproval(recommendationId: string): Promise<Approval | undefined> {
  return approvalsByRecommendation.get(recommendationId);
}

// ---- Audit log — append-only ----

export async function appendAuditEntry(entry: {
  actor: string;
  action: string;
  detail: string;
  type: AuditType;
}): Promise<AuditEntry> {
  const full: AuditEntry = {
    ...entry,
    id: randomUUID(),
    timestamp: new Date().toISOString(),
  };
  auditLog.push(full);
  return full;
}

export async function listAuditEntries(): Promise<AuditEntry[]> {
  return [...auditLog].sort((a, b) => a.timestamp.localeCompare(b.timestamp));
}

// ---- Jobs ----

export async function createJob(datasetId: string): Promise<Job> {
  const job: Job = {
    id: randomUUID(),
    datasetId,
    status: "queued",
    progress: 0,
    updatedAt: new Date().toISOString(),
  };
  jobs.set(job.id, job);
  return job;
}

export async function updateJob(id: string, patch: Partial<Pick<Job, "status" | "progress">>): Promise<Job | undefined> {
  const job = jobs.get(id);
  if (!job) return undefined;
  Object.assign(job, patch, { updatedAt: new Date().toISOString() });
  return job;
}

export async function getJob(id: string): Promise<Job | undefined> {
  return jobs.get(id);
}

// ---- Workflow registry (gated — written only via save_workflow after approval) ----

export async function saveWorkflow(input: Omit<Workflow, "id" | "createdAt">): Promise<Workflow> {
  const workflow: Workflow = {
    ...input,
    id: randomUUID(),
    createdAt: new Date().toISOString(),
  };
  workflows.push(workflow);
  return workflow;
}

export async function listWorkflows(): Promise<Workflow[]> {
  return [...workflows];
}
