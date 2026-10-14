# S01 Contracts package

Depends: S00. Priority: P0. Read first: ARCHITECTURE.md sections 2, 3, 6, 7; PRODUCT_BRIEF.md roles table.

## Goal

`@harbor/contracts`: the single shared source for enums, permissions, Zod schemas, API envelope types and money/date helpers used by both apps.

## Files to create (`packages/contracts`)

- `package.json` (name `@harbor/contracts`, `exports` pointing to `./src/index.ts`, dependencies `zod`, `decimal.js`), `tsconfig.json` extending the base, `vitest.config.ts`
- `src/index.ts` re-exports everything
- `src/common/ids.ts`, `money.ts`, `dates.ts`, `api.ts`, `pagination.ts`
- `src/auth/roles.ts`, `permissions.ts`, `demo-accounts.ts`
- `src/<feature>.ts` stub files, one per feature, created with a header comment only: `tenants`, `ledger`, `invoices`, `imports`, `forecast`, `alerts`, `analytics`, `financing`, `scenarios`, `actions`, `agent`, `events`, `audit`. Later chunks fill only their own file.
- `src/__tests__/money.test.ts`, `dates.test.ts`, `permissions.test.ts`

## Specification

- `roles.ts`: `ROLES = ['owner','employee','reviewer'] as const`, `Role` type, `roleSchema`.
- `permissions.ts`: `PERMISSIONS` (`finance:read`, `imports:write`, `scenarios:write`, `agent:use`, `actions:propose`, `actions:approve`, `audit:export`, `settings:manage`), `ROLE_PERMISSIONS: Record<Role, Permission[]>` exactly as the matrix in PRODUCT_BRIEF.md, and `hasPermission(role, permission)`.
- `money.ts`: `toMinor("12500.00") -> 1250000` using string parsing, no float math (reject more than 2 decimals, non-numeric input, unsafe integers); `formatMinor(minor, currency='CNY')` for display; `assertSafeMinor`; `applyBps(minor, bps)` using `decimal.js`, rounding half up to an integer.
- `dates.ts`: `isDateOnly`, `addDays(dateOnly, n)`, `diffDays(a, b)`, `eachDay(start, count)`, all UTC based; `dateOnlySchema` (regex plus real-calendar validation).
- `api.ts`: `ApiSuccess<T>`, `ApiErrorBody`, `ErrorCode` union (`VALIDATION_ERROR`, `UNAUTHENTICATED`, `FORBIDDEN`, `NOT_FOUND`, `CONFLICT`, `PAYLOAD_TOO_LARGE`, `RATE_LIMITED`, `INTERNAL`).
- `pagination.ts`: `paginationQuerySchema` (`page` default 1, `pageSize` default 20, max 100).
- `demo-accounts.ts`: constants used by seeds and tests: tenant slugs `harbor-wholesale` and `pearl-bakery`; emails `owner@harbor.demo`, `employee@harbor.demo`, `reviewer@harbor.demo`, `owner@pearl.demo`. The shared demo password is read from env in seed scripts, never hard-coded here.

## Tasks

- [x] Package created and importable from both apps (verify once `apps/api` and `apps/web` exist, or with a vitest alias now)
- [x] `ROLE_PERMISSIONS` matches the brief; a test asserts every role/permission pair
- [x] Money tests: `toMinor("12500.00") === 1250000`; `applyBps(6000000, 200) === 120000`; rejects `"1.234"`, `"abc"`, `"9007199254740993"`
- [x] Date tests: `addDays('2026-10-20', 21) === '2026-11-10'`; month-end and leap-year cases; invalid dates rejected
- [x] Feature stub files created and re-exported from `index.ts`
- [x] Master plan row S01 set to `[x]`
