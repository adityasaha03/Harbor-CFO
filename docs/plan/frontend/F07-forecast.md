# F07 Forecast page with drill-down

Depends: F04, B09. Priority: P0. Read first: B08/B09 specs.

## Goal
Show the 91-day cash forecast, the assumptions behind it, and let the user click a dip to see the exact invoices and payments that cause it.

## Files
- `src/app/(app)/forecast/page.tsx`
- `src/features/forecast/components/`: `forecast-chart.tsx`, `breach-summary.tsx`, `day-drilldown-drawer.tsx`, `weekly-table.tsx`, `assumptions-panel.tsx`, `view-toggle.tsx`
- `src/features/forecast/api/`: `use-latest-forecast.ts` (exists from F05; extend), `use-forecast-day.ts`

## Specification
- Chart: toggle weekly (13 buckets) or daily (91 points); lines for baseline closing cash and the conservative variant (dashed, labelled "Conservative assumption: overdue receivables arrive 14 days later (not a statistical confidence band)"); horizontal floor and zero reference lines; breach markers.
- Breach summary: first day below the floor, first negative day, lowest cash with date, gap. Empty state text when no breach.
- Drill-down drawer: opens from a chart click or `?date=` query param; lists the day's sources grouped as receipts, payments, financing, with amount, label and a link to the invoice or commitment; shows closing cash.
- Assumptions panel: as-of date, data version, stale warning when `isStale`, bullet list of what is included (outstanding invoices at expected settlement dates, recurring commitments, financing schedules) and what is not (no unscheduled sales).
- Weekly table below the chart for accessibility (screen readers and keyboard users get the same data).
- Money shown only via `<Money>`.

## Tasks
- [ ] Chart with toggle, floor/zero lines, conservative line and legend
- [ ] Breach summary and assumptions panel
- [ ] Drill-down drawer works from click and from URL
- [ ] On anchor data the drawer for 2026-11-07 shows the 8,000.00 overhead payment and ends at -20,000.00
- [ ] RTL tests: no-breach, breach, stale indicator, drawer content
- [ ] Master plan row F07 set to `[x]`
