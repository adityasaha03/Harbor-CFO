# F13 Proof and security page, audit viewer

Depends: F04, B17. Priority: P0. Read first: B17/B18 specs; PRODUCT_BRIEF.md roles.

## Goal

Make security visible: judges can see the permission tiers, run live denial checks, inspect the audit log and download the evidence bundle.

## Files

- `src/app/(app)/proof/page.tsx`
- `src/features/proof/components/`: `permission-matrix.tsx`, `live-checks.tsx`, `check-card.tsx`, `check-result.tsx`, `audit-log-table.tsx`, `evidence-download.tsx`, `known-limitations.tsx`, `current-role-card.tsx`
- `src/features/proof/api/`: `use-proof-checks.ts`, `use-run-proof-check.ts`, `use-audit-events.ts`, `download-evidence.ts`

## Specification

- Permission matrix: rendered from `ROLE_PERMISSIONS` in contracts, highlighting the current role's column.
- Live checks: cards for `employee-execute`, `cross-tenant-lookup`, `injection-import`; "Run check" calls the API as the current user and shows expected vs actual, pass/fail, and the state before and after (counts of ledger entries, approvals, proposals) to prove nothing changed. For an Owner, `employee-execute` shows "Sign in as the demo Employee to run this check".
- Audit log table (Owner only, `audit:export`): time, actor role, action, decision, reason code, resource refs, trace id; paginated; denials visually distinct. Other roles see a notice instead of the table.
- Evidence download (Owner only): calls `GET /evidence/export` and saves the JSON bundle.
- Known limitations (static, honest): synthetic data only; no real bank or lender integration; email verification and MFA not enabled; in-process event bus on a single API instance; environment-held keys; rankings are decision support, not underwriting; replay mode is labelled and is not live inference.

## Tasks

- [x] Matrix, current-role card, limitations
- [x] Live checks with before/after state view
- [x] Audit table and evidence download behind the Owner permission
- [x] RTL tests: Owner vs Employee rendering, failed-check display
- [x] Master plan row F13 set to `[x]`
