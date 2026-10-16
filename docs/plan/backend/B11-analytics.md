# B11 Analytics (aging, concentration, burn, collection quality)

Depends: B05. Priority: P0. Read first: PRODUCT_BRIEF.md; DB_SCHEMA.md `invoices`, `ledgerEntries`.

## Goal

Documented, deterministic business metrics served from one endpoint and reused by alerts and the agent.

## Files (`apps/api/src/features/analytics/`)

`engine/aging.ts`, `engine/concentration.ts`, `engine/burn.ts`, `engine/collection-quality.ts`, `engine/types.ts`, `analytics.service.ts`, `analytics.controller.ts`, `analytics.routes.ts`, `index.ts`, `__tests__/`
Contracts: fill `packages/contracts/src/analytics.ts`.

## Specification (all pure functions in `engine/`, each with a doc comment stating the formula)

- `computeAging(invoices, asOf, direction)`: buckets `notYetDue`, `overdue1to30`, `overdue31to60`, `overdue61plus` on `outstandingMinor`, by `dueOn` vs `asOf`. Returns amounts and counts.
- `computeConcentration(arInvoices)`: per counterparty `outstandingMinor`, `sharePct` (one decimal), total; `isApplicable` false when total is 0; also returns the top customer.
- `computeBurn(ledger, asOf)`: operating entries only (exclude `loan_*` categories); average monthly net cash movement over the last up to 3 full months of history; returns `netOperatingMovementMinor` for the window, `monthlyBurnMinor` only when net outflow is positive and history is at least 60 days, otherwise `null` with reason `INSUFFICIENT_HISTORY` or `NOT_BURNING`. `roughRunwayMonths = currentCash / monthlyBurn` flagged `isRoughEstimate: true`. Never present it as the primary signal.
- `computeCollectionQuality(arInvoices, ledgerEntries)`: among `paid` AR invoices with a linked receipt ledger entry, the share paid on or before `dueOn`; returns the percentage and `sampleCount`; invoices without a linked receipt are excluded and counted as `excludedCount`.
- `analyticsService.getSummary(actor)`: `{ asOf, currentCashMinor, floorMinor, aging: { ar, ap }, concentration, burn, collectionQuality, dataCompleteness: { lastImportAt, invoiceCount, ledgerCount, warnings[] } }`.
- Endpoint `GET /api/v1/analytics/summary` (`finance:read`).
- Do not infer profit or revenue from bank transactions anywhere.

## Tasks

- [x] Contracts filled
- [x] Aging tests: boundaries at 0, 1, 30, 31, 60, 61 days; paid invoices excluded; AR and AP separately
- [x] Concentration tests: zero AR, single customer (100%), equal split, threshold shown by the alert layer, not here
- [x] Burn tests: insufficient history, net inflow (no burn), loan entries excluded
- [x] Collection quality tests with excluded and eligible invoices
- [x] Summary endpoint tested on the anchor tenant (AR concentration of the late customer is 66.7%) with tenant isolation
- [x] Routes mounted; master plan row B11 set to `[x]`
