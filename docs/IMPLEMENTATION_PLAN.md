# Master implementation plan

This is the live task board. Agents and humans update it as work happens.

## How to use this file (agents: read carefully)

- Status symbols in the first column: `[ ]` not started, `[~]` in progress (write `@handle` in Owner), `[x]` done and merged or PR-ready.
- **Claim before coding**: edit only your own row (`[ ]` -> `[~]`, add `@handle`), commit `chore(plan): claim <ID>`, push.
- Each chunk file has its own task checkboxes. Tick them as you finish each task. When every box in the chunk file is ticked and tests pass, set your row here to `[x]`.
- A chunk may start only when every ID in "Depends" is `[x]` (or the human says to proceed with a stub).
- Priority: P0 = required for the competition demo, P1 = only after all P0 are done, P2 = stretch.
- Never reorder or rename rows. Never edit another person's row. Keep your edit to one line to avoid merge conflicts.
- Record any deviation in the Deviation Log at the bottom (append only).

Read order for any chunk: `AGENTS.md`, `docs/ARCHITECTURE.md`, `docs/DB_SCHEMA.md`, `docs/PRODUCT_BRIEF.md`, `docs/API_REFERENCE.md`, then the chunk file.

## Shared

| Status | ID  | Title                                                               | Pri | Depends  | Chunk file                        | Owner   |
| ------ | --- | ------------------------------------------------------------------- | --- | -------- | --------------------------------- | ------- |
| [x]    | S00 | Monorepo bootstrap and CI                                           | P0  | none     | plan/shared/S00-bootstrap.md      | @Mahtab |
| [x]    | S01 | Contracts package (shared schemas, permissions, money/date helpers) | P0  | S00      | plan/shared/S01-contracts.md      | @Mahtab |
| [~]    | S02 | Demo auth seed and auth handshake check (web <-> api)               | P0  | F02, B03 | plan/shared/S02-demo-auth-seed.md | @Aditya |
| [ ]    | S03 | Deployment, README and release packaging                            | P0  | all P0   | plan/shared/S03-deploy-release.md |         |

## Backend (apps/api)

| Status | ID  | Title                                                                                    | Pri | Depends                 | Chunk file                           | Owner |
| ------ | --- | ---------------------------------------------------------------------------------------- | --- | ----------------------- | ------------------------------------ | ----- |
| [x]    | B01 | Express foundation (app, env, errors, validation, logging, health)                       | P0  | S00, S01                | plan/backend/B01-foundation.md       | @Mahtab |
| [x]    | B02 | MongoDB connection, transactions, test harness                                           | P0  | B01                     | plan/backend/B02-database.md         | @Mahtab |
| [x]    | B03 | Auth middleware (JWT verify, tenant context, permissions)                                | P0  | B02                     | plan/backend/B03-auth-middleware.md  | @Mahtab |
| [x]    | B04 | Audit log and events (SSE, replay)                                                       | P0  | B03                     | plan/backend/B04-audit-events.md     | @Raiyan |
| [x]    | B05 | Tenant data features (settings, accounts, counterparties, ledger, invoices, commitments) | P0  | B03                     | plan/backend/B05-tenant-data.md      | @Raiyan |
| [x]    | B06 | CSV import engine (pure parse, validate, normalize)                                      | P0  | S01                     | plan/backend/B06-import-engine.md    | @Raiyan |
| [x]    | B07 | Import endpoints (preview, commit, dedupe, error report)                                 | P0  | B04, B05, B06           | plan/backend/B07-import-endpoints.md | @Rohan |
| [x]    | B08 | Forecast engine (pure) with anchor tests                                                 | P0  | S01                     | plan/backend/B08-forecast-engine.md  | @Raiyan |
| [x]    | B09 | Forecast service and endpoints                                                           | P0  | B05, B08                | plan/backend/B09-forecast-service.md | @Rohan |
| [x]    | B10 | Alerts engine, service and endpoints                                                     | P0  | B04, B09, B11           | plan/backend/B10-alerts.md           | @Rohan |
| [x]    | B11 | Analytics (aging, concentration, burn, collection quality)                               | P0  | B05                     | plan/backend/B11-analytics.md        | @Rohan |
| [~]    | B12 | Financing catalog, eligibility, ranking, cost schedule                                   | P0  | B09                     | plan/backend/B12-financing.md        | @Mahtab |
| [ ]    | B13 | Scenarios (typed deltas, compare)                                                        | P0  | B09, B12                | plan/backend/B13-scenarios.md        |       |
| [ ]    | B14 | Actions: proposal, approval, execution transaction                                       | P0  | B04, B12, B13           | plan/backend/B14-actions.md          |       |
| [ ]    | B15 | Agent tools and registry                                                                 | P0  | B09, B11, B12, B13, B14 | plan/backend/B15-agent-tools.md      |       |
| [ ]    | B16 | Agent runtime (provider adapter, loop, runs, telemetry)                                  | P0  | B15                     | plan/backend/B16-agent-runtime.md    |       |
| [ ]    | B17 | Demo seed, evidence export, proof endpoints                                              | P0  | B14, B16                | plan/backend/B17-demo-evidence.md    |       |
| [ ]    | B18 | Security hardening and adversarial tests                                                 | P0  | B14, B16                | plan/backend/B18-security-tests.md   |       |
| [ ]    | B19 | P1 extras (health score, briefing, collection drafts, report export)                     | P1  | B11, B15                | plan/backend/B19-p1-extras.md        |       |

## Frontend (apps/web)

| Status | ID  | Title                                                              | Pri | Depends       | Chunk file                                  | Owner |
| ------ | --- | ------------------------------------------------------------------ | --- | ------------- | ------------------------------------------- | ----- |
| [x]    | F01 | Next.js foundation (Tailwind, shadcn, providers, app shell)        | P0  | S00           | plan/frontend/F01-foundation.md             | @Mahtab |
| [x]    | F02 | Better Auth server and client configuration                        | P0  | F01, S01      | plan/frontend/F02-better-auth.md            | @shirsho |
| [x]    | F03 | Auth pages, company onboarding, route guards                       | P0  | F02           | plan/frontend/F03-auth-pages.md             | @shirsho |
| [x]    | F04 | API client, JWT handling, permissions layer, role-aware navigation | P0  | F03           | plan/frontend/F04-api-client-permissions.md | @shirsho |
| [x]    | F05 | Dashboard overview                                                 | P0  | F04, B09, B11 | plan/frontend/F05-dashboard.md              | @shirsho |
| [x]    | F06 | Imports workspace                                                  | P0  | F04, B07      | plan/frontend/F06-imports.md                | @shirsho |
| [x]    | F07 | Forecast page with drill-down                                      | P0  | F04, B09      | plan/frontend/F07-forecast.md               | @shirsho |
| [ ]    | F08 | Alerts panel                                                       | P0  | F04, B10      | plan/frontend/F08-alerts.md                 |       |
| [ ]    | F09 | Financing offers and comparison                                    | P0  | F04, B12      | plan/frontend/F09-financing.md              |       |
| [ ]    | F10 | Scenario studio                                                    | P0  | F07, F09, B13 | plan/frontend/F10-scenarios.md              |       |
| [ ]    | F11 | Action approval flow                                               | P0  | F10, B14      | plan/frontend/F11-actions.md                |       |
| [ ]    | F12 | Agent chat and live activity timeline                              | P0  | F04, B16      | plan/frontend/F12-agent.md                  |       |
| [ ]    | F13 | Proof and security page, audit viewer                              | P0  | F04, B17      | plan/frontend/F13-proof.md                  |       |
| [x]    | F14 | Settings and team management                                       | P0  | F04, B05      | plan/frontend/F14-settings-team.md          | @Mahtab |
| [ ]    | F15 | UX polish (states, accessibility, responsive, demo hints)          | P1  | F05-F14       | plan/frontend/F15-polish.md                 |       |
| [ ]    | F16 | End-to-end tests (Playwright)                                      | P0  | F11, F12, B17 | plan/frontend/F16-e2e.md                    |       |

## Suggested lanes (adjust to your team)

| Person                      | Lane                                         | Chunks                                           |
| --------------------------- | -------------------------------------------- | ------------------------------------------------ |
| A, API and security lead    | Foundation, auth, actions, hardening         | S00, B01, B02, B03, B04, B14, B18                |
| B, Finance and data lead    | Contracts, data, import, forecast, financing | S01, B05, B06, B07, B08, B09, B10, B11, B12, B13 |
| C, Frontend lead            | UI and Better Auth                           | F01 to F11, F13 to F15                           |
| D, Agent and integration    | Agent and live telemetry                     | B15, B16, B19, F12                               |
| E, QA, evidence and release | Auth handshake, evidence, tests, deploy      | S02, B17, F16, S03 (and F14)                     |

## Target schedule (Dhaka dates; feature freeze Oct 18 at 12:00)

| Day    | Target                                                                 |
| ------ | ---------------------------------------------------------------------- |
| Oct 14 | S00, S01, B01, B02, B03, F01, F02, F03                                 |
| Oct 15 | F04, S02, B04, B05, B06, B07, B08, B09, F05, F06, F07                  |
| Oct 16 | B10, B11, B12, F08, F09, F14                                           |
| Oct 17 | B13, B14, B15, B16, F10, F11, F12                                      |
| Oct 18 | B17, B18, F13, F16, P1 items before 12:00 freeze, first demo recording |
| Oct 19 | S03, final evidence export, deck, video, package frozen at 18:00       |
| Oct 20 | Submit by 12:00, verify receipt                                        |

## Deviation Log (append only: date, chunk, what, why, impact)

- 2026-10-15 | F05 | Used fallback static stubs (anchor fixtures) in useLatestForecast and useAnalyticsSummary hooks because B09 and B11 backend endpoints are in parallel development | Authorized by human lead to unblock F05 UI development | Zero impact on backend, seamless swap when endpoints become live.
