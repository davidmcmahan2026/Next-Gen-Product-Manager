// get_diff_preview: re-runs a single named rule against one column and
// returns just the before/after sample — this backs the diff table on the
// Review & Approve screen and is what Cleo cites as evidence if it needs a
// fresh preview after the dataset has changed. Read-only: uses the exact
// same transform as rulesEngine.ts, but only samples it — never mutates.

import { previewRule } from "./validator.js";
export { previewRule as getDiffPreview };
