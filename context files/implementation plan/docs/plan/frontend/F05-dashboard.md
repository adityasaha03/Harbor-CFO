# F05 Dashboard overview

Depends: F04, B09, B11. Priority: P0. Read first: PRODUCT_BRIEF.md; API_REFERENCE.md (forecast, analytics, alerts).

## Goal

A one-screen answer to "are we going to run short, why, and what should I do next", built from deterministic data.

## Files

- `src/app/(app)/dashboard/page.tsx`
- `src/features/dashboard/components/`: `cash-summary-cards.tsx`, `cash-curve-chart.tsx`, `top-alert-banner.tsx`, `aging-card.tsx`, `concentration-card.tsx`, `data-freshness-card.tsx`, `insights-list.tsx`, `source-chip.tsx`, `health-score-card.tsx` (P1; hidden when endpoint returns 404; displays "Awaiting Data Import" empty state when zero transactions/invoices are on file)
- `src/features/forecast/api/use-latest-forecast.ts`, `src/features/analytics/api/use-analytics-summary.ts`, `src/features/alerts/api/use-alerts.ts` (shared hooks used by other features; owned here, import through each feature's `index.ts`)
- `src/lib/formulas.ts` (plain-text formula descriptions used by `source-chip`)

## Specification

- Cards: current cash, liquidity floor, lowest projected cash with its date, gap to the floor; when no breach show "No breach within 91 days" (never "infinite runway").
- Chart (Recharts): weekly closing cash line for the baseline, a dashed floor line and a zero line; tooltip with date and amount; clicking a point navigates to `/forecast?date=...` (drill-down in F07).
- Top alert banner: the highest-severity open alert with a link to `/alerts`.
- Aging card (AR and AP buckets), concentration card (top customer share, threshold, numerator/denominator), data freshness (last import, warnings).
- Insights list: three short deterministic bullets generated client-side from the data (for example "Cash first falls below the floor on 29 Oct", "Customer A is 67% of receivables", "40,000 is overdue by 25 days"). No LLM.
- `SourceChip`: small info button next to key numbers that opens a popover with the formula (`lib/formulas.ts`) and a link to the records behind it.
- P1 plain-language toggle: switches insight wording to simpler sentences (static templates, same numbers).
- Everything wrapped in `QueryBoundary`; Reviewer sees the same read-only dashboard.

## Tasks

- [ ] Hooks created and exported from their features
- [ ] Cards, chart, banner, aging, concentration, freshness, insights implemented
- [ ] `SourceChip` with formulas for cash, floor gap, aging, concentration
- [ ] With the anchor demo data the page shows: day-21 cash path dipping to -20,000.00, floor 30,000.00, gap 50,000.00, concentration 66.7%
- [ ] RTL tests: no-breach state, breach state, loading, error
- [ ] Health score card (P1) only if B19 is done
- [ ] Master plan row F05 set to `[x]`
