# B05 Tenant data features

Depends: B03. Priority: P0. Read first: ARCHITECTURE.md section 3; DB_SCHEMA.md `tenantSettings`, `accounts`, `counterparties`, `ledgerEntries`, `invoices`, `commitments`.

## Goal

The persistent core of a company's books, each as its own feature: settings, accounts, counterparties, ledger, invoices, commitments, with strictly tenant-scoped repositories and read endpoints.

## Features and files

Create six feature folders under `apps/api/src/features/`, each with `model`, `repository`, `service`, `controller`, `routes`, `index.ts` and `__tests__/`:

- `tenants/` (`tenantSettings`): `getSettings`, `ensureSettings(tenantId)` (creates defaults on first access), `updateSettings` (owner only), `bumpDatasetVersion(tenantId, session)`, `getForecastAsOf(tenantId)` (returns `forecastAsOfDate` override or today in the tenant timezone)
- `accounts/`, `counterparties/`, `ledger/`, `invoices/`, `commitments/`
  Contracts: fill `packages/contracts/src/tenants.ts`, `ledger.ts`, `invoices.ts` (DTO schemas and enums: ledger categories, invoice direction/status, commitment frequency).

## Specification

- Models follow DB_SCHEMA.md exactly, including unique and secondary indexes.
- Repositories: first parameter `tenantId`; filters always include it; writes accept optional `session`; return plain objects. Provide `bulkUpsert...` methods used by the import feature (unique key upserts, idempotent).
- Services expose the reads other features need, for example `ledgerService.getCashAt(tenantId, asOf)` (opening balance + entries after the opening date up to `asOf`), `invoicesService.listOutstanding(tenantId)`, `commitmentsService.list(tenantId)`.
- Endpoints (all via `protect(permission)`):
  - `GET /api/v1/tenant-settings` (`finance:read`), `PATCH /api/v1/tenant-settings` (`settings:manage`, validates floor, thresholds, profile)
  - `GET /api/v1/accounts`, `GET /api/v1/ledger-entries` (paginated, filter by date range and category), `GET /api/v1/invoices` (filter by direction, status, overdue), all `finance:read`
  - `GET /api/v1/commitments` (`finance:read`), `POST/PATCH/DELETE /api/v1/commitments` (`settings:manage`)
- Counterparty names returned to the UI may be real synthetic names; any value that could reach the LLM must use `maskedName` (enforced in B15).
- Overdue is derived: `dueOn < asOf && outstandingMinor > 0`; never stored.

## Tasks

- [x] Contracts filled for these features
- [x] Six models with indexes; tests that unique indexes reject duplicates
- [x] Repositories tenant-scoped; a test per repository proves tenant B cannot read or update tenant A rows
- [x] `getCashAt` tested: entries on or before the opening date are ignored; later entries counted once
- [x] `bumpDatasetVersion` atomic (`$inc`) and returns the new version; tested under concurrency
- [x] Endpoints with route tests (success, validation, 401, 403, tenant isolation)
- [x] DB_SCHEMA.md updated if anything changed; routes mounted; master plan row B05 set to `[x]`
