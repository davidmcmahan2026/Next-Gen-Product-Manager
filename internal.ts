// Endpoints the browser calls directly — Maya/Ethan's Upload and Audit &
// Export screens. These are NOT registered as Relevance AI tools and are
// not reachable with the tool secret; they sit behind requireFrontendSession
// instead (mounted in server.ts). This is the Parser and Export boundary
// from the architecture diagram: Cleo never sees a raw file and never
// produces the export — both only ever go through a human's own request.

import { Router } from "express";
import multer from "multer";
import { createDataset, createJob, listAuditEntries, appendAuditEntry } from "../db.js";
import { parseUploadedFile } from "../lib/parseFile.js";
import { profileRows } from "../lib/profiler.js";

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 200 * 1024 * 1024 } });

export const internalRouter = Router();

// ---- Parser (hidden from Cleo) ----
internalRouter.post("/upload", upload.single("file"), async (req, res) => {
  const file = req.file;
  const actor = req.actor ?? "unknown";
  if (!file) return res.status(400).json({ error: "no file provided (field name: file)" });

  try {
    const { rows } = parseUploadedFile(file.originalname, file.mimetype, file.buffer);
    const columns = profileRows(rows);

    const dataset = await createDataset({
      fileName: file.originalname,
      uploadedBy: actor,
      rows,
      columns,
    });

    const job = await createJob(dataset.id);

    await appendAuditEntry({
      actor,
      action: "Dataset uploaded",
      detail: `${file.originalname} (${rows.length.toLocaleString()} rows, ${columns.length} columns)`,
      type: "upload",
    });

    res.json({
      datasetId: dataset.id,
      jobId: job.id,
      rowCount: rows.length,
      columns,
    });
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : "failed to parse file" });
  }
});

// ---- Export (hidden from Cleo) ----
// Prototype stub: a real implementation would stream the (possibly
// rule-modified) dataset back out as CSV/XLSX. Left as a clearly-marked
// stub so this file stays focused on the ingestion path the question
// asked about; wire in a CSV writer here when the export screen needs it.
internalRouter.post("/export", async (req, res) => {
  const { datasetId, format } = req.body as { datasetId?: string; format?: "csv" | "xlsx" };
  if (!datasetId) return res.status(400).json({ error: "datasetId is required" });

  const actor = req.actor ?? "unknown";
  await appendAuditEntry({
    actor,
    action: "Export generated",
    detail: `Dataset ${datasetId} exported as ${format ?? "csv"}`,
    type: "export",
  });

  res.status(501).json({ error: "not_implemented", note: "wire up a CSV/XLSX writer here" });
});

// ---- Audit trail read (frontend only, not a Cleo tool) ----
internalRouter.get("/audit-log", async (_req, res) => {
  res.json({ entries: await listAuditEntries() });
});
