# B09 Forecast service and endpoints

Depends: B05, B08. Priority: P0. Read first: DB_SCHEMA.md `forecastRuns`; B08 spec.

## Goal

Load a tenant's data into the engine, persist forecast runs (cached by input version), recompute automatically when data changes, and expose forecast and drill-down endpoints.

## Files (`apps/api/src/features/forecast/`)

`forecast.model.ts`, `forecast.repository.ts`, `forecast.service.ts`, `forecast.inputs.ts` (loader), `forecast.sources.ts` (extension point), `forecast.listeners.ts`, `forecast.controller.ts`, `forecast.routes.ts`, `index.ts`, `__tests__/`

## Specification

- `forecast.inputs.ts`: `loadForecastInput(tenantId)` gathers: settings (floor, `forecastAsOfDate` or today in tenant timezone), cash at as-of from `ledgerService.getCashAt`, outstanding invoices, commitments, future-dated ledger entries (`bookedOn > asOf`, only sandbox financing kinds exist today), and financing obligations from registered contributors.
- `forecast.sources.ts`: `registerForecastContributor(fn)`; B14 registers one that returns active `financingCommitments` schedules. Default is none. Keep this interface tiny and typed.
- `getBaseline(actor)`: look up `forecastRuns` by `(tenantId, datasetVersion, algorithmVersion='fc-1', scenarioHash='base')`; compute and store if missing (upsert to survive concurrent requests). Includes the conservative summary (`conservativeMinCashMinor`) computed with the same engine.
- `computeForInput(tenantId, input, scenarioHash, scenarioId?)` used by scenarios (B13) and financing impact (B12); persists with the unique key.
- Listener: subscribe to the events bus. On `import.committed` and `action.committed`, recompute the baseline and publish `forecast.updated` (resource ref = forecast run id). Alerts (B10) subscribe to `forecast.updated`.
- Endpoints (`finance:read`): `GET /api/v1/forecasts/latest` (daily points, weekly buckets, summary, as-of date, assumptions text), `GET /api/v1/forecasts/:id` (tenant-scoped), `GET /api/v1/forecasts/latest/days/:date` (provenance for one day: the sources with amounts plus the underlying invoice/commitment rows, tenant-scoped).
- Response includes `inputVersion` and `isStale` (true if the run's version is behind the current `datasetVersion`).
- Performance target: baseline for 10,000 invoices/ledger rows under 2 seconds; measure and note the number in the PR.

## Tasks

- [ ] Model with unique index on `(tenantId, inputVersion, algorithmVersion, scenarioHash)`
- [ ] Loader tested against seeded tenant data (use the B08 anchor fixture as DB data)
- [ ] Baseline for the seeded anchor tenant returns day-21 closing -2,000,000 via the API
- [ ] Caching test: second request does not recompute; changing `datasetVersion` triggers a new run
- [ ] Listener test: committing an import (or publishing `import.committed`) produces a new baseline and a `forecast.updated` event
- [ ] Day drill-down endpoint tested; tenant isolation test for all three endpoints
- [ ] Contributor extension point documented and tested with a fake contributor
- [ ] Routes mounted; master plan row B09 set to `[x]`
