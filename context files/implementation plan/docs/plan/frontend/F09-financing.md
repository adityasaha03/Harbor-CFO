# F09 Financing offers and comparison

Depends: F04, B12. Priority: P0. Read first: B12 spec; PRODUCT_BRIEF.md.

## Goal
Show eligible offers ranked with exact costs and repayment impact, excluded offers with reasons, and offers that cannot be assessed.

## Files
- `src/app/(app)/financing/page.tsx`
- `src/features/financing/components/`: `gap-header.tsx`, `match-controls.tsx`, `offer-card.tsx`, `score-breakdown.tsx`, `schedule-table.tsx`, `excluded-offers.tsx`, `cannot-assess-offers.tsx`, `financing-disclaimer.tsx`
- `src/features/financing/api/`: `use-financing-offers.ts`, `use-match-financing.ts`

## Specification
- Header: required gap, breach date, floor; if no gap, show "No cash gap to cover" state.
- Controls: purpose select (working capital, bridge, equipment) and optional amount override (shown in CNY, converted to fen with `toMinor`).
- Eligible cards sorted by score: name and "Synthetic offer" badge, score with the four weighted components as small bars (gap coverage, timeliness, repayment resilience, cost efficiency), principal, upfront fee, net proceeds, total repayment, **total cost**, funding delay, installment schedule table, and impact (lowest cash, first day below floor after financing). A repayment warning badge when `anyNegativeCash` or a later floor breach exists. Never show APR.
- Excluded section lists each offer with its reason codes translated to plain sentences (for example "Funds arrive after cash first falls below the floor"). Cannot-assess section lists the missing profile fields with a link to Settings.
- Each eligible card has "Compare in Scenario Studio" (navigates to `/scenarios?preset=offer:<code>&amount=<minor>`).
- Disclaimer: decision support using synthetic terms; not underwriting, not a guarantee of approval, not licensed financial advice.
- Reviewer can view.

## Tasks
- [ ] Controls, header, eligible cards with score breakdown and schedule
- [ ] Excluded and cannot-assess sections with plain-language reasons
- [ ] On anchor data: `bridge-term` suggested 60,000.00 with total cost 3,000.00; `term-loan-slow` excluded (funds too late); `merchant-advance` cannot assess; `equipment-lease` excluded for purpose
- [ ] RTL tests: reason mapping, warning badge, no-gap state
- [ ] Master plan row F09 set to `[x]`
