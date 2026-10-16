# B18 Security Test Results

Generated on: 2026-10-16T10:06:56.822Z

## Summary

- **Total Suites**: 7
- **Total Tests**: 50
- **Passed**: 50
- **Failed**: 0
- **Status**: ALL PASSED

## Suites & Verifications

### src/__security__/idempotency-concurrency.test.ts (6 tests)

| Status | Test Name | Duration |
|---|---|---|
| PASS | B18 Security Suite 4: Idempotency and Concurrency Hardening Idempotency Key Requirement rejects execution request with 400 when Idempotency-Key header is missing | 1320.7925999999998ms |
| PASS | B18 Security Suite 4: Idempotency and Concurrency Hardening Duplicate & Concurrent Execution Protection executes exactly once when duplicate execute calls are made with identical key | 603.5585000000001ms |
| PASS | B18 Security Suite 4: Idempotency and Concurrency Hardening Duplicate & Concurrent Execution Protection handles concurrent execute race conditions safely | 613.5668000000005ms |
| PASS | B18 Security Suite 4: Idempotency and Concurrency Hardening Tampered Payload Hash Protection rejects approval when payloadHash does not match the server-computed canonical hash | 615.0468000000001ms |
| PASS | B18 Security Suite 4: Idempotency and Concurrency Hardening Expired Proposal Protection rejects approval of an expired proposal with 409 Conflict | 735.7735000000002ms |
| PASS | B18 Security Suite 4: Idempotency and Concurrency Hardening Revoked Owner Mid-Execution Protection rejects execution with 403 when owner role is revoked prior to execution | 630.8838000000014ms |

### src/__security__/injection.test.ts (6 tests)

| Status | Test Name | Duration |
|---|---|---|
| PASS | B18 Security Suite 3: Injection and Untrusted Data Hardening NoSQL Operator Injection rejects Mongo operator object {"$ne": null} in body parameter with 400 | 1031.4372999999996ms |
| PASS | B18 Security Suite 3: Injection and Untrusted Data Hardening NoSQL Operator Injection rejects Mongo operator object {"$gt": 0} in financial body with 400 | 202.98559999999998ms |
| PASS | B18 Security Suite 3: Injection and Untrusted Data Hardening NoSQL Operator Injection rejects Mongo operator injection in query string with 400 | 162.3155999999999ms |
| PASS | B18 Security Suite 3: Injection and Untrusted Data Hardening Strict Schema Enforcement (Unknown Properties) rejects unknown property injection in agent runs request | 157.72409999999945ms |
| PASS | B18 Security Suite 3: Injection and Untrusted Data Hardening HTML/Script Payloads in Untrusted Text stores HTML/XSS payloads strictly as uninterpreted string data and returns JSON-escaped | 171.47469999999976ms |
| PASS | B18 Security Suite 3: Injection and Untrusted Data Hardening Prompt Injection Resilience guarantees prompt injection attempts cannot invoke unregistered tools or alter ledger entries | 281.08709999999974ms |

### src/__security__/input-hardening.test.ts (9 tests)

| Status | Test Name | Duration |
|---|---|---|
| PASS | B18 Security Suite 6 & 9: Input Hardening, JWT Hardening, and Headers/CORS Payload Size Constraints rejects oversized JSON request body exceeding 1MB limit with HTTP 413 | 1053.2417999999998ms |
| PASS | B18 Security Suite 6 & 9: Input Hardening, JWT Hardening, and Headers/CORS Payload Size Constraints rejects oversized CSV upload exceeding 5MB limit with HTTP 413 | 231.6862000000001ms |
| PASS | B18 Security Suite 6 & 9: Input Hardening, JWT Hardening, and Headers/CORS JWT Security & Tampering Protections rejects unsigned JWT using "alg: none" with HTTP 401 | 167.17829999999958ms |
| PASS | B18 Security Suite 6 & 9: Input Hardening, JWT Hardening, and Headers/CORS JWT Security & Tampering Protections rejects JWT signed by foreign untrusted key with HTTP 401 | 360.0447000000004ms |
| PASS | B18 Security Suite 6 & 9: Input Hardening, JWT Hardening, and Headers/CORS JWT Security & Tampering Protections rejects JWT with wrong issuer with HTTP 401 | 367.22980000000007ms |
| PASS | B18 Security Suite 6 & 9: Input Hardening, JWT Hardening, and Headers/CORS JWT Security & Tampering Protections rejects expired JWT with HTTP 401 | 246.6935000000003ms |
| PASS | B18 Security Suite 6 & 9: Input Hardening, JWT Hardening, and Headers/CORS Formula Injection Sanitization neutralizes spreadsheet formula characters (=, +, -, @) to prevent formula execution | 220.07449999999972ms |
| PASS | B18 Security Suite 6 & 9: Input Hardening, JWT Hardening, and Headers/CORS Security Headers (Helmet) & Strict CORS sets protective HTTP response headers via Helmet | 374.7673999999997ms |
| PASS | B18 Security Suite 6 & 9: Input Hardening, JWT Hardening, and Headers/CORS Security Headers (Helmet) & Strict CORS enforces strict CORS origin allowing WEB_ORIGIN and denying untrusted origin | 461.53150000000096ms |

### src/__security__/logging-redaction.test.ts (1 tests)

| Status | Test Name | Duration |
|---|---|---|
| PASS | B18 Security Suite 7: Logging and Audit Redaction automatically redacts sensitive authorization headers, passwords, tokens, and raw CSVs | 2.7790999999999713ms |

### src/__security__/rate-limit.test.ts (2 tests)

| Status | Test Name | Duration |
|---|---|---|
| PASS | B18 Security Suite 5: Rate Limiting Enforcement enforces rate limit threshold and returns HTTP 429 with Retry-After header | 71.7607999999999ms |
| PASS | B18 Security Suite 5: Rate Limiting Enforcement isolates rate limits per user/tenant key | 15.069499999999834ms |

### src/__security__/rbac-matrix.test.ts (13 tests)

| Status | Test Name | Duration |
|---|---|---|
| PASS | B18 Security Suite 2: RBAC Matrix and Router Security Scanner Permission: actions:approve (Owner only) allows Owner to access approval endpoint | 1147.5470999999998ms |
| PASS | B18 Security Suite 2: RBAC Matrix and Router Security Scanner Permission: actions:approve (Owner only) denies Employee with 403 on actions:approve | 176.8818000000001ms |
| PASS | B18 Security Suite 2: RBAC Matrix and Router Security Scanner Permission: actions:approve (Owner only) denies Reviewer with 403 on actions:approve | 159.2420000000002ms |
| PASS | B18 Security Suite 2: RBAC Matrix and Router Security Scanner Permission: actions:approve (Owner only) denies Anonymous with 401 on actions:approve | 150.9364999999998ms |
| PASS | B18 Security Suite 2: RBAC Matrix and Router Security Scanner Permission: settings:manage (Owner only) denies Employee with 403 on PATCH /tenant-settings | 159.09670000000006ms |
| PASS | B18 Security Suite 2: RBAC Matrix and Router Security Scanner Permission: settings:manage (Owner only) denies Reviewer with 403 on PATCH /tenant-settings | 263.2446ms |
| PASS | B18 Security Suite 2: RBAC Matrix and Router Security Scanner Permission: audit:export (Owner only) allows Owner to access audit events | 213.19779999999992ms |
| PASS | B18 Security Suite 2: RBAC Matrix and Router Security Scanner Permission: audit:export (Owner only) denies Employee with 403 on audit:export | 232.59670000000006ms |
| PASS | B18 Security Suite 2: RBAC Matrix and Router Security Scanner Permission: audit:export (Owner only) denies Reviewer with 403 on audit:export | 246.39930000000004ms |
| PASS | B18 Security Suite 2: RBAC Matrix and Router Security Scanner Permission: agent:use (Owner and Employee, not Reviewer) denies Reviewer with 403 on POST /agent/runs | 553.5640000000003ms |
| PASS | B18 Security Suite 2: RBAC Matrix and Router Security Scanner Permission: finance:read (Owner, Employee, and Reviewer) allows Reviewer to read accounts | 374.0434000000005ms |
| PASS | B18 Security Suite 2: RBAC Matrix and Router Security Scanner Permission: finance:read (Owner, Employee, and Reviewer) denies Anonymous with 401 on finance:read | 330.85239999999976ms |
| PASS | B18 Security Suite 2: RBAC Matrix and Router Security Scanner Router Security Stack Inspection verifies that only /health/* is public and all /api/v1/* routes reject anonymous requests with 401 | 501.3833000000013ms |

### src/__security__/tenant-isolation.test.ts (13 tests)

| Status | Test Name | Duration |
|---|---|---|
| PASS | B18 Security Suite 1: Tenant Isolation Direct Resource ID Lookups returns 404 when Tenant B queries Tenant A invoice by id | 1228.9405000000006ms |
| PASS | B18 Security Suite 1: Tenant Isolation Direct Resource ID Lookups returns 404 when Tenant B queries Tenant A alert by id | 192.90880000000016ms |
| PASS | B18 Security Suite 1: Tenant Isolation Direct Resource ID Lookups returns 404 when Tenant B queries Tenant A action proposal by id | 167.5568999999996ms |
| PASS | B18 Security Suite 1: Tenant Isolation Direct Resource ID Lookups returns 404 when Tenant B queries Tenant A agent run by id | 160.0047999999997ms |
| PASS | B18 Security Suite 1: Tenant Isolation List and Aggregate Isolation never leaks Tenant A accounts in Tenant B accounts list | 154.89330000000064ms |
| PASS | B18 Security Suite 1: Tenant Isolation List and Aggregate Isolation never leaks Tenant A invoices in Tenant B invoices list | 231.05029999999988ms |
| PASS | B18 Security Suite 1: Tenant Isolation List and Aggregate Isolation never leaks Tenant A commitments in Tenant B commitments list | 255.65430000000015ms |
| PASS | B18 Security Suite 1: Tenant Isolation List and Aggregate Isolation never leaks Tenant A alerts in Tenant B alerts list | 206.13900000000012ms |
| PASS | B18 Security Suite 1: Tenant Isolation List and Aggregate Isolation never leaks Tenant A proposals in Tenant B action proposals list | 250.8127999999997ms |
| PASS | B18 Security Suite 1: Tenant Isolation List and Aggregate Isolation never leaks Tenant A agent runs in Tenant B agent runs list | 417.84590000000026ms |
| PASS | B18 Security Suite 1: Tenant Isolation Header Spoofing & Cross-Tenant Impersonation rejects with 403 when user from Tenant B sends forged X-Tenant-Id of Tenant A | 437.2585000000008ms |
| PASS | B18 Security Suite 1: Tenant Isolation Header Spoofing & Cross-Tenant Impersonation rejects with 403 when a non-member tries to access Tenant A | 369.6409999999996ms |
| PASS | B18 Security Suite 1: Tenant Isolation SSE Stream Isolation ensures Tenant B event bus listeners never receive Tenant A domain events | 332.7420000000002ms |

