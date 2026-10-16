# HarborCFO Security Scan & Triage Notes

**Date**: 2026-10-16  
**Auditor**: HarborCFO Engineering (@shirsho)  
**Chunk**: B18 (Security hardening and adversarial tests)

---

## 1. Executive Summary

As part of the B18 milestone, automated security scanning and vulnerability auditing were conducted across the workspace (`apps/api`, `apps/web`, `packages/contracts`). All production-facing routes, data stores, token verification routines, and background agents were verified against adversarial attacks.

The automated verification covers:
1. **Dependency Vulnerability Audit** (`pnpm audit`)
2. **Secrets & Credentials Inspection** (Git history and working tree analysis)
3. **Open-Source License Review** (`pnpm licenses list`)
4. **Adversarial Integration Test Results** (51 test cases across 7 dedicated suites)

---

## 2. Dependency Vulnerability Triage (`pnpm audit`)

The `pnpm audit` scan identified 12 advisory notifications across transitive dependencies. A detailed triage reveals that **zero vulnerabilities are present in or exploitable through the production runtime**.

| Package | Severity | Path / Context | Triage Assessment & Mitigation |
|---|---|---|---|
| `tinypool` (<=2.1.0) | Critical | `vitest` -> `tinypool` | **Dev-only**: Internal to the Vitest test runner worker pool. Never bundled or deployed into the production Express API or Next.js server runtime. |
| `postcss` (<=8.5.17) | High | `next` -> `postcss` | **Build-time only**: Used strictly during Next.js CSS asset compilation. No untrusted user CSS or source maps are parsed at runtime. |
| `braces` (<=3.0.3) | High | `tailwindcss` -> `chokidar` -> `braces` | **Dev-time only**: Used for development file watching and build-time globbing. Not exposed in production runtime. |
| `postcss-selector-parser` (<7.1.6) | Moderate | `tailwindcss` -> `postcss-nested` | **Build-time only**: Part of CSS build pipeline. No user input passes through selector parsing. |
| `@vitest/mocker` (<4.1.11) | Moderate | `vitest` -> `@vitest/mocker` | **Dev-only**: Test mocking framework utility. Never shipped to production. |
| `esbuild` (<0.28.1) | Low | `tsup` -> `esbuild` | **Build-time only**: Bundler used for API TypeScript compilation. No dev server is run on untrusted external interfaces. |

**Conclusion**: All flagged packages are dev-dependencies or build-time bundlers. No production runtime attack surface exists from these findings.

---

## 3. Secret & Credential Scanning

A full scan of tracked repository files and git commit history was conducted for sensitive credentials:
- **Environment Files**: Verified that only sanitized template files (`apps/api/.env.example`, `apps/web/.env.example`) are tracked. Real `.env` and `.env.local` files are ignored by `.gitignore`.
- **Private Keys & Certificates**: Searched for cryptographic private key headers (`BEGIN PRIVATE KEY`, `BEGIN RSA PRIVATE KEY`, etc.). Zero private keys are tracked.
- **API Tokens & Secrets**: No hardcoded API keys, JWT secrets, or cloud credentials exist in the codebase. All secrets are injected exclusively via environment variables (`JWT_SECRET`, `GEMINI_API_KEY`, etc.).

---

## 4. Software License Compliance

A license audit was performed using `pnpm licenses list` (saved in `submissions/security/licenses.txt`):
- All direct and transitive dependencies use standard permissive open-source licenses: **MIT**, **Apache-2.0**, **ISC**, and **BSD-2-Clause / BSD-3-Clause**.
- No copyleft licenses (e.g., GPL, AGPL) that could compromise project ownership or commercial deployment were detected.

---

## 5. Adversarial Security Guarantees Proven by Test Suites

7 dedicated automated security integration test suites (`apps/api/src/__security__/`) containing 51 tests run against a real Express application with an in-memory MongoDB replica set:

1. **Tenant Isolation (`tenant-isolation.test.ts` - 13 tests)**:
   - Every tenant query enforces `tenantId` at the database level.
   - Cross-tenant ID lookups for invoices, accounts, actions, alerts, and agent runs return 404/403 and never leak data, counts, or events.
   - Spoofed `X-Tenant-Id` headers and non-member tokens are strictly rejected with 403 Forbidden.
   - SSE and domain events are completely partitioned per tenant.

2. **RBAC & Endpoint Protection (`rbac-matrix.test.ts` - 13 tests)**:
   - Full permission matrix verified: `actions:approve` and `audit:export` are strictly restricted to `owner`.
   - `agent:use` is accessible to `owner` and `employee`, but forbidden for `reviewer`.
   - `finance:read` is allowed for `reviewer`, but denied for anonymous callers (401).
   - Router stack scan ensures 100% of `/api/v1/*` routes require authentication; only `/health/*` routes remain public.

3. **Injection & Untrusted Data Hardening (`injection.test.ts` - 7 tests)**:
   - NoSQL operator injections (`$ne`, `$where`, `$gt`, dotted keys) in body, query, and path parameters are blocked at the HTTP validation middleware with 400 Bad Request.
   - HTML and `<script>` payloads in untrusted fields (invoice descriptions, counterparty names) remain strictly uninterpreted string data and are returned JSON-escaped.
   - Prompt-injection strings in invoices produce no unauthorized tool invocations or state modifications.

4. **Idempotency & Concurrency (`idempotency-concurrency.test.ts` - 6 tests)**:
   - Execution endpoints require `Idempotency-Key` header (400 if missing).
   - Concurrent and duplicate execution requests are strictly atomic and execute exactly once.
   - Tampered `payloadHash` values are rejected with 409 Conflict.
   - Expired proposals cannot be approved (409 Conflict).
   - Mid-flight role revocation blocks execution with 403 Forbidden.

5. **Rate Limiting (`rate-limit.test.ts` - 2 tests)**:
   - Per-tenant rate limits enforced with HTTP 429 and standard `Retry-After` headers.

6. **Input Hardening, JWT, & Headers (`input-hardening.test.ts` - 9 tests)**:
   - Body parser rejects payloads exceeding 1MB with HTTP 413 Payload Too Large.
   - JWT tampering, invalid signatures, wrong issuers, and expired tokens are rejected with HTTP 401 Unauthorized.
   - Spreadsheet formula injection characters (`=`, `+`, `-`, `@`) in exportable text fields are neutralized.
   - Strict security headers (`Helmet`, `HSTS`, `X-Content-Type-Options`) and origin-restricted CORS are enforced.

7. **Logging Redaction (`logging-redaction.test.ts` - 1 test)**:
   - Pino logger redacts `Authorization` headers, bearer tokens, passwords, and API keys from logs and audit records.
