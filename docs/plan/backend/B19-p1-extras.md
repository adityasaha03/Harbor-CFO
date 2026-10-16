# B19 P1 extras (only after every P0 backend chunk is done)

Depends: B11, B15. Priority: P1. Read first: PRODUCT_BRIEF.md; B11, B15 specs.

## Goal

Small, high-visibility features that improve clarity and the demo without adding risk. Each is optional and independent; build in the order listed and stop when time runs out.

## Features

1. **Cash Health Score** (`features/analytics/engine/health-score.ts`, endpoint `GET /api/v1/analytics/health-score`): score 0-100 = `40 * liquidity + 25 * receivables + 20 * concentration + 15 * freshness`, each component in [0,1]: liquidity = `clamp(minCash / floor, 0, 1)`; receivables = `1 - overdueAR / totalAR` (1 if no AR); concentration = `1 - clamp((topSharePct - threshold) / (100 - threshold), 0, 1)` when above threshold else 1; freshness = 1 if the last import is within `staleDataDays`, else 0.5. Return the score, the components, and the top 3 reasons (largest point deductions) as short sentences. Publish the weights in a doc comment and in the technical document.
2. **Weekly briefing** (`GET /api/v1/briefings/latest`, `finance:read`): deterministic text built from forecast, alerts and analytics (what happened, what matters, what to do next). Optional LLM rewrite is not allowed to change numbers; if used, numbers are inserted from data after generation.
3. **Collection message drafts** (agent tool `draftCollectionMessage`, permission `finance:read`): returns a polite reminder text for an overdue AR invoice using masked names and the invoice id and amount; clearly labelled "draft, nothing is sent". Add the tool to the registry test and allow-list.
4. **Report export** (agent tool `generateReport` and `GET /api/v1/reports/cash-summary?month=YYYY-MM&format=csv|pdf`, `finance:read`): CSV via the formula-safe writer; PDF via a small server-side generator. The tool returns a download path/id, never file contents. Reports are tenant-scoped and generated on demand.
5. **Stress preset**: endpoint helper that creates the "largest customer pays 14 days late" scenario using `delay_customer_receipts` (B13).

## Tasks

- [x] Health score with unit tests (all-good = 100, floor breach lowers liquidity, no AR handled)
- [x] Briefing endpoint with a snapshot test on the anchor tenant
- [x] `draftCollectionMessage` tool with sanitization tests
- [x] Report export CSV (formula escaping tested) and PDF
- [x] Stress preset tested against the anchor tenant
- [x] Registry allow-list test updated; master plan row B19 set to `[x]`
