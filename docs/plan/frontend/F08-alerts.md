# F08 Alerts panel

Depends: F04, B10. Priority: P0. Read first: B10 spec; API_REFERENCE.md (alerts).

## Goal
A prioritized, deduplicated list of alerts with evidence, updating live.

## Files
- `src/app/(app)/alerts/page.tsx`
- `src/features/alerts/components/`: `alerts-panel.tsx` (reused on the dashboard), `alert-card.tsx`, `alert-evidence-list.tsx`, `alert-filters.tsx`
- `src/features/alerts/api/use-alerts.ts` (exists from F05), `use-alert.ts`

## Specification
- Sort by severity (critical, high, medium, info) then last seen. Filter open/resolved. Each card: severity badge, title, plain summary, first/last seen, evidence list with links (forecast day drill-down, invoices, counterparties), and for forecast alerts a "See why" link to `/forecast?date=...`.
- Live: new `alert.raised` events appear without refresh; resolved alerts move to the Resolved filter.
- Empty state: "No open alerts" with the last evaluation time.
- No dismiss or acknowledge actions (not in scope).

## Tasks
- [ ] Panel, cards, filters, evidence links
- [ ] Reused on the dashboard (replaces the temporary banner list if needed)
- [ ] RTL tests for sorting, empty state, resolved filter
- [ ] After importing the anchor data the four expected alerts appear (manual check)
- [ ] Master plan row F08 set to `[x]`
