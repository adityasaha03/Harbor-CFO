# B06 CSV import engine (pure)

Depends: S01. Priority: P0. Read first: DB_SCHEMA.md `imports`, `ledgerEntries`, `invoices`; ARCHITECTURE.md sections 3, 7.

## Goal

A pure, heavily tested module that turns CSV bytes into validated, normalized rows or a precise error report. No database, no Express.

## Files (`apps/api/src/features/imports/engine/`)

`parse-csv.ts`, `transactions.mapper.ts`, `invoices.mapper.ts`, `validate-rows.ts`, `limits.ts`, `checksum.ts`, `types.ts`, `index.ts`, and tests in `engine/__tests__/` with fixture CSVs in `engine/__tests__/fixtures/`.
Contracts: fill `packages/contracts/src/imports.ts` (row schemas, error item schema, templates).

## Specification

- Templates (header names exact, case-insensitive, extra columns rejected):
  - transactions: `externalId,date,accountId,amount,currency,category,description`
  - invoices: `invoiceId,direction,counterpartyId,total,outstanding,currency,dueDate,expectedSettlementDate,status`
- Limits in `limits.ts`: 5 MB, 10,000 rows, 30 columns, 2,000 chars per free-text cell, UTF-8 only (reject invalid UTF-8 and a BOM-only file). Check bytes before parsing.
- `parseCsv(buffer)` uses `csv-parse` in a safe configuration (no relax mode); returns rows with 1-based line numbers.
- Row validation with Zod: `externalId` and `invoiceId` match `^[A-Za-z0-9._-]{1,64}$`; `date`/`dueDate`/`expectedSettlementDate` are real `YYYY-MM-DD` dates; `amount`, `total`, `outstanding` parsed with `toMinor` (non-zero for transactions; `total > 0`; `0 <= outstanding <= total`); `currency` must be `CNY`; `direction` is `AR` or `AP`; `category` and `status` from enums (`open`, `partially_paid`, `paid`); `outstanding` must be 0 when `paid`.
- Cross-row checks: duplicate `externalId`/`invoiceId` inside the same file with different content is an error; identical duplicates are collapsed with a warning.
- Output: `{ ok: true, rows, rowCount, warnings }` or `{ ok: false, errors: [{ row, field, message }] }` (cap 200 errors, `truncated: true` when capped). Import is atomic: any error means the file is rejected as a whole.
- Formula-injection guard for exports: provide `escapeSpreadsheetCell(value)` that prefixes cells starting with `=`, `+`, `-`, `@`, tab or carriage return with a single quote; used by the error-report download in B07.
- `checksum.ts`: sha256 hex of the raw bytes.
- Free-text fields are kept as untrusted strings, trimmed, never interpreted.

## Tasks

- [ ] Contracts for import schemas filled
- [ ] `parseCsv` and limits tested: oversize, too many rows, bad UTF-8, unknown column, missing column, empty file
- [ ] Transaction and invoice mappers tested with valid rows (exact minor-unit outputs) and every invalid case listed above
- [ ] Atomic rejection test: one bad row among 100 returns errors only, no rows
- [ ] `escapeSpreadsheetCell` tested
- [ ] Fixture CSVs created: `transactions-clean.csv`, `transactions-bad.csv`, `invoices-clean.csv`, `invoices-bad.csv`
- [ ] Master plan row B06 set to `[x]`
