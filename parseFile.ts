// Server-side CSV/Excel parsing — used only by the internal /api/upload
// route (the Parser box in the architecture diagram). Cleo never calls
// this directly; it only ever sees the profile that get_profile computes
// from the rows this produces.

import Papa from "papaparse";
import * as XLSX from "xlsx";

export interface ParsedFile {
  rows: Record<string, unknown>[];
}

export function parseCsvBuffer(buffer: Buffer): ParsedFile {
  const text = buffer.toString("utf-8");
  const result = Papa.parse<Record<string, unknown>>(text, {
    header: true,
    skipEmptyLines: true,
    dynamicTyping: true,
  });
  if (result.errors.length > 0) {
    throw new Error(result.errors[0].message);
  }
  return { rows: result.data };
}

export function parseExcelBuffer(buffer: Buffer): ParsedFile {
  const workbook = XLSX.read(buffer, { type: "buffer" });
  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) throw new Error("Workbook has no sheets.");
  const sheet = workbook.Sheets[firstSheetName];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: null });
  return { rows };
}

export function parseUploadedFile(originalName: string, mimeType: string, buffer: Buffer): ParsedFile {
  const isCsv = originalName.toLowerCase().endsWith(".csv") || mimeType === "text/csv";
  const parsed = isCsv ? parseCsvBuffer(buffer) : parseExcelBuffer(buffer);
  if (parsed.rows.length === 0) {
    throw new Error("No rows found — check the file has a header row and at least one data row.");
  }
  return parsed;
}
