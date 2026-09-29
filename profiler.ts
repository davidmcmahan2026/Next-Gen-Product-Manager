// Deterministic column profiling — this is what the get_profile tool calls.
// No LLM involved: same input always produces the same output.

import type { ColumnProfile } from "../types.js";

function isEmpty(value: unknown): boolean {
  return value === null || value === undefined || value === "";
}

function inferType(values: unknown[]): ColumnProfile["type"] {
  const nonNull = values.filter((v) => !isEmpty(v));
  if (nonNull.length === 0) return "string";

  const allNumeric = nonNull.every(
    (v) => typeof v === "number" || (typeof v === "string" && v.trim() !== "" && !Number.isNaN(Number(v)))
  );
  if (allNumeric) return "number";

  const looksLikeDate = (v: unknown) => {
    const s = String(v).trim();
    return /^\d{4}-\d{2}-\d{2}/.test(s) || /^\d{1,2}\/\d{1,2}\/\d{2,4}$/.test(s);
  };
  if (nonNull.every(looksLikeDate)) return "date";

  return "string";
}

function countFormatIssues(values: unknown[], type: ColumnProfile["type"]): number {
  if (type !== "string") return 0;

  let issues = 0;
  const variantsByNormalized = new Map<string, Set<string>>();

  for (const v of values) {
    if (isEmpty(v)) continue;
    const str = String(v);
    if (str !== str.trim()) issues++;

    const normalized = str.trim().toLowerCase();
    if (!variantsByNormalized.has(normalized)) variantsByNormalized.set(normalized, new Set());
    variantsByNormalized.get(normalized)!.add(str.trim());
  }

  for (const variants of variantsByNormalized.values()) {
    if (variants.size > 1) issues += variants.size;
  }

  return issues;
}

export function profileRows(rows: Record<string, unknown>[]): ColumnProfile[] {
  if (rows.length === 0) return [];
  const columnNames = Object.keys(rows[0]);
  const total = rows.length;

  return columnNames.map((name) => {
    const values = rows.map((r) => r[name]);
    const nullCount = values.filter(isEmpty).length;
    const nonNullValues = values.filter((v) => !isEmpty(v));
    const uniqueCount = new Set(nonNullValues.map((v) => String(v))).size;
    const type = inferType(values);

    return {
      name,
      type,
      nullPercent: total ? Math.round((nullCount / total) * 1000) / 10 : 0,
      uniquePercent: nonNullValues.length
        ? Math.round((uniqueCount / nonNullValues.length) * 1000) / 10
        : 0,
      issues: countFormatIssues(values, type),
    };
  });
}
