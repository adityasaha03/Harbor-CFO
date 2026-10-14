# F11 Action approval flow

Depends: F10, B14. Priority: P0. Read first: B14 spec (security critical); API_REFERENCE.md (action proposals).

## Goal
The Owner sees the exact action, its consequences and the current state, approves once, executes once, and sees verified results. Everyone else sees the same information but cannot approve.

## Files
- `src/app/(app)/actions/page.tsx`
- `src/features/actions/components/`: `proposal-list.tsx`, `proposal-card.tsx`, `approval-dialog.tsx`, `payload-details.tsx`, `forecast-impact.tsx`, `execution-result.tsx`, `proposal-status-badge.tsx`, `expiry-countdown.tsx`
- `src/features/actions/api/`: `use-proposals.ts`, `use-proposal.ts`, `use-create-proposal.ts`, `use-approve-proposal.ts`, `use-execute-proposal.ts`, `use-reject-proposal.ts`
- Wire "Create action proposal" from the Scenario Studio

## Specification
- Proposal card: offer name and version, status badge, source (user or agent), created time, expiry countdown, and "Review" button.
- Approval dialog shows the complete server-resolved payload: offer and version, principal, upfront fee, interest, net proceeds, total repayment and **total cost**, funding date, installment schedule, the forecast impact (before vs after: lowest cash, first day below floor, repayment warning), base data version, payload hash (first 12 chars), and the sentence "Simulated action. No real money moves."
- Owner flow: **Approve** -> `POST /approve` with `{ payloadHash }` -> **Execute** -> `POST /execute` with an `Idempotency-Key` created once per dialog (`crypto.randomUUID()`, kept in state so retries reuse it). Disable buttons while pending. Show the operation id, the two ledger entries created, and a before/after mini chart on success; invalidate forecast, alerts, ledger, proposals.
- Error handling: 409 stale data -> "Your data changed. Regenerate this proposal" with a button that creates a fresh proposal; expired -> same; hash mismatch/conflict -> clear message; 403 -> `ForbiddenState`.
- Employee/Reviewer: dialog opens read-only; approve and execute buttons are disabled with "Only an Owner can approve" (UX only; the Proof page demonstrates that the server denies direct calls).
- Never show agent-supplied text as the action description; render only server-resolved structured fields.

## Tasks
- [ ] List, card, dialog and payload details
- [ ] Approve -> execute flow with idempotency key reuse; double-click cannot create two executions (button lock plus server idempotency)
- [ ] Result view with operation id, ledger entries and before/after forecast
- [ ] Conflict, expired and stale-version states with regenerate action
- [ ] Role-based read-only mode
- [ ] RTL tests: owner flow with mocked API (calls in order, same idempotency key on retry), employee disabled state, 409 handling
- [ ] Master plan row F11 set to `[x]`
