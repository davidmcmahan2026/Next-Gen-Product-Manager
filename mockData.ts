// DataClean Studio — Cleo mock data
// Realistic sample dataset used to power every persona screen in this
// prototype. Swap these arrays/functions for real API calls once Cleo
// (Relevance AI) and the Bolt backend are wired up — see README.md.

export type ConfidenceLevel = "high" | "medium" | "low";
export type RecommendationStatus = "pending" | "approved" | "rejected" | "applied";
export type JobStatus = "queued" | "running" | "awaiting_approval" | "completed" | "failed";
export type AuditType = "upload" | "recommendation" | "approval" | "rejection" | "execution" | "export" | "policy";

export interface Evidence {
  rows: number;
  column: string;
  rule: string;
  sample: string[];
}

export interface Recommendation {
  id: string;
  action: string;
  column: string;
  confidence: ConfidenceLevel;
  confidenceScore: number; // 0-100
  evidence: Evidence;
  explanation: string;
  status: RecommendationStatus;
  gated: boolean; // true = execution routes through the Rules Engine gate
  before: string[];
  after: string[];
}

export interface AuditEntry {
  id: string;
  timestamp: string;
  actor: string;
  action: string;
  detail: string;
  type: AuditType;
}

export interface ColumnProfile {
  name: string;
  type: string;
  nullPercent: number;
  uniquePercent: number;
  issues: number;
}

export interface DatasetSummary {
  fileName: string;
  rowCount: number;
  columnCount: number;
  uploadedBy: string;
  uploadedAt: string;
  status: "processing" | "ready" | "reviewed" | "exported";
}

export interface WorkflowJob {
  id: string;
  name: string;
  dataset: string;
  submittedBy: string;
  status: JobStatus;
  progress: number;
  confidenceAvg: number;
  pendingApprovals: number;
  updatedAt: string;
}

export const currentDataset: DatasetSummary = {
  fileName: "customer_master_q3.csv",
  rowCount: 48213,
  columnCount: 17,
  uploadedBy: "Maya Chen",
  uploadedAt: "2026-09-17 09:14",
  status: "ready",
};

export const columnProfiles: ColumnProfile[] = [
  { name: "customer_id", type: "string", nullPercent: 0, uniquePercent: 100, issues: 0 },
  { name: "email", type: "string", nullPercent: 2.1, uniquePercent: 98.4, issues: 312 },
  { name: "phone", type: "string", nullPercent: 8.7, uniquePercent: 91.2, issues: 891 },
  { name: "state", type: "string", nullPercent: 0.4, uniquePercent: 0.1, issues: 1204 },
  { name: "signup_date", type: "date", nullPercent: 1.2, uniquePercent: 64.3, issues: 47 },
  { name: "lifetime_value", type: "number", nullPercent: 3.9, uniquePercent: 88.1, issues: 156 },
  { name: "segment", type: "string", nullPercent: 0, uniquePercent: 0.02, issues: 63 },
];

export const recommendations: Recommendation[] = [
  {
    id: "rec-001",
    action: "Standardize state codes to USPS 2-letter format",
    column: "state",
    confidence: "high",
    confidenceScore: 96,
    evidence: {
      rows: 1204,
      column: "state",
      rule: "state_code_normalization_v3",
      sample: ["California", "Calif.", "CALIFORNIA", "N.Y."],
    },
    explanation:
      "1,204 rows use full names, abbreviations, or inconsistent casing instead of USPS codes. All values map unambiguously to a known state — no fuzzy matching was required.",
    status: "pending",
    gated: true,
    before: ["California", "N.Y.", "Calif.", "texas"],
    after: ["CA", "NY", "CA", "TX"],
  },
  {
    id: "rec-002",
    action: "Trim and lowercase malformed email addresses",
    column: "email",
    confidence: "high",
    confidenceScore: 92,
    evidence: {
      rows: 312,
      column: "email",
      rule: "email_format_cleanup_v2",
      sample: ["Jane.Doe@EXAMPLE.com ", " bob@acme .co", "R.SMITH@MAIL.COM"],
    },
    explanation:
      "312 rows contain leading/trailing whitespace or inconsistent casing in the local or domain part. Regex validation confirms all resulting addresses are well-formed.",
    status: "pending",
    gated: true,
    before: ["Jane.Doe@EXAMPLE.com ", "R.SMITH@MAIL.COM"],
    after: ["jane.doe@example.com", "r.smith@mail.com"],
  },
  {
    id: "rec-003",
    action: "Impute missing lifetime_value using segment median",
    column: "lifetime_value",
    confidence: "medium",
    confidenceScore: 71,
    evidence: {
      rows: 156,
      column: "lifetime_value",
      rule: "median_imputation_by_group",
      sample: ["null (segment: SMB)", "null (segment: Enterprise)"],
    },
    explanation:
      "156 rows are missing lifetime_value. Segment-level median imputation is statistically reasonable but changes underlying values rather than formatting — flagged medium confidence for that reason.",
    status: "pending",
    gated: true,
    before: ["null", "null", "null"],
    after: ["$4,210 (SMB median)", "$38,900 (Enterprise median)", "$4,210 (SMB median)"],
  },
  {
    id: "rec-004",
    action: "Reformat phone numbers to E.164",
    column: "phone",
    confidence: "medium",
    confidenceScore: 68,
    evidence: {
      rows: 891,
      column: "phone",
      rule: "phone_e164_normalization",
      sample: ["(555) 019-2231", "555.019.2231", "5550192231"],
    },
    explanation:
      "891 rows use mixed formatting. Country code is assumed as +1 for all rows with 10-digit numbers, which is likely but not confirmed by any explicit country field — review before applying.",
    status: "pending",
    gated: true,
    before: ["(555) 019-2231", "555.019.2231"],
    after: ["+15550192231", "+15550192231"],
  },
  {
    id: "rec-005",
    action: "Flag duplicate customer_id after merge with legacy CRM export",
    column: "customer_id",
    confidence: "low",
    confidenceScore: 41,
    evidence: {
      rows: 63,
      column: "customer_id",
      rule: "cross_source_duplicate_heuristic",
      sample: ["CUST-88291 ≈ LEG-88291-A", "CUST-11042 ≈ LEG-11042-B"],
    },
    explanation:
      "63 rows share a fuzzy-matched name+email pair with a row in the legacy export, but IDs don't align on any deterministic key. Confidence is intentionally low — this needs a human judgment call, not an automated merge.",
    status: "pending",
    gated: false,
    before: ["CUST-88291", "CUST-11042"],
    after: ["Needs manual review — no automatic change proposed"],
  },
  {
    id: "rec-006",
    action: "Collapse segment label variants into 4 canonical tiers",
    column: "segment",
    confidence: "high",
    confidenceScore: 94,
    evidence: {
      rows: 63,
      column: "segment",
      rule: "categorical_canonicalization",
      sample: ["ent", "Enterprise ", "ENT", "smb", "SMB "],
    },
    explanation:
      "63 rows use inconsistent capitalization or abbreviation of an otherwise closed set of 4 segment values. Mapping is 1:1 and reversible.",
    status: "approved",
    gated: true,
    before: ["ent", "SMB ", "ENT"],
    after: ["Enterprise", "SMB", "Enterprise"],
  },
];

export const auditTrail: AuditEntry[] = [
  {
    id: "a-001",
    timestamp: "2026-09-17 09:14:02",
    actor: "Maya Chen",
    action: "Dataset uploaded",
    detail: "customer_master_q3.csv (48,213 rows, 17 columns)",
    type: "upload",
  },
  {
    id: "a-002",
    timestamp: "2026-09-17 09:14:41",
    actor: "Cleo",
    action: "Profiling complete",
    detail: "get_profile → 7 columns scanned, 6 recommendations generated",
    type: "recommendation",
  },
  {
    id: "a-003",
    timestamp: "2026-09-17 09:15:03",
    actor: "Cleo",
    action: "Recommendation proposed",
    detail: "rec-001 · Standardize state codes · confidence 96%",
    type: "recommendation",
  },
  {
    id: "a-004",
    timestamp: "2026-09-17 09:15:04",
    actor: "Cleo",
    action: "Recommendation proposed",
    detail: "rec-005 · Flag duplicate customer_id · confidence 41%",
    type: "recommendation",
  },
  {
    id: "a-005",
    timestamp: "2026-09-17 10:02:18",
    actor: "Maya Chen",
    action: "Recommendation approved",
    detail: "rec-006 · Collapse segment label variants",
    type: "approval",
  },
  {
    id: "a-006",
    timestamp: "2026-09-17 10:02:19",
    actor: "Rules Engine",
    action: "Execution completed",
    detail: "rec-006 applied to 63 rows · gated tool execute_rules_engine",
    type: "execution",
  },
  {
    id: "a-007",
    timestamp: "2026-09-17 10:04:55",
    actor: "Priya Nair",
    action: "Policy reviewed",
    detail: "Confirmed lifetime_value imputation rule meets data governance policy DG-14",
    type: "policy",
  },
  {
    id: "a-008",
    timestamp: "2026-09-17 11:20:07",
    actor: "Ethan Brooks",
    action: "Export generated",
    detail: "Cleaned subset exported as customer_master_q3_clean.csv",
    type: "export",
  },
];

export const workflowJobs: WorkflowJob[] = [
  {
    id: "job-104",
    name: "Q3 Customer Master Cleanup",
    dataset: "customer_master_q3.csv",
    submittedBy: "Maya Chen",
    status: "awaiting_approval",
    progress: 65,
    confidenceAvg: 77,
    pendingApprovals: 5,
    updatedAt: "2026-09-17 10:04",
  },
  {
    id: "job-103",
    name: "Vendor Contact Dedup",
    dataset: "vendor_contacts_sep.xlsx",
    submittedBy: "Ethan Brooks",
    status: "running",
    progress: 32,
    confidenceAvg: 84,
    pendingApprovals: 0,
    updatedAt: "2026-09-17 09:48",
  },
  {
    id: "job-102",
    name: "Support Ticket Field Normalization",
    dataset: "zendesk_export_aug.csv",
    submittedBy: "Ethan Brooks",
    status: "completed",
    progress: 100,
    confidenceAvg: 91,
    pendingApprovals: 0,
    updatedAt: "2026-09-16 17:32",
  },
  {
    id: "job-101",
    name: "Marketing List Hygiene",
    dataset: "campaign_leads_q3.csv",
    submittedBy: "Maya Chen",
    status: "failed",
    progress: 18,
    confidenceAvg: 0,
    pendingApprovals: 0,
    updatedAt: "2026-09-16 14:02",
  },
];

export const gatedActionsQueue = recommendations.filter((r) => r.gated && r.status === "pending");

export const confidenceDistribution = [
  { label: "High (85-100%)", value: 3, color: "#2c6e8c" },
  { label: "Medium (60-84%)", value: 2, color: "#b5502c" },
  { label: "Low (<60%)", value: 1, color: "#8a8378" },
];

export const teamStats = {
  activeJobs: 2,
  awaitingApproval: 5,
  completedThisWeek: 11,
  avgTimeToApprovalHours: 3.4,
  autoFlaggedLowConfidence: 4,
};

export const personas = [
  { id: "maya", name: "Maya Chen", role: "Data Analyst", initials: "MC" },
  { id: "ethan", name: "Ethan Brooks", role: "Data Analyst", initials: "EB" },
  { id: "priya", name: "Priya Nair", role: "Data Governance Lead", initials: "PN" },
  { id: "daniel", name: "Daniel Osei", role: "Engineering Manager", initials: "DO" },
] as const;

export type PersonaId = (typeof personas)[number]["id"];
