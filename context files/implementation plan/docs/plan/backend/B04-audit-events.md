# B04 Audit log and events (SSE and replay)

Depends: B03. Priority: P0. Read first: ARCHITECTURE.md sections 6, 8; DB_SCHEMA.md `events`, `eventCounters`, `auditEvents`.

## Goal
Every security-relevant decision is recorded, and every important state change publishes a persisted event that clients receive live (SSE) and can replay after reconnecting.

## Files
`apps/api/src/features/audit/`: `audit.model.ts`, `audit.repository.ts`, `audit.service.ts`, `audit.controller.ts`, `audit.routes.ts`, `index.ts`, `__tests__/`
`apps/api/src/features/events/`: `events.model.ts` (`events` and `eventCounters`), `events.repository.ts`, `events.service.ts`, `events.bus.ts` (in-process EventEmitter), `events.controller.ts`, `events.routes.ts`, `sse.ts` (writer helper), `index.ts`, `__tests__/`
Contracts: fill `packages/contracts/src/events.ts` and `audit.ts` (event kinds, event DTO, audit DTO).

## Specification
- `auditService.record(input)` writes one `auditEvents` doc: `tenantId`, `actorId?`, `actorRole?`, `action`, `decision` (`allowed`|`denied`), `reasonCode`, `resourceRefs`, `payloadHash?`, `beforeVersion?`, `afterVersion?`, `traceId` (= request id). Never include tokens, raw prompts or free text from imports. `record` accepts an optional `session` so it can join a transaction.
- Replace the logger-only denial hook in `require-permission.middleware.ts` (B03) with `auditService.record({ action: 'permission.denied', decision: 'denied', reasonCode: 'MISSING_PERMISSION', ... })`. Also record membership denials (`NOT_A_MEMBER`) without leaking details to the client.
- `GET /api/v1/audit-events` (permission `audit:export`), paginated, newest first.
- `eventsService.publish(tenantId, { kind, publicSummary, resourceRefs, runId? }, session?)`: gets the next sequence with an atomic upsert `$inc` on `eventCounters`, inserts the event, and after commit emits on the in-process bus. Events never contain private reasoning or raw imported text.
- `GET /api/v1/events?after=<sequence>&limit=` (permission `finance:read`): persisted events after a sequence, max 200.
- `GET /api/v1/events/stream` (permission `finance:read`): SSE. Headers `Content-Type: text/event-stream`, `Cache-Control: no-cache`, `Connection: keep-alive`. Replays events after `Last-Event-ID` (or `?after`), then streams live events for that tenant only. Each message: `id: <sequence>`, `event: <kind>`, `data: <json>`. Heartbeat comment every 15 seconds. Close the stream when the caller's JWT expires (`req.auth.expiresAt`) or after 10 minutes; the client reconnects with a fresh token. Max 5 concurrent streams per user (reject with 429).
- The bus is in-process (single API instance). Document this limitation in a comment and in the Deviation Log if changed.

## Tasks
- [ ] Contracts for events and audit filled
- [ ] Audit model, repository, service, route; denial hook wired; tests for each action
- [ ] Events model with unique `(tenantId, sequence)` and TTL index; sequence is gap-free per tenant under concurrent publishes (test with `Promise.all` of 20 publishes)
- [ ] REST replay endpoint tested (after, limit, tenant isolation)
- [ ] SSE endpoint tested with a Node HTTP client: replay then live event, tenant B never receives tenant A events, stream closes at token expiry, heartbeat sent
- [ ] Routes mounted; master plan row B04 set to `[x]`
