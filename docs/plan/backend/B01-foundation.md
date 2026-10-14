# B01 Express foundation

Depends: S00, S01. Priority: P0. Read first: ARCHITECTURE.md sections 3, 6, 8, 9.

## Goal

A running Express 5 + TypeScript app skeleton with validated config, structured logging, consistent errors, request validation, security headers, CORS, rate limiting and health endpoints.

## Files (`apps/api`)

- `package.json`, `tsconfig.json`, `tsup.config.ts` (bundle `@harbor/contracts`), `vitest.config.ts`, `.env.example`
- `src/server.ts`, `src/app.ts`, `src/routes.ts`
- `src/config/env.ts`
- `src/core/http/app-error.ts` (AppError, NotFoundError, ForbiddenError, UnauthenticatedError, ConflictError, ValidationError, RateLimitedError)
- `src/core/http/async-handler.ts`, `validate.ts`, `respond.ts` (`ok(res, data, meta?)`), `error-handler.ts`, `not-found.ts`
- `src/core/logging/logger.ts`, `request-id.ts`
- `src/core/security/cors.ts`, `rate-limit.ts`, `helmet.ts`
- `src/features/health/health.routes.ts`, `health.controller.ts`, `index.ts`
- `src/core/http/__tests__/*.test.ts`

## Specification

- `env.ts`: Zod schema for all API env vars in ARCHITECTURE.md section 11, parsed once, exported as typed `env`. Fail fast with a readable message.
- Middleware order in `app.ts`: request id -> pino-http logger -> helmet -> CORS (only `WEB_ORIGIN`, allow headers `Authorization, X-Tenant-Id, Content-Type, Idempotency-Key, Last-Event-ID`, no credentials) -> JSON body (limit 1 MB; CSV upload uses multer separately) -> `/health/*` -> `/api/v1` router (rate limiter first) -> not-found -> error handler.
- `validate({ body?, query?, params? })` parses with Zod, replaces `req.body/query/params` with parsed values, and throws `ValidationError` with `details` (field paths and messages) on failure.
- Error handler maps `AppError` to the envelope in ARCHITECTURE.md section 6 including `requestId`; unknown errors become `INTERNAL` with a generic message and are logged with stack. Never include stack or internal messages in responses.
- Rate limiter: 120 requests/min per key, key = user id when available else IP; returns 429 with `Retry-After`. Export a factory `createRateLimiter({ windowMs, max, keyGenerator })` for stricter limits later.
- Health: `GET /health/live` always 200; `GET /health/ready` checks DB state through an injectable `isReady()` function (returns true until B02 wires it).
- `server.ts`: starts the app, handles `SIGTERM`/`SIGINT` with graceful shutdown.

## Tasks

- [x] Package scaffold and scripts: `dev` (tsx watch), `build` (tsup), `start`, `test`, `lint`, `typecheck`
- [x] `env.ts` with tests (missing var fails, defaults applied)
- [x] AppError classes, error handler, validate middleware, respond helper, with unit tests for each error code mapping
- [ ] Logger, request id (honors incoming `X-Request-Id`, otherwise generates), CORS and helmet configured; test that a disallowed origin gets no CORS headers
- [ ] Rate limiter factory with a test that the 121st request returns 429 and `Retry-After`
- [ ] Health endpoints with tests
- [ ] `routes.ts` created with a comment explaining how features mount (one line per feature)
- [ ] `.env.example` matches ARCHITECTURE.md; master plan row B01 set to `[x]`
