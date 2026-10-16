# F14 Settings and team management

Depends: F04, B05. Priority: P0. Read first: B05 spec; Better Auth organization client docs (members, roles).

## Goal

The Owner configures company settings and recurring commitments and manages team roles; other roles see read-only views.

## Files

- `src/app/(app)/settings/page.tsx` (tabs)
- `src/features/settings/components/`: `settings-tabs.tsx`, `company-settings-form.tsx`, `business-profile-form.tsx`, `commitments-table.tsx`, `commitment-form.tsx`
- `src/features/settings/api/`: `use-tenant-settings.ts`, `use-update-settings.ts`, `use-commitments.ts`, `use-commitment-mutations.ts`
- `src/features/team/components/`: `team-table.tsx`, `role-select.tsx`, `remove-member-dialog.tsx`
- `src/features/team/api/`: `use-members.ts` (wraps the Better Auth organization client; verify method names in the docs)

## Specification

- Company settings: liquidity floor (CNY input converted with `toMinor`), overdue alert days, concentration threshold %, stale data days. Business profile: years in operation, employee count, industry, monthly revenue, monthly card sales (these feed financing eligibility; missing values explain "cannot assess" offers).
- Commitments: table with label, direction, category, amount, frequency, first date, end date; add, edit, delete (Owner). Show how they feed the forecast ("Payroll is included in the 91-day forecast").
- Team: list members with name, email, role; Owner can change a role (owner, employee, reviewer) and remove members, with a confirmation dialog; cannot remove or demote the last Owner (UI guard plus the server/Better Auth rules). Invitations are out of scope unless time remains (P2; the invitation email sender can log the link).
- Non-owners: all inputs disabled with a read-only notice.
- After any settings change the forecast and alerts queries are invalidated.

## Tasks

- [x] Settings and profile forms with Zod validation and money conversion
- [x] Commitments CRUD
- [x] Team table with role change and removal via the Better Auth client; last-owner guard
- [x] Read-only mode for Employee and Reviewer
- [x] RTL tests: money conversion, last-owner guard, read-only rendering
- [x] Master plan row F14 set to `[x]`
