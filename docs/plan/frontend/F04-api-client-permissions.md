# F04 API client, JWT handling, permissions layer and role-aware navigation

Depends: F03. Priority: P0. Read first: ARCHITECTURE.md sections 5, 6; PRODUCT_BRIEF.md roles table.

## Goal

One typed way to call the Express API with a Better Auth JWT and tenant header, shared TanStack Query setup, a live event stream hook, and permission helpers for UX. UI checks are convenience only; the API enforces everything.

## Files

- `src/lib/api/client.ts` (`apiFetch<T>(path, options)`), `errors.ts` (`ApiError` with `code`, `status`, `requestId`), `sse.ts`
- `src/lib/query/query-client.ts`, `src/lib/query/keys.ts` (central query key factory per feature)
- `src/features/auth/lib/api-token.ts` (cached JWT with single-flight refresh)
- `src/features/auth/hooks/use-permission.ts`, `use-me.ts`; `components/can.tsx`, `forbidden-state.tsx`
- `src/features/events/hooks/use-event-stream.ts`, `src/features/events/lib/invalidation-map.ts`, `src/features/events/index.ts`
- Update `sidebar-nav.tsx` to hide items the role cannot use (and show disabled hints where useful)

## Specification

- `getApiToken()`: calls `authClient.token()`, caches in memory, refreshes when less than 60 seconds remain; concurrent callers share one request; clears on sign-out and company switch.
- `apiFetch`: base URL `NEXT_PUBLIC_API_URL + /api/v1`; headers `Authorization: Bearer <jwt>`, `X-Tenant-Id: <active company id>`, `Content-Type: application/json`; optional `Idempotency-Key`; parses the envelope `{ data }`; throws `ApiError` for `{ error }` or network failure. On 401: refresh token once and retry; if it fails again, sign out and redirect to `/sign-in`. On 403: throw `ApiError('FORBIDDEN')` (screens show `ForbiddenState`; no automatic toast loops). Supports `FormData` uploads (do not set content type).
- `usePermission(permission)` and `<Can permission="actions:approve" fallback={...}>` read the role from the active member and `hasPermission` from contracts. `useMe()` calls `GET /me` as the server-side truth and warns in dev if it disagrees with the client role.
- `sse.ts`: uses `@microsoft/fetch-event-source` with the same headers, `Last-Event-ID` from the last received sequence, exponential backoff reconnect (1 s to 15 s), reopen with a fresh token when the server closes at token expiry, aborts on unmount. Emits typed events from `@harbor/contracts`.
- `use-event-stream.ts`: mounted once in the `(app)` layout; on each event invalidates the relevant queries using `invalidation-map.ts` (`import.committed` -> forecast, analytics, alerts, imports, ledger; `forecast.updated` -> forecast, alerts; `alert.raised|resolved` -> alerts; `action.committed` -> forecast, proposals, ledger, analytics; `tool.*`/`run.*` -> agent run caches) and shows a toast for `alert.raised`.
- Query defaults: `staleTime` 30 s, `retry` 1 (no retry on 4xx), `refetchOnWindowFocus` false.

## Tasks

- [ ] Token cache and single-flight refresh tested (concurrent calls cause one `authClient.token()`)
- [ ] `apiFetch` tests: success envelope, error envelope, 401 refresh-and-retry, second 401 signs out, network error, FormData
- [ ] `usePermission` and `<Can>` tested for all three roles
- [ ] SSE hook tested with a mocked stream (reconnect, resume id, invalidation mapping)
- [ ] Sidebar filters by permission
- [ ] Manual check against the real API (needs S02): `/me` shows the right role per demo account
- [ ] Master plan row F04 set to `[x]`
