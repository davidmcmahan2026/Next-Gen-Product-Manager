// The GATED execution path. This is the only code in the whole backend
// that actually mutates dataset rows — everything upstream of it
// (profiler, validator, diffPreview) only reads and reports. It is called
// exclusively from the execute_rules_engine route, which has already
// confirmed a human approval record exists for this recommendation before
// this function is ever reached (see routes/tools.ts).

import { applyRule } from "./validator.js";
import { appendAuditEntry } from "../db.js";
import type { Dataset } from "../types.js";

export async function executeApprovedRule(
  dataset: Dataset,
  ruleId: string,
  column: string,
  recommendationId: string
): Promise<{ rowsAffected: number }> {
  const rowsAffected = applyRule(dataset.rows, ruleId, column);

  // Re-profile the column after mutation so the UI reflects the new state
  // (null %, unique %, issue count) without a full re-upload.
  const { profileRows } = await import("./profiler.js");
  const freshProfiles = profileRows(dataset.rows);
  const idx = dataset.columns.findIndex((c) => c.name === column);
  const updated = freshProfiles.find((c) => c.name === column);
  if (idx >= 0 && updated) dataset.columns[idx] = updated;

  await appendAuditEntry({
    actor: "Rules Engine",
    action: "Execution completed",
    detail: `${recommendationId} · rule ${ruleId} applied to ${rowsAffected} rows in column "${column}"`,
    type: "execution",
  });

  return { rowsAffected };
}
