import "dotenv/config";
import express from "express";
import cors from "cors";
import { requireToolSecret, requireFrontendSession } from "./middleware/auth.js";
import { toolsRouter } from "./routes/tools.js";
import { internalRouter } from "./routes/internal.js";
import { approvalsRouter } from "./routes/approvals.js";
import { cleoRouter, cleoCallbackRouter } from "./routes/cleo.js";

const app = express();
app.use(express.json({ limit: "25mb" }));

// CORS only matters for browser calls (the Upload/Review/Audit screens
// calling this backend from the user's browser). Relevance AI calls
// /api/tools/* server-to-server, so CORS doesn't apply to that traffic —
// the x-cleo-tool-key header is what secures it, not the origin.
app.use(cors({ origin: process.env.FRONTEND_ORIGIN ?? "http://localhost:5173" }));

// Route mount order matters a lot here, more than it looks. Express
// matches app.use() by PATH PREFIX, in registration order, and runs that
// mount's middleware as soon as the prefix matches — even if the router
// behind it turns out to have no matching sub-route. So every specific
// mount below is registered before the broad "/api" catch-all at the
// bottom; if that general mount were registered first, its
// requireFrontendSession would run (and reject) for /api/approvals and
// /api/cleo/* requests too, since they all start with "/api", before
// their own more specific — and differently-gated — mounts ever ran.
// (This bit an earlier draft of this file: /api/cleo/callback was
// rejected by the wrong middleware because the general mount came first.)

// The 7 tools Cleo (running in Relevance AI) calls. See routes/tools.ts
// for which 5 are open and which 2 are gated, and relevance-ai/tools.json
// for the exact configuration registered on the Relevance AI side.
app.use("/api/tools", requireToolSecret, toolsRouter);

// Approve/reject a recommendation — the only way a gated tool call can
// ever succeed. Human-facing, never Cleo.
app.use("/api/approvals", requireFrontendSession, approvalsRouter);

// Receives Cleo's finished result from Relevance AI's webhook — NOT
// human-facing, so this must be registered (and therefore matched) before
// the gated /api/cleo/analyze mount below, and it checks its own
// x-cleo-callback-key secret instead of requireFrontendSession.
app.use("/api/cleo", cleoCallbackRouter);

// Starts a Cleo run — human-facing, behind the same session check as the
// other analyst-triggered endpoints.
app.use("/api/cleo", requireFrontendSession, cleoRouter);

// Human-facing endpoints — file upload/parsing (Parser), export, and audit
// log reads. Never registered as Cleo tools. Mounted last: "/api" is a
// prefix of every path above, so if this were registered earlier it would
// intercept all of them.
app.use("/api", requireFrontendSession, internalRouter);

app.get("/healthz", (_req, res) => res.json({ ok: true }));

const port = Number(process.env.PORT ?? 8787);
app.listen(port, () => {
  console.log(`DataClean Studio Bolt backend listening on :${port}`);
});
