# B12 Financing catalog, eligibility, ranking, cost schedule

Depends: B09. Priority: P0. Read first: PRODUCT_BRIEF.md (financing, anchor remedies); DB_SCHEMA.md `financingOffers`.

## Goal
Six explainable synthetic offers, hard eligibility gates with preserved reasons, a documented ranking score, exact cost and repayment schedules, and the forecast impact of each option.

## Files (`apps/api/src/features/financing/`)
`engine/schedule.ts`, `engine/eligibility.ts`, `engine/suggest-amount.ts`, `engine/scoring.ts`, `engine/types.ts`, `catalog/offers.ts`, `financing.model.ts`, `financing.repository.ts`, `financing.service.ts`, `financing.controller.ts`, `financing.routes.ts`, `financing.constants.ts`, `index.ts`, `__tests__/`
Contracts: fill `packages/contracts/src/financing.ts`.

## Catalog (`catalog/offers.ts`, all marked `synthetic: true`, version 1; amounts CNY, store as fen)
| code | type | range | dynamic cap | funding delay | upfront fee | flat interest | installments | purposes | other requirements |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `revolver-flex` | revolving_credit | 5,000 to 50,000 | none | 1 day | 200 bps | 150 bps | 1, due 30 days after funding | working_capital, bridge | min years in operation 1 |
| `bridge-term` | bridge_loan | 30,000 to 100,000 | none | 2 days | 200 bps | 300 bps | 3, first 33 days after funding, every 14 days | working_capital, bridge | none |
| `invoice-advance` | invoice_finance | 10,000 to 200,000 | ar_advance_80pct | 3 days | 150 bps | 200 bps | 1, due 45 days after funding | working_capital | invoice evidence required |
| `equipment-lease` | equipment_finance | 50,000 to 500,000 | none | 5 days | 100 bps | 400 bps | 6, first 30 days, every 30 days | equipment | none |
| `merchant-advance` | merchant_advance | 5,000 to 80,000 | none | 2 days | 300 bps | 500 bps | 4, first 14 days, every 14 days | working_capital | profile field `monthlyCardSalesMinor` required |
| `term-loan-slow` | term_loan | 50,000 to 300,000 | none | 30 days | 100 bps | 250 bps | 6, first 30 days, every 30 days | working_capital | none |

## Engine rules
- **Schedule** (`buildSchedule(offer, principalMinor, fundingOn)`): `upfrontFee = applyBps(principal, upfrontFeeBps)`, `interest = applyBps(principal, flatInterestBps)` (round half up to a minor unit once), `totalRepayment = principal + interest`, installments `floor(totalRepayment / count)` with the remainder added to the last, due dates `fundingOn + firstDueAfterFundingDays + i * intervalDays`. `netProceeds = principal - upfrontFee`, `totalCost = upfrontFee + interest`. Show total cost, never APR. Test: principal 6,000,000 fen on `bridge-term` gives fee 120,000, interest 180,000, installments 2,060,000 x 3, total cost 300,000; `revolver-flex` 1,200,000 gives fee 24,000, interest 18,000, one repayment 1,218,000, total cost 42,000.
- **Suggested principal**: `clamp(ceilTo(gap / (1 - feeRate), 1,000,000 fen), min, cap)`; `cap = min(max, dynamicCap)`; for `ar_advance_80pct` the cap is 80% of outstanding AR at the as-of date. Bridge for a 5,000,000 gap suggests 6,000,000.
- **Hard gates** (`evaluateEligibility`): currency CNY; amount within range and cap; purpose supported; required profile fields present (missing -> status `cannot_assess`, never `eligible`); invoice evidence (at least one open AR invoice) when required; `minYearsInOperation`; funds arrive before the breach: `fundingDelayDays` must be less than days until the earliest of `firstBelowFloorDate`/`firstNegativeDate` (if no breach, funding timing is not gated). Each result keeps reason codes: `CURRENCY_UNSUPPORTED`, `AMOUNT_OUT_OF_RANGE`, `PURPOSE_NOT_SUPPORTED`, `MISSING_ATTRIBUTE:<field>`, `INVOICE_EVIDENCE_REQUIRED`, `MIN_YEARS_NOT_MET`, `FUNDS_TOO_LATE`, each with a human-readable explanation.
- **Ranking** (eligible only, components clamped to [0, 1]): `score = 0.35 * gapCoverage + 0.25 * timeliness + 0.25 * repaymentResilience + 0.15 * costEfficiency`.
  - `gapCoverage = min(netProceeds / requiredGap, 1)`.
  - `timeliness = 1` if funding is at least 7 days before the breach date, falling linearly to 0 on the breach date.
  - `repaymentResilience` = share of horizon days with closing cash at or above the floor after adding the financing flows (computed with the forecast engine); also return `anyNegativeCash` as a separate warning.
  - `costEfficiency = 1 - (cost - minCost) / (maxCost - minCost)` within the eligible set; equal costs score 1.
  - A high score never overrides a failed gate or an `anyNegativeCash` warning (show the warning on the card). The LLM never changes the order.
- Document every normalizer in a comment block at the top of `scoring.ts`.

## Service and endpoints
- `matchFinancing(actor, { desiredAmountMinor?, purpose })`: loads the baseline forecast (B09); if `liquidityGapMinor` is 0, returns an empty result with `reason: 'NO_GAP'`. For each offer computes eligibility, schedule and impact (via `forecastService.computeForInput` with the financing flows: `minCashMinor`, `firstBelowFloorDate`, `anyNegativeCash`, cash at day 21 and at the breach date). Returns `{ eligible: ranked[], excluded: [{ offer, reasons[] }], cannotAssess: [{ offer, missing[] }], requiredGapMinor, breachDate }`.
- `GET /api/v1/financing/offers` (`finance:read`): the catalog. `POST /api/v1/financing/match` (`finance:read`; read-only, so the Reviewer may view comparisons).
- If a financing scenario causes a later floor breach, call `alertsService.raiseRepaymentPressure` only when it becomes a committed commitment (B14), not for hypothetical matches.
- Expose `getOfferByCode`, `buildSchedule`, `evaluateEligibility` from `index.ts` for B13/B14.

## Tasks
- [ ] Contracts filled; offers seed function `seedFinancingOffers()` is idempotent (upsert by `(code, version)`)
- [ ] Schedule tests with the exact numbers above
- [ ] Eligibility tests for every gate: equipment excluded for working_capital, merchant advance `cannot_assess`, slow term loan `FUNDS_TOO_LATE`, invoice advance blocked without open AR
- [ ] Scoring tests: components, ordering, tie handling, cost normalization with equal costs
- [ ] On the anchor tenant: gap 5,000,000 fen, breach date 2026-10-29, `bridge-term` suggested 6,000,000 and eligible, `revolver-flex` eligible with gap coverage 0.98, `term-loan-slow` excluded with `FUNDS_TOO_LATE`, `merchant-advance` cannot assess, `equipment-lease` excluded
- [ ] Endpoint tests with tenant isolation; Reviewer can read
- [ ] Routes mounted; DB_SCHEMA.md unchanged or updated; master plan row B12 set to `[x]`
