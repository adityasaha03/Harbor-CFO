# B18 Security hardening and adversarial tests

Depends: B14, B16. Priority: P0. Read first: AGENTS.md section 3; ARCHITECTURE.md section 8.

## Goal

Prove the security claims with tests, close gaps, and generate the artifacts the security self-assessment needs. Any unexplained unauthorized write is release-blocking.

## Files

`apps/api/src/__security__/` (integration suites): `tenant-isolation.test.ts`, `rbac-matrix.test.ts`, `injection.test.ts`, `idempotency-concurrency.test.ts`, `rate-limit.test.ts`, `input-hardening.test.ts`, `logging-redaction.test.ts`, `helpers.ts`
`submissions/security/`: `test-results.md` (generated summary), `scan-notes.md`

## Specification (each suite uses the real app, real replica set, two tenants)

1. **Tenant isolation**: for every tenant-owned collection and every route that takes an id, a valid session from tenant B (and a forged `X-Tenant-Id` of tenant A) returns 404/403 and never leaks content, counts or events. Includes SSE (tenant B stream receives no tenant A events) and aggregate endpoints.
2. **RBAC matrix**: iterate the permission matrix in `@harbor/contracts`; for every route, call as owner, employee, reviewer, non-member and anonymous and assert the expected status. A route without `protect()` fails the test (walk the router stack; only `/health/*` may be public).
3. **Injection**: Mongo operator payloads (`$ne`, `$where`, `$gt`, dotted keys) in body/query/params are rejected by validation; unknown properties rejected; imported descriptions with HTML/script remain data (assert API returns them JSON-escaped and the UI renders text, see F-chunks); prompt-injection invoice text produces no tool calls to unregistered tools, no proposals, no ledger changes.
4. **Idempotency and concurrency**: duplicate and concurrent execute attempts, mutated payload, expired approval, stale dataset version, revoked owner mid-execution, worker/transaction failure rollback.
5. **Rate limits**: login is handled by Better Auth (verify its rate-limit config is enabled in `auth.ts`); API 120/min, agent 10/min, imports 5/min per tenant, approvals 10/min; 429 with `Retry-After`.
6. **Input hardening**: oversized body (413), oversized CSV, malformed UTF-8, formula-cell exports escaped, JWT with `alg: none` or wrong issuer/audience rejected, expired JWT rejected.
7. **Logging redaction**: run a full flow with a capturing logger; assert no `Authorization` header, token, password, API key or raw CSV row appears in logs or audit events.
8. **Dependencies and secrets**: run `pnpm audit`, a secret scanner (for example gitleaks) and a license listing; save outputs under `submissions/security/`; triage findings in `scan-notes.md`. A clean scan is not proof of no risk.
9. **Headers and CORS**: helmet headers present, CORS allows only `WEB_ORIGIN`, no wildcard.

## Tasks

- [x] Suites 1 to 7 written and passing; failures fixed at the source (not by weakening tests)
- [x] Suite 9 passing; suite 8 outputs saved
- [x] A script `pnpm --filter @harbor/api test:security` runs everything in `__security__`
- [x] `test-results.md` generated from the run (counts and names of tests, not hand-written)
- [x] Any fix to another chunk's file is noted in the Deviation Log with the owner informed
- [x] Master plan row B18 set to `[x]`
