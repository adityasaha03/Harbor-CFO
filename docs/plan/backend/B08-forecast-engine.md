# B08 Forecast engine (pure) with anchor tests

Depends: S01. Priority: P0. Read first: PRODUCT_BRIEF.md (anchor fixture, forecast rules); ARCHITECTURE.md sections 3, 7.

## Goal
A deterministic function that turns cash, outstanding invoices, recurring commitments and financing schedules into a 91-day daily cash forecast with provenance and summary. No database, no clock, no Express.

## Files (`apps/api/src/features/forecast/engine/`)
`types.ts`, `expand-commitments.ts`, `build-flows.ts`, `run-forecast.ts`, `summarize.ts`, `weekly.ts`, `conservative.ts`, `index.ts`, `__tests__/anchor.test.ts`, `__tests__/fixtures/harbor-anchor.ts`, plus unit tests per file.
Contracts: fill `packages/contracts/src/forecast.ts` (ForecastPoint, ForecastSummary, WeeklyBucket, FlowSource).

## Specification
Input (`ForecastInput`), all money in fen, all dates `YYYY-MM-DD`:
```ts
{
  asOfDate: string; openingCashMinor: number; floorMinor: number; horizonDays: number; // 91
  invoices: { externalId: string; direction: 'AR'|'AP'; outstandingMinor: number; dueOn: string; expectedSettlementOn: string; counterpartyExternalId: string }[];
  commitments: { id: string; label: string; direction: 'inflow'|'outflow'; amountMinor: number; frequency: 'once'|'weekly'|'biweekly'|'monthly'; anchorOn: string; endOn?: string }[];
  financing: { id: string; label: string; flows: { on: string; amountMinor: number; kind: 'draw'|'fee'|'repayment' }[] }[];
  scheduledLedger: { id: string; label: string; on: string; amountMinor: number }[]; // future-dated sandbox entries
}
```
Rules:
1. Day 0 = `asOfDate`; points for day 0..horizon-1 (91 points). `closing[0] = openingCashMinor` (flows already in the ledger are not repeated). For day d >= 1: `closing[d] = closing[d-1] + receipts - payments + draws - fees - repayments` for flows dated that day.
2. Invoice flows: only invoices with `outstandingMinor > 0`. Date = `max(expectedSettlementOn, asOfDate + 1 day)` (late expected dates are placed on day 1). AR is a receipt, AP is a payment. Overdue status itself creates no flow.
3. Commitment occurrences strictly after `asOfDate` and within the horizon, until `endOn`. `weekly` = every 7 days, `biweekly` = every 14, `monthly` = same day of month, clamped to the last day of shorter months, `once` = only `anchorOn`.
4. Financing flows and `scheduledLedger` entries are applied on their dates if within the horizon (draw positive, fee and repayment negative).
5. Each flow carries a `source` `{ type: 'invoice'|'commitment'|'financing'|'ledger', id, label, amountMinor }`; each point keeps its sources so the UI can drill down.
6. Outputs per point: `date, closingMinor, receiptsMinor, paymentsMinor, financingMinor, feesMinor, repaymentsMinor, sources`.
7. `summarize(points, floorMinor)`: `minCashMinor` and `minCashDate` (first day the minimum occurs), `firstBelowFloorDate` (first day `closing < floor`), `firstNegativeDate` (first day `closing < 0`), `liquidityGapMinor = max(0, floor - minCash)`. When no breach occurs the dates are `null` (UI says "none within horizon").
8. `toWeekly(points)`: 13 buckets of 7 days (days 0-6, 7-13, ... 84-90): `closingMinor` of the last day, `minMinor` in the bucket, summed flows.
9. `conservative(input, extraDays = 14)`: returns a modified input where every AR invoice with `dueOn < asOfDate` has `expectedSettlementOn` moved later by `extraDays`; expenses unchanged. Label as an assumption scenario.
10. Pure and deterministic: same input gives the same output; never read the clock or randomness; do not mutate inputs.

## Anchor fixture (`harbor-anchor.ts`, amounts below are CNY; convert to fen)
`asOfDate 2026-10-20`, `openingCash 80,000`, `floor 30,000`, horizon 91.
- AR `INV-AR-101` 20,000, due 2026-10-30, expected 2026-11-01 (day 12)
- AR `INV-AR-LATE` 40,000, due 2026-09-25 (overdue), expected 2026-11-13 (day 24)
- AP `INV-AP-201` 55,000, expected 2026-10-29 (day 9)
- Commitments: rent 12,000 `monthly` anchor 2026-10-25; payroll 45,000 `monthly` anchor 2026-11-03; overhead 8,000 `once` 2026-11-07; recurring retail receipts inflow 10,000 `weekly` anchor 2026-11-11 (day 22)

## Hand-verified expectations (assert all of them)
- Baseline: day-21 (2026-11-10) closing = -2,000,000 fen; receipts by day 21 = 2,000,000; payments by day 21 = 12,000,000; `firstBelowFloorDate` 2026-10-29; `firstNegativeDate` 2026-11-03; `minCashMinor` -2,000,000 first on 2026-11-07; `liquidityGapMinor` 5,000,000.
- Move `INV-AR-LATE` to 2026-10-30 (day 10): day-21 closing = 2,000,000.
- Bridge: draw 6,000,000 and fee 120,000 on 2026-10-22 (day 2); repayments 2,060,000 on days 35, 49, 63 (2026-11-24, 2026-12-08, 2026-12-22): day-21 closing = 3,880,000; the first day below the floor after day 21 is 2026-12-08 (day 49).
- Move `INV-AR-LATE` to day 10 and add a revolver draw 1,200,000 with fee 24,000 on 2026-10-21 and repayment 1,218,000 on 2026-11-20 (day 31): day-21 closing = 3,176,000.
- Conservative variant: `INV-AR-LATE` moves to 2026-11-27 (day 38) and the baseline minimum is unchanged or lower.
- Edge cases: empty input, zero outstanding invoice ignored, `monthly` on the 31st, financing flow outside the horizon ignored, expected date in the past placed on day 1.

## Tasks
- [ ] Contracts for forecast types filled
- [ ] Engine files implemented with doc comments on exported functions
- [ ] Anchor test passes with every expectation above
- [ ] Unit tests for commitment expansion (weekly, biweekly, monthly clamp, once, endOn)
- [ ] Unit tests for summary, weekly buckets and conservative shift
- [ ] Property test: sum of flows equals `closing[last] - closing[0]`
- [ ] Engine has no imports from express, mongoose or env (lint or test enforces)
- [ ] Master plan row B08 set to `[x]`
