// Deterministic validation rules — this is what the run_validator tool
// calls, and what rulesEngine.ts calls again (for real, on every row) once
// a recommendation is approved. Every rule is defined once as a
// `buildTransform`: a function that inspects the full column and returns a
// per-value transform. detect() uses it to sample a few before/after pairs
// as evidence; execute() uses the SAME transform to mutate every row, so
// what Cleo cited as evidence is guaranteed to match what actually runs.

import type { RuleViolation } from "../types.js";

export type ValueTransform = (raw: unknown) => string | null; // null = no change for this value

export interface RuleDefinition {
  id: string;
  appliesToColumn: (columnName: string) => boolean;
  // Inspects the full column (needed for rules like categorical
  // canonicalization, which must see every value before deciding what's
  // canonical) and returns a function to apply to each individual value.
  buildTransform: (rows: Record<string, unknown>[], column: string) => ValueTransform;
}

function isEmpty(value: unknown): boolean {
  return value === null || value === undefined || value === "";
}

function detect(rule: RuleDefinition, rows: Record<string, unknown>[], column: string): RuleViolation | null {
  const transform = rule.buildTransform(rows, column);
  const before: string[] = [];
  const after: string[] = [];
  let rowsAffected = 0;

  for (const row of rows) {
    const raw = row[column];
    if (isEmpty(raw)) continue;
    const next = transform(raw);
    if (next === null) continue;
    rowsAffected++;
    if (before.length < 4) {
      before.push(String(raw));
      after.push(next);
    }
  }

  return rowsAffected > 0
    ? { rule: rule.id, column, rowsAffected, sampleBefore: before, sampleAfter: after }
    : null;
}

function execute(rule: RuleDefinition, rows: Record<string, unknown>[], column: string): number {
  const transform = rule.buildTransform(rows, column);
  let rowsAffected = 0;

  for (const row of rows) {
    const raw = row[column];
    if (isEmpty(raw)) continue;
    const next = transform(raw);
    if (next === null) continue;
    row[column] = next;
    rowsAffected++;
  }

  return rowsAffected;
}

// ---- state_code_normalization_v3 ----

const US_STATES: Record<string, string> = {
  alabama: "AL", alaska: "AK", arizona: "AZ", arkansas: "AR", california: "CA",
  colorado: "CO", connecticut: "CT", delaware: "DE", florida: "FL", georgia: "GA",
  hawaii: "HI", idaho: "ID", illinois: "IL", indiana: "IN", iowa: "IA",
  kansas: "KS", kentucky: "KY", louisiana: "LA", maine: "ME", maryland: "MD",
  massachusetts: "MA", michigan: "MI", minnesota: "MN", mississippi: "MS", missouri: "MO",
  montana: "MT", nebraska: "NE", nevada: "NV", "new hampshire": "NH", "new jersey": "NJ",
  "new mexico": "NM", "new york": "NY", "north carolina": "NC", "north dakota": "ND", ohio: "OH",
  oklahoma: "OK", oregon: "OR", pennsylvania: "PA", "rhode island": "RI", "south carolina": "SC",
  "south dakota": "SD", tennessee: "TN", texas: "TX", utah: "UT", vermont: "VT",
  virginia: "VA", washington: "WA", "west virginia": "WV", wisconsin: "WI", wyoming: "WY",
  "district of columbia": "DC",
  calif: "CA", "calif.": "CA", tex: "TX", "tex.": "TX",
};

const stateCodeNormalization: RuleDefinition = {
  id: "state_code_normalization_v3",
  appliesToColumn: (name) => /state/i.test(name),
  buildTransform: () => (raw) => {
    const rawStr = String(raw);
    const key = rawStr.trim().toLowerCase().replace(/\.$/, "");
    const mapped = US_STATES[key] ?? (/^[a-z]{2}$/i.test(rawStr.trim()) ? rawStr.trim().toUpperCase() : null);
    if (!mapped) return null;
    const alreadyCanonical = /^[A-Z]{2}$/.test(rawStr) && rawStr === mapped;
    return alreadyCanonical ? null : mapped;
  },
};

// ---- email_format_cleanup_v2 ----

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const emailFormatCleanup: RuleDefinition = {
  id: "email_format_cleanup_v2",
  appliesToColumn: (name) => /email/i.test(name),
  buildTransform: () => (raw) => {
    const rawStr = String(raw);
    const cleaned = rawStr.trim().toLowerCase();
    return cleaned !== rawStr && EMAIL_RE.test(cleaned) ? cleaned : null;
  },
};

// ---- phone_e164_normalization ----

const phoneE164Normalization: RuleDefinition = {
  id: "phone_e164_normalization",
  appliesToColumn: (name) => /phone/i.test(name),
  buildTransform: () => (raw) => {
    const rawStr = String(raw);
    const digits = rawStr.replace(/\D/g, "");
    if (digits.length !== 10) return null; // ambiguous — leave for human review, don't guess
    const e164 = `+1${digits}`;
    return rawStr === e164 ? null : e164;
  },
};

// ---- categorical_canonicalization ----
// Flags/fixes low-cardinality text columns where the same value shows up
// with different casing/whitespace (e.g. "ent", "Enterprise ", "ENT").
// buildTransform scans the WHOLE column once to decide the canonical
// spelling per group (most frequent variant wins), then returns a
// transform that maps every non-canonical variant to it.

const categoricalCanonicalization: RuleDefinition = {
  id: "categorical_canonicalization",
  appliesToColumn: () => true, // gated by the cardinality check below, not the column name
  buildTransform: (rows, column) => {
    const values = rows.map((r) => r[column]).filter((v) => !isEmpty(v));
    const uniqueRatio = values.length ? new Set(values.map(String)).size / values.length : 1;

    if (uniqueRatio > 0.05) return () => null; // not a closed-set categorical column

    const variantsByNormalized = new Map<string, Map<string, number>>();
    for (const v of values) {
      const str = String(v);
      const normalized = str.trim().toLowerCase();
      if (!variantsByNormalized.has(normalized)) variantsByNormalized.set(normalized, new Map());
      const counts = variantsByNormalized.get(normalized)!;
      counts.set(str, (counts.get(str) ?? 0) + 1);
    }

    const canonicalByNormalized = new Map<string, string>();
    for (const [normalized, counts] of variantsByNormalized.entries()) {
      const [canonical] = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];
      canonicalByNormalized.set(normalized, canonical);
    }

    return (raw) => {
      const str = String(raw);
      const canonical = canonicalByNormalized.get(str.trim().toLowerCase());
      return canonical && canonical !== str ? canonical : null;
    };
  },
};

export const RULES: RuleDefinition[] = [
  stateCodeNormalization,
  emailFormatCleanup,
  phoneE164Normalization,
  categoricalCanonicalization,
];

export function getRule(ruleId: string): RuleDefinition | undefined {
  return RULES.find((r) => r.id === ruleId);
}

// ---- Public entry points used by the routes ----

export function runValidator(rows: Record<string, unknown>[], onlyColumn?: string): RuleViolation[] {
  if (rows.length === 0) return [];
  const columns = onlyColumn ? [onlyColumn] : Object.keys(rows[0]);
  const violations: RuleViolation[] = [];

  for (const column of columns) {
    for (const rule of RULES) {
      if (!rule.appliesToColumn(column)) continue;
      const result = detect(rule, rows, column);
      if (result) violations.push(result);
    }
  }

  return violations;
}

export function previewRule(rows: Record<string, unknown>[], ruleId: string, column: string): RuleViolation | null {
  const rule = getRule(ruleId);
  if (!rule) throw new Error(`Unknown rule: ${ruleId}`);
  return detect(rule, rows, column);
}

// Mutates `rows` in place. Only ever called from execute_rules_engine,
// which only reaches this after confirming an approval record exists.
export function applyRule(rows: Record<string, unknown>[], ruleId: string, column: string): number {
  const rule = getRule(ruleId);
  if (!rule) throw new Error(`Unknown rule: ${ruleId}`);
  return execute(rule, rows, column);
}
