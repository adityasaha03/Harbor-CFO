# F10 Scenario studio

Depends: F07, F09, B13. Priority: P0. Read first: B13 spec; API_REFERENCE.md (scenarios).

## Goal

Let a user build a what-if (collect a receipt early, borrow, defer a payment, add an expense), see the baseline and the alternative through the same engine, and understand the trade-offs, including later repayment risk.

## Files

- `src/app/(app)/scenarios/page.tsx`
- `src/features/scenarios/components/`: `scenario-studio.tsx`, `change-builder.tsx`, `move-receipt-form.tsx`, `add-financing-form.tsx`, `add-recurring-form.tsx` (P1 slider), `defer-payment-form.tsx`, `change-list.tsx`, `comparison-chart.tsx`, `comparison-metrics.tsx`, `repayment-warning.tsx`, `preset-buttons.tsx`, `stale-banner.tsx`
- `src/features/scenarios/api/`: `use-create-scenario.ts`, `use-scenarios.ts`, `use-scenario.ts`
- `src/features/scenarios/lib/presets.ts`

## Specification

- Layout: builder on the left (list of changes, add-change menu), results on the right.
- Change forms validate with the Zod schemas from `@harbor/contracts`: move receipt (select an open AR invoice from `GET /invoices?direction=AR&status=open`, new date within the horizon), add financing (offer + principal in CNY), add recurring expense (label, monthly amount, start date; show as "Hire 2 people at 4,000/month" example in the placeholder), defer payment (AP invoice, new date, required assumption text with a note that it is an assumption, not a fact).
- Presets: "Collect overdue invoice early", "Bridge loan", "Collect early + small revolving draw" (reads `?preset=offer:<code>&amount=<minor>` from F09). Presets only prefill the builder.
- Results: chart with baseline and alternative lines, floor and zero lines; metrics table (lowest cash and date, day-21 cash, gap to floor, first day below floor, total financing cost, total scheduled repayment); highlight changed dates; `RepaymentWarning` when a later floor breach or negative cash appears despite a better near-term balance (message: "Near-term cash improves, but repayments cause a shortfall on <date>").
- Stale banner when `isStale`; "Regenerate" re-submits the same changes.
- If the scenario contains `add_financing` and the user has `actions:propose`, show "Create action proposal" (F11 wires the call). Reviewers cannot create scenarios (builder disabled with a read-only notice).

## Tasks

- [ ] Builder with the four forms and client-side validation
- [ ] Preset prefill and URL handling
- [ ] Comparison chart and metrics table; changed dates highlighted
- [ ] Repayment warning and stale banner
- [ ] On anchor data: moving `INV-AR-LATE` to 2026-10-30 shows day-21 cash 20,000.00; the bridge shows 38,800.00 with total cost 3,000.00 and a warning on 2026-12-08; move + 12,000 revolver shows 31,760.00 with cost 420.00
- [ ] RTL tests: validation errors, warning rendering, stale banner
- [ ] Master plan row F10 set to `[x]`
