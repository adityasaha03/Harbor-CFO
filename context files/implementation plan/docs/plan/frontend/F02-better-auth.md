# F02 Better Auth server and client configuration

Depends: F01, S01. Priority: P0. Read first: ARCHITECTURE.md section 5. **Required reading before coding** (current docs, do not rely on memory): Better Auth installation, Next.js integration, MongoDB adapter, email/password, organization plugin (including access control / custom roles), JWT plugin, rate limiting.

## Goal

Better Auth running inside the Next.js app with MongoDB, email/password, organizations as companies (tenants), custom roles, and the JWT plugin exposing a JWKS so the Express API can verify tokens.

## Files (`apps/web/src/features/auth/`)

- `server/mongo.ts` (singleton `MongoClient`, safe for dev hot reload), `server/auth.ts` (the `betterAuth` instance), `server/access-control.ts` (permissions statement, `ac`, roles), `server/session.ts` (`getServerSession`, `requireServerSession`)
- `lib/auth-client.ts` (`createAuthClient` with `organizationClient` and `jwtClient`)
- `index.ts` (public exports)
- `src/app/api/auth/[...all]/route.ts` (re-exports the handler from `features/auth/server`)
- `.env.example` entries: `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `MONGODB_URI`, `MONGODB_DB_NAME`

## Specification

- Database: Better Auth MongoDB adapter with the shared `harbor` database; pass the client if the docs say it is required for transactions.
- Auth: email and password enabled, minimum password length 8, email verification off for the demo (no email service); document this as a known limitation.
- `organization` plugin: companies = organizations. Roles: `owner` (creator role), `employee`, `reviewer`. Define them with the access-control API per the docs so the three role names are what gets stored in `member.role`. If custom roles block progress for more than one hour, stop and ask the human; the fallback is built-in roles with a mapping constant in `@harbor/contracts` (record it in the Deviation Log).
- `jwt` plugin: default key algorithm and JWKS path; set the payload (`definePayload`) to the minimum (`id`, `email`); keep the default 15-minute expiry; issuer and audience stay at the default base URL (the API verifies against `BETTER_AUTH_URL`). Add the `bearer` plugin only if the docs require it for your flow.
- Enable Better Auth's built-in rate limiting for auth endpoints; set `trustedOrigins` to the web origin.
- Active organization: after sign-in, make the user's first organization active automatically (use the documented mechanism, for example a session creation database hook), or handle it in F03.
- Server helpers: `requireServerSession()` redirects to `/sign-in` when there is no session; `getServerSession()` returns `null`.
- The Next.js cookies plugin (if the docs require it for Server Actions) is configured per the docs.

## Tasks

- [ ] Packages installed per docs; env validated at startup with a clear message
- [ ] Route handler responds at `/api/auth/*`; `curl <web>/api/auth/jwks` returns keys after the first token request (note the plugin may create the key on first use)
- [ ] Roles defined; unit test of `access-control.ts` asserting the three roles exist and map to the `ROLES` from contracts
- [ ] Sign-up, sign-in, create organization and `getSession` verified manually or with a script (the formal handshake test is S02)
- [ ] `authClient.token()` returns a JWT for a signed-in user (verify, record the claim names the API must read: update B03 notes if they differ)
- [ ] Rate limiting and trusted origins configured
- [ ] Deviations (if any) logged; master plan row F02 set to `[x]`
