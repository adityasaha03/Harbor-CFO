# Product brief: HarborCFO (SME Finance Copilot)

Competition: 2026 Shenzhen International FinTech Competition, International Track, Topic E.
Scoring: Task completion 40%, Security and compliance 30%, Innovation and interaction 30%.
Deliverables: technical documentation, presentation (max 10 min), demo video (under 5 min), source code + README + tests, security self-assessment (permission tiers + known-risk list), simulated-account execution logs.

One line: know when your business will run short, see why, and approve the safest measurable response.

## The closed loop

Observe (import CSV) -> Diagnose (deterministic forecast + proactive alert) -> Plan (compare remedies) -> Approve (Owner sees the exact terms) -> Execute (sandbox books it once) -> Verify (forecast refreshes, evidence logged).

## Principles

1. Code computes, the LLM explains. The model never invents balances or runs database code.
2. AI proposes, a human approves. Only an Owner can approve and execute a sandbox financing action.
3. Everything is synthetic and simulated, CNY only. No real money, bank, lender or credit data.
4. The Express API is the only authority; the UI is convenience.
5. Strict tenant isolation. One company can never read another's data.

## Roles and permissions

Permissions are strings `resource:action` defined in `@harbor/contracts`.

| Permission | owner | employee | reviewer |
| --- | --- | --- | --- |
| `finance:read` (dashboard, forecast, alerts, financing comparison) | yes | yes | yes |
| `imports:write` (upload and commit CSV) | yes | yes | no |
| `scenarios:write` (create non-committing scenarios) | yes | yes | no |
| `agent:use` | yes | yes | no |
| `actions:propose` | yes | yes | no |
| `actions:approve` (approve and execute sandbox financing) | yes | no | no |
| `audit:export` (evidence export, audit log) | yes | no | no |
| `settings:manage` (tenant settings, commitments, members) | yes | no | no |

## Demo anchor fixture ("Harbor Wholesale", synthetic, CNY major units; store x100 as fen)

Forecast day 0 is `forecastAsOfDate` = 2026-10-20. Day 21 = 2026-11-10.

| Item | CNY |
| --- | --- |
| Cash at day 0 | 80,000 |
| Receipts expected by day 21 | 20,000 |
| Payments by day 21 (supplier 55,000 + payroll 45,000 + rent 12,000 + overhead 8,000) | 120,000 |
| Baseline day-21 cash | -20,000 |
| Liquidity floor | 30,000 (gap to restore the floor: 50,000) |
| Late customer's overdue receivable (existing invoice, expected day 24) | 40,000 |

Remedies the tests assert:

| Remedy | Day-21 cash | Total borrowing cost |
| --- | --- | --- |
| Do nothing | -20,000 | 0 |
| Move the 40,000 receipt to before day 21 | 20,000 | 0 |
| Bridge loan principal 60,000 (upfront fee 1,200, flat interest 1,800, 3 installments of 20,600 at days 35, 49, 63) | 38,800 | 3,000 |
| Move the 40,000 receipt + revolver draw 12,000 (fee 240, interest 180, one repayment of 12,180 at day 31) | 31,760 | 420 |

The fixture must also include: a customer holding more than 40% of outstanding AR, a bridge loan that causes a visible later dip (a payroll date between days 35 and 63), CSV files with bad rows and a reordered duplicate, and one invoice description containing a prompt-injection string stored as plain data.

## Forecast rules (details in chunk B08)

91 daily points. Flows: outstanding AR and AP at their expected settlement dates, recurring commitments, approved financing schedules. Overdue status is not a cash flow. Conservative scenario: overdue AR arrives 14 days later; label it an assumption scenario, never a confidence band.

## Alert rules

`negative_cash` (critical), `floor_breach` (high), `overdue_receivable` (medium/high), `customer_concentration` > 40% of outstanding AR (medium), `repayment_pressure` (high), `stale_data` (info). Alerts are produced by data changes, not by chat. A repeated condition updates one alert (fingerprint).

## Financing

Six fixed synthetic offers (chunk B12), hard eligibility gates, a documented ranking score, total cost (not APR). Rankings are decision support, never underwriting.

## Non-goals

Live bank or lender integration, real underwriting, OCR, mobile app, multi-currency, vector database, multi-agent systems, on-chain features, profit statements inferred from bank data, any claim of guaranteed approval or savings.
