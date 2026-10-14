# S02 Demo auth seed and auth handshake check

Depends: F02, B03. Priority: P0. Read first: ARCHITECTURE.md section 5; DB_SCHEMA.md section 2. Better Auth docs: sign-up, organization plugin (create organization, add member, roles).

## Goal
Seed demo users, companies and roles through Better Auth itself, then prove the full web -> JWT -> API chain works for each role. Record the real shape of Better Auth's MongoDB documents.

## Files
- `apps/web/scripts/seed-auth.ts` (run with `tsx`; script `seed:auth` in `apps/web/package.json`)
- `apps/api/scripts/auth-handshake.ts` (script `auth:handshake` in `apps/api/package.json`)
- Update `docs/DB_SCHEMA.md` section 2 with the verified field types

## Specification
- `seed-auth.ts` imports the `auth` instance from `features/auth/server`. It is idempotent (safe to run twice). Password comes from env `DEMO_PASSWORD` (never committed).
- Create users from `DEMO_ACCOUNTS` in `@harbor/contracts` through Better Auth's server API (sign-up). Create organizations `harbor-wholesale` ("Harbor Wholesale") and `pearl-bakery` ("Pearl Bakery") with the matching owner as creator; add `employee@harbor.demo` as `employee` and `reviewer@harbor.demo` as `reviewer` of Harbor. Use the server-side Better Auth API calls documented for adding members; verify names in the docs, do not guess.
- `auth-handshake.ts` uses plain `fetch` against a running web app and API: sign in through the web app's Better Auth endpoint, obtain a JWT as documented by the jwt plugin (`/api/auth/token` with the session), then call `GET /api/v1/me` on the API.
- Scenarios to check and print as a table: owner ok (role owner), employee ok (role employee), reviewer ok (role reviewer), owner of Pearl sending Harbor's tenant id -> 403, no token -> 401, malformed token -> 401, missing `X-Tenant-Id` -> 400 or 403 (as implemented in B03).
- Reality check: open `member`, `organization`, `user` documents in MongoDB. Write down in DB_SCHEMA.md whether `organizationId`/`userId` are stored as ObjectId or string. If they are ObjectId, make sure `membership.repository.ts` in B03 converts correctly; add a regression test.

## Tasks
- [ ] `seed:auth` creates 4 users, 2 organizations, 3 Harbor members with the right roles; second run changes nothing
- [ ] `auth:handshake` passes all scenarios above
- [ ] DB_SCHEMA.md section 2 updated with verified id types
- [ ] Any B03 fix needed is made with a test, and noted in the Deviation Log if the plan changed
- [ ] Master plan row S02 set to `[x]`
