import { describe, it, expect } from 'vitest';
import { HARBOR_ANCHOR_INPUT } from '../../../forecast/engine/__tests__/fixtures/harbor-anchor';
import { applyChanges } from '../apply-changes';
import type { ScenarioChange } from '@harbor/contracts';

describe('B13 Scenario Engine - applyChanges', () => {
  it('moves receipt without duplicate inflows', () => {
    const changes: ScenarioChange[] = [
      {
        type: 'move_receipt',
        invoiceExternalId: 'INV-AR-LATE',
        newExpectedSettlementOn: '2026-10-30',
      },
    ];

    const result = applyChanges(HARBOR_ANCHOR_INPUT, changes);

    expect(result.invoices).toHaveLength(HARBOR_ANCHOR_INPUT.invoices.length);
    const moved = result.invoices.find((i) => i.externalId === 'INV-AR-LATE')!;
    expect(moved.expectedSettlementOn).toBe('2026-10-30');

    // Verify original input unchanged (immutability)
    const original = HARBOR_ANCHOR_INPUT.invoices.find((i) => i.externalId === 'INV-AR-LATE')!;
    expect(original.expectedSettlementOn).toBe('2026-11-13');
  });

  it('adds hypothetical financing schedule with flows', () => {
    const changes: ScenarioChange[] = [
      {
        type: 'add_financing',
        offerCode: 'bridge-term',
        principalMinor: 6_000_000,
      },
    ];

    const result = applyChanges(HARBOR_ANCHOR_INPUT, changes);

    expect(result.financing).toHaveLength(1);
    const sim = result.financing[0]!;
    expect(sim.label).toBe('Bridge Term Loan');
    // Draw 6,000,000 on day 2 (2026-10-22)
    const draw = sim.flows.find((f) => f.kind === 'draw')!;
    expect(draw.amountMinor).toBe(6_000_000);
    expect(draw.on).toBe('2026-10-22');

    // Upfront fee 200 bps = 120,000 fen
    const fee = sim.flows.find((f) => f.kind === 'fee')!;
    expect(fee.amountMinor).toBe(120_000);
    expect(fee.on).toBe('2026-10-22');

    // 3 repayments of 2,060,000 fen
    const repayments = sim.flows.filter((f) => f.kind === 'repayment');
    expect(repayments).toHaveLength(3);
    expect(repayments[0]!.on).toBe('2026-11-24'); // day 35
    expect(repayments[0]!.amountMinor).toBe(2_060_000);
    expect(repayments[1]!.on).toBe('2026-12-08'); // day 49
    expect(repayments[1]!.amountMinor).toBe(2_060_000);
    expect(repayments[2]!.on).toBe('2026-12-22'); // day 63
    expect(repayments[2]!.amountMinor).toBe(2_060_000);
  });

  it('adds recurring commitment expense', () => {
    const changes: ScenarioChange[] = [
      {
        type: 'add_recurring',
        label: 'Hire 2 contractors',
        direction: 'outflow',
        amountMinor: 800_000,
        frequency: 'monthly',
        startOn: '2026-11-01',
      },
    ];

    const result = applyChanges(HARBOR_ANCHOR_INPUT, changes);

    expect(result.commitments).toHaveLength(HARBOR_ANCHOR_INPUT.commitments.length + 1);
    const added = result.commitments.find((c) => c.label.includes('contractors'))!;
    expect(added.amountMinor).toBe(800_000);
    expect(added.direction).toBe('outflow');
    expect(added.frequency).toBe('monthly');
    expect(added.anchorOn).toBe('2026-11-01');
  });

  it('defers payment on AP invoice', () => {
    const changes: ScenarioChange[] = [
      {
        type: 'defer_payment',
        invoiceExternalId: 'INV-AP-201',
        newExpectedSettlementOn: '2026-11-15',
        assumption: 'Agreed on net-45 with supplier',
      },
    ];

    const result = applyChanges(HARBOR_ANCHOR_INPUT, changes);

    expect(result.invoices).toHaveLength(HARBOR_ANCHOR_INPUT.invoices.length);
    const deferred = result.invoices.find((i) => i.externalId === 'INV-AP-201')!;
    expect(deferred.expectedSettlementOn).toBe('2026-11-15');
  });

  it('delays customer receipts for stress testing', () => {
    const changes: ScenarioChange[] = [
      {
        type: 'delay_customer_receipts',
        counterpartyExternalId: 'CUST-LATE',
        days: 14,
      },
    ];

    const result = applyChanges(HARBOR_ANCHOR_INPUT, changes);

    const delayed = result.invoices.find((i) => i.externalId === 'INV-AR-LATE')!;
    // 2026-11-13 + 14 days = 2026-11-27
    expect(delayed.expectedSettlementOn).toBe('2026-11-27');

    // Unrelated counterparty remains untouched
    const other = result.invoices.find((i) => i.externalId === 'INV-AR-101')!;
    expect(other.expectedSettlementOn).toBe('2026-11-01');
  });
});
