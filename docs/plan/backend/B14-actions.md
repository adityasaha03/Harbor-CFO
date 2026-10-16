# B14 Actions: proposal, approval and execution transaction

Depends: B04, B12, B13. Priority: P0. Read first: DB_SCHEMA.md `actionProposals`, `approvals`, `sandboxOperations`, `financingCommitments`; ARCHITECTURE.md sections 5, 8. This is the most security-critical chunk: implement exactly, test hard.

## Goal

A user or the agent proposes an exact sandbox financing action; only an Owner approves it; the server executes it once, atomically, with idempotency, and writes ledger entries, obligations and evidence.

## Files (`apps/api/src/features/actions/`)

`actions.models.ts` (proposals, approvals, sandboxOperations, financingCommitments), `actions.repository.ts`, `proposals.service.ts`, `approvals.service.ts`, `execution.service.ts`, `payload.ts` (canonicalization and hashing), `actions.controller.ts`, `actions.routes.ts`, `actions.constants.ts`, `index.ts`, `__tests__/`
Contracts: fill `packages/contracts/src/actions.ts`.

## Specification

- **Canonical payload and hash** (`payload.ts`): server resolves `offerCode`, `offerVersion`, `principalMinor`, `fundingOn`, `upfrontFeeMinor`, `interestMinor`, `schedule[]` from the catalog and B12 engine (never trusts client numbers). `payloadHash = sha256(canonicalJson({ tenantId, actionType, payload, baseInputVersion, offerVersion, expiresAt }))` where canonical JSON has sorted keys and no whitespace.
- `POST /api/v1/action-proposals` (`actions:propose`): body `{ actionType: 'sandbox_financing_draw', offerCode, principalMinor, scenarioId? }`. Re-runs the B12 gates; fails with 409 if the scenario (when given) is stale. Stores `status: pending`, `expiresAt` +30 minutes, `baseInputVersion = current datasetVersion`. Publishes `proposal.created` and `approval.required`; audit `proposal.create`. Source `agent` is set only by the agent runtime, never from the request body.
- `GET /api/v1/action-proposals` and `/:id` (`finance:read`): lazily mark expired proposals; returns the full payload, hash, status, `operationId` when executed.
- `POST /api/v1/action-proposals/:id/approve` (`actions:approve`, body `{ payloadHash }`): checks proposal `pending`, not expired, `baseInputVersion` equals the current `datasetVersion`, offer version still current, and body hash equals stored hash. Creates one approval bound to the approver id, role and hash (expires in 5 minutes, `consumedAt: null`); proposal -> `approved`; audit `financing.approve`.
- `POST /api/v1/action-proposals/:id/reject` (`actions:approve`): proposal -> `rejected`; audit.
- `POST /api/v1/action-proposals/:id/execute` (`actions:approve`, required header `Idempotency-Key`, rate limit 10/min per user). Inside ONE `withTransaction`:
  1. If a `sandboxOperations` doc exists for `(tenantId, idempotencyKey)`: same `payloadHash` returns the stored result (200); different hash returns 409 `CONFLICT`.
  2. Load the proposal (tenant-scoped) with status `approved`, and an unconsumed unexpired approval with the same `payloadHash` made by the caller.
  3. Re-read the caller's membership inside the transaction (same session); role must still be `owner`, else `ForbiddenError` (audit `ROLE_REVOKED`).
  4. Compare-and-set the dataset version: `tenantSettings.updateOne({ tenantId, datasetVersion: proposal.baseInputVersion }, { $inc: { datasetVersion: 1 } })`; matched count 0 means stale -> set proposal `conflict`, throw 409.
  5. Consume the approval with a conditional update (`consumedAt: null` -> now); matched 0 means replay -> 409.
  6. Conditional update proposal `approved` -> `executed`.
  7. Insert two ledger entries on `fundingOn`: draw (`+principal`, kind `sandbox_financing_draw`, category `loan_draw`) and fee (`-upfrontFee`, kind `sandbox_financing_fee`, category `loan_fee`); insert one `financingCommitments` with the schedule; insert the `sandboxOperations` doc (`operationId` = `op_` + nanoid, input and output versions); write audit `financing.execute`; insert event `action.committed`.
  8. After commit: recompute the baseline forecast (listener on `action.committed`), then store `forecastBeforeId`/`forecastAfterId` on the operation. These refs feed the evidence export.
     Any exception rolls everything back. Repeating the request never creates a second loan.
- Register a forecast contributor (see B09) that returns active `financingCommitments` schedules as financing flows (`repayment` kind) so executed loans appear in every later forecast. Ledger entries dated after the as-of date are picked up by the loader's `scheduledLedger`.
- After execution, evaluate `repayment_pressure`: if the post-action forecast first falls below the floor later, call `alertsService.raiseRepaymentPressure`.
- All denials and conflicts are audited with reason codes (`NOT_APPROVER`, `STALE_VERSION`, `EXPIRED`, `HASH_MISMATCH`, `APPROVAL_CONSUMED`, `ROLE_REVOKED`). Never expose another tenant's records (404).

## Tasks

- [x] Contracts filled; four models with the indexes from DB_SCHEMA.md
- [x] `payload.ts` tests: key order does not change the hash; any field change changes the hash
- [x] Proposal tests: gate failure, stale scenario, client-supplied fees ignored
- [x] Approval tests: employee 403; stale version 409; wrong hash 409; expired 409
- [x] Execution happy path on the anchor tenant: day-21 baseline cash goes from -2,000,000 to 3,880,000 fen with the bridge, ledger has exactly two new entries, one commitment, one operation, audit and events written, `datasetVersion` +1
- [x] Idempotency: same key twice returns the same operation (one ledger mutation); same key with a different hash returns 409
- [x] Concurrency test: 10 parallel executes of the same approval produce exactly one mutation
- [x] Mutated offer terms (version bump) after proposal invalidate the approval
- [x] Role revoked between approval and execution (change `member.role` in the test) blocks execution and changes nothing
- [x] Rolled-back transaction test (force a failure at step 7): zero partial writes, approval still unconsumed
- [x] Employee calling `execute` directly gets 403 and ledger/approval state is unchanged (state-delta assertion)
- [x] Routes mounted; master plan row B14 set to `[x]`
