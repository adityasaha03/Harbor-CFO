# F06 Imports workspace

Depends: F04, B07. Priority: P0. Read first: B06/B07 specs; API_REFERENCE.md (imports).

## Goal

Upload a CSV, see an exact preview or row-level errors, commit atomically, and watch the alert appear.

## Files

- `src/app/(app)/imports/page.tsx`
- `src/features/imports/components/`: `import-workspace.tsx`, `file-dropzone.tsx`, `template-links.tsx`, `preview-table.tsx`, `error-list.tsx`, `commit-bar.tsx`, `import-history-table.tsx`
- `src/features/imports/api/`: `use-preview-import.ts`, `use-commit-import.ts`, `use-imports.ts`, `download-error-report.ts`
- `src/features/imports/lib/templates.ts` (header rows from contracts, generated as downloadable CSV blobs)

## Specification

- Select kind (transactions or invoices), drop a file (client checks size 5 MB and `.csv` before upload; the server is the real validator).
- Preview success: counts, warnings, first 20 rows in a table with formatted amounts. Rejected: error list grouped by row with field and message, "Download error report", and a clear "nothing was imported" message (imports are atomic).
- Commit button with a confirmation dialog stating counts; handles 409 (already imported: link to the existing import) and expired preview (re-upload prompt).
- After commit the SSE hook refreshes data; show a success panel with counts and, when new alerts arrive within a few seconds, a link "View new alerts".
- History table: file, kind, status, accepted/rejected rows, date, actor.
- Reviewer sees history only; the upload area is replaced by a read-only notice (UX only; the API enforces).
- Imported text (descriptions) is rendered as plain text only.
- Smart AI Data Mapper (extension): adds a dedicated "Smart AI Mapper" card in the Imports workspace. Users can upload messy/scattered business files (.csv, .xlsx, .tsv, .txt) without pre-formatting. The AI transforms and standardizes the columns into HarborCFO's canonical schema. Offers two actions: "Download Formatted CSV" and "1-Click Send to Preview" (which automatically pipes the generated CSV into usePreviewImport for standard atomic validation). Raw document text is treated strictly as untrusted data.

## Tasks

- [ ] Dropzone, templates download, preview and error views
- [ ] Commit flow with confirmation, 409 and expired handling
- [ ] History table
- [ ] Re-uploading the same file shows the duplicate message and does not change totals (manual check against the API)
- [ ] RTL tests: error list rendering, commit disabled while pending, Reviewer view
- [ ] Master plan row F06 set to `[x]`
