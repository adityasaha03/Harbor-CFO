# B03 Auth middleware (JWT verify, tenant context, permissions)

Depends: B02. Priority: P0. Read first: ARCHITECTURE.md section 5; PRODUCT_BRIEF.md roles table; DB_SCHEMA.md section 2. Better Auth docs: JWT plugin (verifying tokens, JWKS).

## Goal

Every protected route knows who the caller is, which company (tenant) they act in, their current role, and whether they hold the required permission.

## Files (`apps/api/src/features/auth/`)

- `auth.types.ts` (`ActorContext`, `AuthIdentity`, Express `Request` augmentation: `req.auth`, `req.actor`)
- `jwt-verifier.ts` (`createRemoteJWKSet` with `jose`, `verifyAccessToken(token)`)
- `authenticate.middleware.ts`
- `membership.repository.ts` (reads Better Auth `member` and `organization` through the native driver, no Mongoose model)
- `tenant-context.middleware.ts`
- `require-permission.middleware.ts`
- `auth.controller.ts`, `auth.routes.ts` (`GET /api/v1/me`)
- `index.ts`, `__tests__/`

## Specification

- `verifyAccessToken`: JWKS URL = `BETTER_AUTH_JWKS_URL` or `BETTER_AUTH_URL + /api/auth/jwks`; verify signature, `issuer` and `audience` equal to `BETTER_AUTH_URL`, and expiry. Cache the remote JWKS (jose does this). Return `{ userId: payload.sub or payload.id, expiresAt }`. Confirm the claim names against the Better Auth JWT docs before coding; do not guess.
- `authenticate`: requires `Authorization: Bearer <token>`. Missing, malformed, expired or badly signed -> `UnauthenticatedError` (no detail about why). Sets `req.auth`.
- `tenantContext`: requires `X-Tenant-Id`. Loads the membership for `(userId, tenantId)` from `member`. Not a member or tenant missing -> `ForbiddenError('Not a member of this company')` (same response for both, so tenant existence is not revealed). Validates `role` against `ROLES` from contracts (unknown role -> Forbidden). Sets `req.actor` (`ActorContext`). The role is read from the database on every request, never from the token.
- `requirePermission(permission)`: uses `hasPermission(req.actor.role, permission)`. On denial throw `ForbiddenError` and call the denial hook (for now, log at `warn` with request id, tenant, user and permission; B04 replaces this with an audit record).
- Helper `protect(permission)` returns `[authenticate, tenantContext, requirePermission(permission)]` so routers are one-liners. A route without `protect(...)` must be a deliberate public route (only `/health/*`).
- Handle Better Auth id storage: member `organizationId` and `userId` may be stored as ObjectId or string. Put conversion in one function in `membership.repository.ts` and test both forms. S02 verifies the real shape.
- `GET /api/v1/me` returns `{ userId, tenantId, role, permissions }` and requires only authenticate + tenantContext.

## Tasks

- [ ] Types and Express augmentation compile in strict mode
- [ ] JWT verifier tested with locally generated keys (create a local JWKS in the test; cover valid, expired, wrong issuer, wrong audience, tampered signature)
- [ ] `authenticate`, `tenantContext`, `requirePermission` implemented with unit tests
- [ ] Integration tests with Supertest and seeded `member`/`organization` docs: owner, employee, reviewer, non-member (403), unknown tenant (403, identical body), no token (401)
- [ ] Role change in the database takes effect on the next request (test)
- [ ] `protect()` helper exported; `GET /api/v1/me` mounted in `routes.ts`
- [ ] Master plan row B03 set to `[x]`
