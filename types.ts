export interface ColumnProfile {
  name: string;
  type: "string" | "number" | "date";
  nullPercent: number;
  uniquePercent: number;
  issues: number;
}

export interface Dataset {
  id: string;
  fileName: string;
  uploadedBy: string;
  uploadedAt: string;
  rows: Record<string, unknown>[];
  columns: ColumnProfile[];
}

export interface RuleViolation {
  rule: string;
  column: string;
  rowsAffected: number;
  sampleBefore: string[];
  sampleAfter: string[];
}

export type ApprovalDecision = "approved" | "rejected";

export interface Approval {
  id: string;
  recommendationId: string;
  decision: ApprovalDecision;
  approvedBy: string;
  timestamp: string;
}

export type AuditType =
  | "upload"
  | "recommendation"
  | "approval"
  | "rejection"
  | "execution"
  | "export"
  | "policy";

export interface AuditEntry {
  id: string;
  timestamp: string;
  actor: string;
  action: string;
  detail: string;
  type: AuditType;
}

export type JobStatus = "queued" | "running" | "awaiting_approval" | "completed" | "failed";

export interface Job {
  id: string;
  datasetId: string;
  status: JobStatus;
  progress: number;
  updatedAt: string;
}

export interface Workflow {
  id: string;
  name: string;
  description: string;
  ruleIds: string[];
  createdAt: string;
  createdBy: string;
}
