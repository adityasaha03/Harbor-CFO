# B15 Agent tools and registry

Depends: B09, B11, B12, B13, B14. Priority: P0. Read first: PRODUCT_BRIEF.md principles; ARCHITECTURE.md section 8.

## Goal

A constrained tool registry: the only way the LLM can read data or propose actions. Every tool is a thin, validated wrapper over an existing service with allow-listed outputs.

## Files (`apps/api/src/features/agent/tools/`)

`registry.ts`, `run-tool.ts`, `tool.types.ts`, `sanitize.ts`, `get-cash-position.tool.ts`, `get-forecast.tool.ts`, `get-kpis.tool.ts`, `list-overdue-invoices.tool.ts`, `match-financing.tool.ts`, `simulate-scenario.tool.ts`, `create-action-proposal.tool.ts`, `get-action-status.tool.ts`, `index.ts`, `__tests__/`
Contracts: fill `packages/contracts/src/agent.ts` (tool names, RunEvent shapes).

## Specification

- `Tool` type: `{ name, description, permission, costClass, inputSchema (Zod, strict), outputSchema (Zod), execute(actor, args) }`. The registry is a frozen map; the model-facing list is generated from it (name, description, JSON schema from Zod).
- `runTool(actor, call)`: unregistered name -> `DeniedError('UNREGISTERED_TOOL')`; parse args with the strict schema (unknown keys rejected); re-check `hasPermission(actor.role, tool.permission)` against the CURRENT membership role; consume the per-run budget; execute; validate output schema; write an audit event with sanitized args and result refs; return the result. The actor comes from the session, never from tool arguments (`tenantId`, `userId`, `role` are not allowed argument names).
- Tools and permissions: `getCashPosition` (`finance:read`), `getForecast` (`finance:read`, optional `scenarioId`), `getKpis` (`finance:read`), `listOverdueInvoices` (`finance:read`, `minDays`), `matchFinancing` (`finance:read`, `desiredAmountMinor?`, `purpose`), `simulateScenario` (`scenarios:write`, typed changes from B13), `createActionProposal` (`actions:propose`, `offerCode`, `principalMinor`, `scenarioId?`; creates a proposal with `source: 'agent'` and returns proposal id, hash and the exact payload), `getActionStatus` (`finance:read`, `proposalId`).
- There is NO tool for approving or executing, for raw database access, shell, HTTP, or file access. Add a test that asserts the registry has exactly these tool names.
- Output sanitization (`sanitize.ts`): allow-list fields only; counterparties appear only as `maskedName`; no account numbers, emails or user ids; money as minor-unit integers plus a formatted string. Free text from imports (`description`) may be included only in `listOverdueInvoices` as `untrustedText`, truncated to 200 chars, so the prompt-injection demo is real; the system prompt (B16) treats it as data.
- Every tool result includes `evidenceRefs` (ids of forecast run, invoices, offers, proposals) used by the UI and the evidence export.

## Tasks

- [x] Contracts filled
- [x] Registry exactly matches the tool list; test fails if a tool is added without an explicit allow-list entry
- [x] `runTool` tests: unregistered tool, unknown arg key, forged `tenantId` argument ignored/rejected, permission denied for Reviewer on `simulateScenario`, budget exhausted
- [x] Each tool tested against the anchor tenant with exact numbers from earlier chunks
- [x] Sanitization tests: masked names, no PII, truncated untrusted text, no description leakage elsewhere
- [x] `createActionProposal` produces a pending proposal and never executes anything (ledger unchanged)
- [x] Master plan row B15 set to `[x]`
