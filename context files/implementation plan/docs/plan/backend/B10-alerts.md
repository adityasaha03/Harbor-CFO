# B10 Alerts engine, service and endpoints

Depends: B04, B09, B11. Priority: P0. Read first: PRODUCT_BRIEF.md alert rules; DB_SCHEMA.md `alerts`.

## Goal

Proactive alerts created by data changes, with deduplication by fingerprint and automatic resolution when a condition clears.

## Files (`apps/api/src/features/alerts/`)

`engine/rules.ts`, `engine/evaluate.ts`, `alerts.constants.ts`, `alerts.model.ts`, `alerts.repository.ts`, `alerts.service.ts`, `alerts.listeners.ts`, `alerts.controller.ts`, `alerts.routes.ts`, `index.ts`, `__tests__/`
Contracts: fill `packages/contracts/src/alerts.ts`.

## Specification

- Pure `evaluateAlerts(ctx)` returns candidate alerts `{ ruleId, fingerprint, severity, title, summary, evidence[] }` from: forecast summary and floor, overdue AR per counterparty (from analytics), concentration (from analytics), last successful import time, settings thresholds.
- Rules and fingerprints:
  - `negative_cash` (critical): `firstNegativeDate` not null; fingerprint `negative_cash:horizon`; summary names the date and the largest outflow sources of that day (from provenance).
  - `floor_breach` (high): `firstBelowFloorDate` not null; fingerprint `floor_breach:horizon`; summary shows the gap `liquidityGapMinor`.
  - `overdue_receivable`: per counterparty with AR overdue by at least `overdueAlertDays`; severity `high` if overdue 30+ days or amount >= floor, else `medium`; fingerprint `overdue_receivable:<counterpartyExternalId>`.
  - `customer_concentration` (medium): one customer's share of outstanding AR is above `concentrationThresholdPct`; show numerator, denominator and threshold; not applicable when total AR is 0; fingerprint `customer_concentration:<counterpartyExternalId>`.
  - `stale_data` (info): last committed import older than `staleDataDays`; fingerprint `stale_data:imports`.
  - `repayment_pressure` (high): evaluated on financing scenario/commitment forecasts only (B12/B14 call `alertsService.raiseRepaymentPressure`); fingerprint `repayment_pressure:<commitmentId or scenarioHash>`.
- Service: on `forecast.updated` load context, evaluate, then upsert by `(tenantId, fingerprint)`: update `lastSeenAt`, severity and summary of existing open alerts (never create duplicates), create new ones and publish `alert.raised`, mark open alerts whose fingerprint is no longer produced as `resolved` and publish `alert.resolved`. Write an audit event for each raise.
- Endpoints (`finance:read`): `GET /api/v1/alerts?status=open|resolved`, `GET /api/v1/alerts/:id`.
- Alerts must fire without any chat or user action: the only trigger is the data change.

## Tasks

- [ ] Contracts filled; model with unique `(tenantId, fingerprint)` index
- [ ] Rule tests for every rule: triggers, does not trigger, boundary (exactly at threshold), zero AR for concentration
- [ ] Dedup test: evaluating twice creates one alert; changed severity updates it
- [ ] Resolution test: after the condition clears the alert becomes `resolved`
- [ ] Integration test: importing the fixture publishes `forecast.updated` then creates `floor_breach`, `negative_cash`, `customer_concentration` and `overdue_receivable` alerts without any other call
- [ ] Endpoint tests including tenant isolation
- [ ] Routes mounted; master plan row B10 set to `[x]`
