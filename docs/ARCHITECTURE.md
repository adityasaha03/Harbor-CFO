# Architecture and coding conventions

Applies to every file in the repo. When this document and a chunk disagree, ask; do not silently choose.

## 1. Stack and libraries (approved list)

| Area | Choice |
| --- | --- |
| Runtime | Node.js LTS (pin the exact version in `.nvmrc` and `engines`), pnpm workspaces, one lockfile |
| Language | TypeScript strict everywhere |
| Frontend | Next.js App Router, React, Tailwind CSS, shadcn/ui primitives, TanStack Query, React Hook Form, Zod, Recharts, `@microsoft/fetch-event-source`, lucide-react |
| Auth | Better Auth (hosted inside the Next.js app) with plugins: `organization`, `jwt`, MongoDB adapter |
| Backend | Express 5, Mongoose, Zod, `jose` (JWT verification), `pino` (logging), `helmet`, `cors`, `express-rate-limit`, `decimal.js`, `csv-parse`, `multer` (memory storage) |
| Tests | Vitest, Supertest, `mongodb-memory-server` (replica set), React Testing Library, Playwright |
| Tooling | ESLint (flat config, typescript-eslint), Prettier, GitHub Actions |

LLM: provider adapter with Gemini as the default provider and a scripted replay provider (see chunk B16). No other AI SDKs.

## 2. Monorepo layout

```
apps/
  web/                 Next.js app (UI + Better Auth server)
  api/                 Express API (domain logic, MongoDB, agent)
packages/
  contracts/           Zod schemas, enums, permissions, money/date helpers shared by web and api
docs/                  plan, schema, architecture, brief
.github/workflows/     CI
```

Package names: `@harbor/web`, `@harbor/api`, `@harbor/contracts`.
`@harbor/contracts` exports TypeScript source directly (Next uses `transpilePackages`, the API bundles it with tsup).

## 3. Backend: feature-based architecture

```
apps/api/src/
  server.ts            process bootstrap (connect DB, listen, graceful shutdown)
  app.ts               builds the Express app (middleware order, router mount, error handler)
  routes.ts            mounts every feature router under /api/v1 (one line per feature)
  config/env.ts        Zod-validated environment, the only place that reads process.env
  core/                cross-cutting infrastructure, contains NO business rules
    db/                mongoose connection, withTransaction helper, test helpers
    http/              AppError classes, async handler, validate middleware, response helpers, error handler
    logging/           pino logger, request id middleware
    security/          cors, helmet, rate limiters, canonical hashing
  features/
    <feature>/
      <feature>.model.ts        Mongoose schema + indexes (only file that defines the schema)
      <feature>.repository.ts   all database queries, tenantId first argument
      <feature>.service.ts      business rules, orchestration, transactions
      <feature>.controller.ts   HTTP only: validate, call service, shape response
      <feature>.routes.ts       Express router, applies auth + permission middleware
      <feature>.types.ts        internal types not shared with the web app
      engine/                   pure functions (no Express, no Mongoose, no env), heavily unit tested
      __tests__/                tests next to the code they test
      index.ts                  the ONLY public surface of the feature (named exports)
```

Layer rules (a lint rule enforces the import rules):

1. `routes -> controller -> service -> repository -> model`. Never skip a layer, never go upward.
2. Controllers contain no business logic and no queries. Services contain no Express types (`req`, `res`). Repositories contain no business rules.
3. Repositories return plain objects (`.lean()` or mapped DTOs), never Mongoose documents. Every method on tenant-owned data takes `tenantId` as its first parameter and puts it in the query filter.
4. Features import other features only through `features/<other>/index.ts`. No deep imports. No circular imports.
5. `engine/` code is pure and deterministic: same input, same output; no clock, no random, no I/O. Pass `asOfDate` in.
6. `core/` never imports from `features/`.
7. Every request body, query and params object is validated with a Zod schema from `@harbor/contracts` through the `validate` middleware before the controller runs.

`ActorContext` (set by the auth middleware, passed explicitly to services):

```ts
type ActorContext = { userId: string; tenantId: string; role: 'owner' | 'employee' | 'reviewer'; requestId: string };
```

## 4. Frontend: feature-based architecture

```
apps/web/src/
  app/                       routing only; each page.tsx/layout.tsx under 40 lines and composes feature components
    (auth)/sign-in, sign-up
    (onboarding)/company
    (app)/dashboard, imports, forecast, alerts, financing, scenarios, agent, proof, settings
    api/auth/[...all]/route.ts   Better Auth handler (re-exports from features/auth/server)
  features/
    <feature>/
      api/            fetchers, query keys, TanStack Query hooks (use-xxx.ts)
      components/     components used only by this feature
      hooks/          non-query hooks
      lib/            pure helpers
      types.ts        feature-local types (shared ones live in @harbor/contracts)
      index.ts        public exports of the feature
  components/ui/             shadcn primitives (Button, Dialog, Table, ...); no business logic
  components/layout/         app shell, nav, page header
  lib/                       api client, query client, env, utils
  providers/                 React providers
```

Rules:

1. Server Components by default. Add `'use client'` only for interactivity, hooks or browser APIs.
2. All data from the Express API is fetched client-side with TanStack Query, because the JWT is obtained client-side (see section 5).
3. A feature never imports another feature's internals; use its `index.ts`. Shared UI goes in `components/`.
4. Forms use React Hook Form + the Zod schema from `@harbor/contracts`.
5. Every screen handles four states: loading, empty, error, data. Use a shared `<QueryBoundary>` helper.
6. UI permission checks use `usePermission()` for UX only; the API enforces the rule.
7. Text rendered from imported data or model output is rendered as plain text. Never use `dangerouslySetInnerHTML`.

## 5. Authentication and authorization flow

```
Browser (Next.js)                         Express API                       MongoDB
  sign in/up (Better Auth client)
  -> Next route /api/auth/*  ---------------------------------------------> user, session, member, ...
  authClient.token()  -> short-lived JWT (jwt plugin, JWKS at /api/auth/jwks)
  fetch API with headers:
     Authorization: Bearer <jwt>
     X-Tenant-Id: <active organization id>
  ---------------------------------->  1. authenticate: verify JWT with jose against the JWKS
                                       2. tenant context: read `member` for (userId, tenantId) -> role
                                       3. requirePermission(permission) from ROLE_PERMISSIONS
                                       4. controller -> service -> repository (tenantId in every query)
```

- Better Auth runs inside the Next.js app and owns users, sessions, organizations (tenants), members and roles. The frontend does all sign-in, sign-up, company creation and member management through the Better Auth client.
- Tenant = Better Auth `organization`. Roles = organization member roles: `owner`, `employee`, `reviewer`.
- The Express API never trusts the role inside the JWT. It reads the membership from the database on every request, so revoking a member takes effect immediately.
- Permissions are defined once in `@harbor/contracts` (`ROLE_PERMISSIONS`) and used by both apps.
- JWT lifetime is the plugin default (about 15 minutes). The web client refreshes it before expiry. SSE connections are closed by the server at token expiry and reopened by the client with a fresh token.
- Bearer tokens in the `Authorization` header are not sent automatically by browsers, so CSRF is not applicable to the API. CORS allows only `WEB_ORIGIN`.

## 6. API conventions

- Base path `/api/v1`. JSON only. Plural nouns, kebab-case paths.
- Success: `{ "data": <payload>, "meta"?: { ... } }`. Error: `{ "error": { "code": "FORBIDDEN", "message": "...", "details"?: [...], "requestId": "..." } }`.
- Error codes: `VALIDATION_ERROR` 400, `UNAUTHENTICATED` 401, `FORBIDDEN` 403, `NOT_FOUND` 404, `CONFLICT` 409, `PAYLOAD_TOO_LARGE` 413, `RATE_LIMITED` 429, `INTERNAL` 500. Never leak stack traces or whether another tenant's record exists (cross-tenant lookups return `NOT_FOUND`).
- Required request headers: `Authorization`, `X-Tenant-Id`. Money-moving POSTs also require `Idempotency-Key`.
- IDs are strings. Dates: business dates are `YYYY-MM-DD` strings, timestamps are ISO 8601 UTC strings.
- Lists return `meta: { total, page, pageSize }` and accept `page`, `pageSize` (max 100).
- Live updates: `GET /api/v1/events/stream` (Server-Sent Events). The web client uses `fetch-event-source` so it can send the Authorization header. Each event has `id: <per-tenant sequence>` so clients can resume with `Last-Event-ID`.

## 7. Money, dates, numbers

- Money = integer minor units (fen). 12,500.00 CNY is `1250000`. Field names end in `Minor`.
- Validate with `Number.isSafeInteger`. Reject mixed currencies (MVP is CNY only).
- Rates are integer basis points (`bps`, 100 bps = 1%). Calculate with `decimal.js`, round half up to the nearest minor unit once, at the documented boundary.
- Never compute money in the browser except for display formatting via `@harbor/contracts` helpers.
- Business dates are date-only strings in the tenant's timezone. Do arithmetic on them with the helpers in `@harbor/contracts/dates` (UTC-based day math), never with local time.

## 8. Security conventions (summary; full rules in AGENTS.md)

- Deny by default: every router applies `authenticate`, `tenantContext`, and an explicit `requirePermission(...)`. A route without a permission is a bug.
- Security-relevant decisions (denials, approvals, executions) are written to `auditEvents` with a reason code.
- Log with `pino`. Never log tokens, passwords, API keys, full CSV rows or raw model prompts.
- Rate limits: login handled by Better Auth; API default 120 requests/min/user; agent 10/min/user; imports 5/min/tenant; approvals 10/min/user.

## 9. Code standards

- Names: files `kebab-case.ts`, React components `PascalCase`, functions `camelCase`, constants `SCREAMING_SNAKE_CASE`, types `PascalCase`, Mongo collections `camelCase` plural.
- Functions do one thing, ideally under 40 lines. Prefer early returns. No deep nesting.
- Named exports only (except Next.js route files that require default exports). Features expose a small `index.ts`.
- Errors: throw `AppError` subclasses (`NotFoundError`, `ForbiddenError`, `ConflictError`, `ValidationError`) from services; the central error handler maps them. Never swallow errors.
- Comments explain why, not what. Every exported function in `engine/` has a short doc comment stating inputs, outputs and units.
- No dead code, no commented-out code, no `console.log` (use the logger).
- No magic numbers: thresholds and limits live in a `<feature>.constants.ts` or in `config/`.
- Imports: absolute alias `@/` for `src/`, packages first, then aliases, then relative. No default exports of objects.

## 10. Testing standards

- Backend: Vitest + Supertest. Each feature has `__tests__/` with unit tests for `engine/` and `service` logic, and integration tests for routes using a `mongodb-memory-server` replica set (transactions require it).
- Every route test covers: success, validation failure, no token (401), wrong role (403), other tenant (404).
- Frontend: React Testing Library for components with logic and hooks; Playwright for the two end-to-end journeys (Owner happy path, Employee denial).
- Golden fixtures: the demo anchor numbers in `docs/PRODUCT_BRIEF.md` are asserted exactly.
- Do not mock the database in integration tests. Do not mock the code under test.

## 11. Environment variables

`apps/api/.env.example`

```
NODE_ENV=development
PORT=4000
MONGODB_URI=
MONGODB_DB_NAME=harbor
BETTER_AUTH_URL=http://localhost:3000        # base URL of the web app (JWT issuer and audience)
BETTER_AUTH_JWKS_URL=                         # optional, defaults to BETTER_AUTH_URL + /api/auth/jwks
WEB_ORIGIN=http://localhost:3000
LOG_LEVEL=info
LLM_PROVIDER=replay                           # gemini | replay
LLM_MODEL=
GEMINI_API_KEY=
AGENT_MAX_TOOL_CALLS=6
AGENT_TIMEOUT_MS=45000
```

`apps/web/.env.example`

```
BETTER_AUTH_SECRET=
BETTER_AUTH_URL=http://localhost:3000
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_API_URL=http://localhost:4000
MONGODB_URI=
MONGODB_DB_NAME=harbor
```

Both apps use the same MongoDB database.

## 12. Git workflow

- `main` is always green and deployable. Work on `feat/<ID>-<slug>` branches, one chunk per PR, squash merge.
- Conventional Commits. PR description: chunk ID, what changed, how to test, deviations.
- CI must pass (typecheck, lint, tests) before merge.
