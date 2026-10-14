# B07 Import endpoints

Depends: B04, B05, B06. Priority: P0. Read first: DB_SCHEMA.md `imports`; ARCHITECTURE.md section 6.

## Goal
Upload -> preview -> commit with atomic, idempotent persistence; a committed import bumps the dataset version and publishes an event, which later triggers forecast and alert recomputation.

## Files (`apps/api/src/features/imports/`)
`imports.model.ts`, `imports.repository.ts`, `imports.service.ts`, `imports.controller.ts`, `imports.routes.ts`, `imports.constants.ts`, `index.ts`, `__tests__/`

## Specification
- `POST /api/v1/imports/preview` (`imports:write`, rate limit 5/min per tenant): multipart upload with `multer` memory storage (field `file`, size limit 5 MB) and body `{ kind: 'transactions' | 'invoices' }`. Runs the B06 engine. If errors: respond 200 with `{ importId, status: 'rejected', errors }` (record the import as `rejected`, store up to 200 errors). If ok: store `stagedRows`, `status: 'previewed'`, `expiresAt` +24 h; respond with counts, warnings and a sample of the first 20 rows.
- `POST /api/v1/imports/:id/commit` (`imports:write`): in one `withTransaction`:
  1. load the import (tenant-scoped, `previewed`, not expired) else 404/409;
  2. if a committed import with the same `(tenantId, kind, checksum, mappingVersion)` exists, return 409 `CONFLICT` with the existing import id (exact re-upload);
  3. bulk upsert ledger entries or invoices by their unique keys (reordered or overlapping files never duplicate); auto-create missing counterparties from invoice rows (`externalId`, type by direction, `maskedName` like `Customer A`/`Vendor B`, name = externalId until edited) and missing accounts are an error for transactions;
  4. mark the import `committed`, clear `stagedRows`, set counts;
  5. `bumpDatasetVersion`, write an audit event `import.commit`, publish `import.committed` event.
- `GET /api/v1/imports` and `GET /api/v1/imports/:id` (`finance:read`) for history and status. `GET /api/v1/imports/:id/errors.csv` returns the error report using `escapeSpreadsheetCell`.
- After commit, call a hook registered by the forecast/alerts features (`onDatasetChanged(tenantId)`), implemented as an in-process event on the bus. B09/B10 subscribe; B07 only publishes `import.committed`.
- Expired previews are rejected on commit even if the TTL job has not removed them (check `expiresAt` in code).

## Tasks
- [ ] Model with partial unique index on committed imports; TTL on `expiresAt`
- [ ] Preview endpoint: clean file, bad file (errors listed), oversize (413), wrong content type (400)
- [ ] Commit endpoint transactional; test that a failure in step 5 rolls back steps 3 and 4
- [ ] Re-upload of the same file returns 409 and creates zero records; a reordered file with the same rows creates zero new records and totals are unchanged
- [ ] Employee can import; reviewer gets 403; other tenant's import id returns 404
- [ ] Audit and event records created; `datasetVersion` increments exactly once per commit
- [ ] Error report CSV download tested (formula cells escaped)
- [ ] Routes mounted; DB_SCHEMA.md and contracts updated; master plan row B07 set to `[x]`
