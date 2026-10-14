# B13 Scenarios (typed deltas and comparison)

Depends: B09, B12. Priority: P0. Read first: DB_SCHEMA.md `scenarios`; B08, B12 specs.

## Goal

A scenario is a typed list of changes over an immutable data version. The baseline and the alternative run through the same engine and are compared field by field. Nothing is executed here.

## Files (`apps/api/src/features/scenarios/`)

`engine/apply-changes.ts`, `engine/compare.ts`, `engine/types.ts`, `scenarios.model.ts`, `scenarios.repository.ts`, `scenarios.service.ts`, `scenarios.controller.ts`, `scenarios.routes.ts`, `index.ts`, `__tests__/`
Contracts: fill `packages/contracts/src/scenarios.ts` (discriminated union of changes, comparison DTO).

## Specification

- Change types (Zod discriminated union on `type`):
  - `move_receipt { invoiceExternalId, newExpectedSettlementOn }` (AR invoice that is open; date between day 1 and the end of the horizon)
  - `add_financing { offerCode, principalMinor, fundingOn? }` (validated with the B12 gates; `fundingOn` defaults to as-of + offer delay)
  - `add_recurring { label, direction, amountMinor, frequency, startOn }` (hiring or expense slider; P1 UI but supported now)
  - `defer_payment { invoiceExternalId, newExpectedSettlementOn, assumption }` (AP invoice; `assumption` text 1 to 300 chars required: it is a user-entered assumption, not a fact)
  - `delay_customer_receipts { counterpartyExternalId, days }` (stress test, for example the largest customer 14 days late; P1)
- `applyChanges(baseInput, changes)` returns a new `ForecastInput` (pure, no mutation). Moving a receipt removes the old expected date and uses the new one, never a duplicate inflow.
- `createScenario(actor, { name, changes })`: validates, records `baseInputVersion = datasetVersion`, builds the modified input, computes the forecast via `forecastService.computeForInput` with `scenarioHash = sha256(canonical changes + baseInputVersion)`, saves the scenario with `forecastRunId` and `expiresAt` (+24 h), returns the comparison.
- `compare(baselineRun, scenarioRun)` returns: both summaries, `cashAtDays` for days 7, 14, 21, 30, 60, 90 for both, deltas (min cash, day-21 cash, gap), `changedDates` (first below floor, first negative, min cash date), `financing: { principal, netProceeds, totalCost, repaymentsTotal, repaymentWarnings[] }` and `anyNegativeCash`, plus a points series for charting both lines.
- `isStale`: scenario `baseInputVersion` differs from the current `datasetVersion`; stale scenarios can be read but cannot be used for proposals (B14 checks).
- Endpoints: `POST /api/v1/scenarios` (`scenarios:write`, rate limited), `GET /api/v1/scenarios` (recent, `finance:read`), `GET /api/v1/scenarios/:id` (`finance:read`, includes `isStale`).

## Tasks

- [ ] Contracts filled
- [ ] `applyChanges` tests: move receipt (no duplicate), add financing flows, recurring expense, deferral requires assumption, delay customer
- [ ] Anchor tests through the service: move `INV-AR-LATE` to 2026-10-30 gives day-21 cash 2,000,000 fen; bridge gives 3,880,000; move + revolver 1,200,000 gives 3,176,000 with total cost 42,000
- [ ] Bridge scenario shows a repayment warning (first below floor after funding on 2026-12-08)
- [ ] Validation tests: unknown invoice, paid invoice, date outside the horizon, offer gate failure, missing assumption
- [ ] Stale scenario flagged after a dataset version bump
- [ ] Employee can create, Reviewer cannot (403); tenant isolation on all routes
- [ ] Routes mounted; master plan row B13 set to `[x]`
