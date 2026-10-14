# F03 Auth pages, company onboarding and route guards

Depends: F02. Priority: P0. Read first: ARCHITECTURE.md sections 4, 5. Better Auth docs: client session hooks, organization client methods (create, set active, list).

## Goal

Users can sign up, sign in, create or select a company, and every app route is protected. Authentication UI is handled entirely from the frontend through the Better Auth client.

## Files

- `src/app/(auth)/sign-in/page.tsx`, `src/app/(auth)/sign-up/page.tsx`, `src/app/(onboarding)/company/page.tsx` (each under 40 lines)
- `src/features/auth/components/`: `sign-in-form.tsx`, `sign-up-form.tsx`, `sign-out-button.tsx`, `user-menu.tsx`, `demo-account-picker.tsx`
- `src/features/auth/hooks/use-session.ts`
- `src/features/tenants/components/`: `create-company-form.tsx`, `company-switcher.tsx`
- `src/features/tenants/hooks/use-active-company.ts`, `src/features/tenants/index.ts`
- `src/proxy.ts` (Next 16) or `src/middleware.ts` (earlier Next): optimistic redirect using the Better Auth session-cookie helper
- Update `src/app/(app)/layout.tsx`: server-side `requireServerSession()` and active-organization check

## Specification

- Forms use React Hook Form + Zod; show field errors and a generic error for failed sign-in (no hint about whether the email exists).
- Sign-up -> redirect to `/company` to create a company (the creator becomes `owner`). Sign-in -> `/dashboard` if an active company exists, else `/company` (select an existing company or create one).
- The proxy/middleware only does a cheap cookie check and redirects unauthenticated requests for `(app)` routes to `/sign-in`. The real check is `requireServerSession()` in the `(app)` layout. If there is a session but no `activeOrganizationId`, redirect to `/company`.
- `demo-account-picker.tsx`: when `NEXT_PUBLIC_DEMO_MODE=true`, show buttons that prefill the demo account emails from `@harbor/contracts` (password is entered by the user; it is shared out-of-band). Never hard-code the password in the client bundle.
- `company-switcher.tsx` in the sidebar lists the user's organizations, sets the active one, shows the user's role as a badge, and clears cached queries on switch.
- `use-session.ts` exposes `{ user, session, activeCompanyId, role, isPending }` where `role` comes from the active member (use the documented client method for the active member role).

## Tasks

- [ ] Sign-up, sign-in, sign-out work end to end
- [ ] Company creation sets the active organization and the creator is `owner`
- [ ] `(app)` routes redirect when logged out; `/sign-in` redirects when logged in
- [ ] Company switcher works and clears the query cache
- [ ] Demo account picker behind `NEXT_PUBLIC_DEMO_MODE`
- [ ] RTL tests for both forms (validation messages, submit calls the client)
- [ ] Master plan row F03 set to `[x]`
