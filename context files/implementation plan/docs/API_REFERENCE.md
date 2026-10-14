# API reference (Express, base path /api/v1)

Headers on every request except `/health/*`: `Authorization: Bearer <jwt>`, `X-Tenant-Id: <company id>`. Responses use `{ data, meta? }` or `{ error: { code, message, details?, requestId } }`. Money in fen (integers). Dates `YYYY-MM-DD`. Schemas live in `@harbor/contracts`. Update this file when an endpoint changes.

| Method and path | Permission | Chunk | Notes |
| --- | --- | --- | --- |
| GET /health/live, /health/ready | public | B01 | |
| GET /me | member | B03 | `{ userId, tenantId, role, permissions }` |
| GET /tenant-settings | finance:read | B05 | |
| PATCH /tenant-settings | settings:manage | B05 | floor, thresholds, profile |
| GET /accounts | finance:read | B05 | |
| GET /ledger-entries | finance:read | B05 | filters: from, to, category; paginated |
| GET /invoices | finance:read | B05 | filters: direction, status, overdue |
| GET /commitments | finance:read | B05 | |
| POST, PATCH /:id, DELETE /:id /commitments | settings:manage | B05 | |
| POST /imports/preview | imports:write | B07 | multipart `file`, `kind`; 5 per min per tenant |
| POST /imports/:id/commit | imports:write | B07 | atomic; 409 on duplicate |
| GET /imports, /imports/:id, /imports/:id/errors.csv | finance:read | B07 | |
| GET /forecasts/latest | finance:read | B09 | daily points, weekly buckets, summary, isStale |
| GET /forecasts/:id | finance:read | B09 | |
| GET /forecasts/latest/days/:date | finance:read | B09 | provenance for one day |
| GET /alerts, /alerts/:id | finance:read | B10 | status filter |
| GET /analytics/summary | finance:read | B11 | aging, concentration, burn, collection quality |
| GET /analytics/health-score | finance:read | B19 (P1) | |
| GET /financing/offers | finance:read | B12 | |
| POST /financing/match | finance:read | B12 | read-only |
| POST /scenarios | scenarios:write | B13 | typed changes; returns comparison |
| GET /scenarios, /scenarios/:id | finance:read | B13 | includes isStale |
| POST /action-proposals | actions:propose | B14 | server resolves terms |
| GET /action-proposals, /action-proposals/:id | finance:read | B14 | |
| POST /action-proposals/:id/approve | actions:approve | B14 | body `{ payloadHash }` |
| POST /action-proposals/:id/reject | actions:approve | B14 | |
| POST /action-proposals/:id/execute | actions:approve | B14 | header `Idempotency-Key` required |
| POST /agent/runs | agent:use | B16 | 202 `{ runId }`; 10 per min per user |
| GET /agent/runs, /agent/runs/:id | finance:read | B16 | |
| GET /events?after= | finance:read | B04 | REST replay |
| GET /events/stream | finance:read | B04 | SSE, `Last-Event-ID` |
| GET /audit-events | audit:export | B04 | |
| GET /evidence/export | audit:export | B17 | JSON bundle |
| GET /proof/checks, POST /proof/checks/:id/run | finance:read | B17 | demo tenants only |
| POST /demo/reset | settings:manage | B17 | demo tenant and env flag only |
| GET /briefings/latest, GET /reports/cash-summary | finance:read | B19 (P1) | |

Event kinds (SSE `event:` field): `import.committed`, `forecast.updated`, `alert.raised`, `alert.resolved`, `tool.started`, `tool.completed`, `proposal.created`, `approval.required`, `action.committed`, `run.completed`, `run.failed`.
