import { describe, it, expect } from 'vitest';
import { HARBOR_ANCHOR_INPUT } from '../../../forecast/engine/__tests__/fixtures/harbor-anchor';
import { runForecast } from '../../../forecast/engine/run-forecast';
import { summarize } from '../../../forecast/engine/summarize';
import { FORECAST_ALGORITHM_VERSION } from '../../../forecast/forecast.constants';
import type { ForecastRunDto, ScenarioChange } from '@harbor/contracts';
import { applyChanges } from '../apply-changes';
import { compare } from '../compare';
import { computeScenarioHash } from '../hash';

function makeRun(input: typeof HARBOR_ANCHOR_INPUT): ForecastRunDto {
  const points = runForecast(input);
  const summary = summarize(points, input.floorMinor);

  return {
    id: 'mock-run',
    tenantId: 'tenant-anchor',
    inputVersion: 1,
    algorithmVersion: FORECAST_ALGORITHM_VERSION,
    scenarioHash: 'base',
    asOfDate: input.asOfDate,
    horizonDays: input.horizonDays,
    floorMinor: input.floorMinor,
    openingCashMinor: input.openingCashMinor,
    points,
    summary,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

describe('B13 Scenario Engine - compare & anchor remedies', () => {
  const baselineRun = makeRun(HARBOR_ANCHOR_INPUT);

  it('Remedy 1: Move INV-AR-LATE to 2026-10-30 gives day-21 cash 2,000,000 fen and 0 borrowing cost', () => {
    const changes: ScenarioChange[] = [
      {
        type: 'move_receipt',
        invoiceExternalId: 'INV-AR-LATE',
        newExpectedSettlementOn: '2026-10-30',
      },
    ];

    const scenarioInput = applyChanges(HARBOR_ANCHOR_INPUT, changes);
    const scenarioRun = makeRun(scenarioInput);
    const comparison = compare(baselineRun, scenarioRun, changes);

    // Day-21 cash
    const day21 = comparison.cashAtDays.find((d) => d.day === 21)!;
    expect(day21.scenarioClosingMinor).toBe(2_000_000);
    expect(day21.deltaMinor).toBe(4_000_000); // from -2,000,000 to +2,000,000
    expect(comparison.deltas.day21CashMinor).toBe(4_000_000);

    // Financing cost
    expect(comparison.financing.totalCostMinor).toBe(0);
    expect(comparison.financing.totalCost).toBe(0);
    expect(comparison.financing.repaymentWarnings).toHaveLength(0);
  });

  it('Remedy 2: Bridge loan gives day-21 cash 3,880,000, borrowing cost 300,000, and warning on 2026-12-08', () => {
    const changes: ScenarioChange[] = [
      {
        type: 'add_financing',
        offerCode: 'bridge-term',
        principalMinor: 6_000_000,
      },
    ];

    const scenarioInput = applyChanges(HARBOR_ANCHOR_INPUT, changes);
    const scenarioRun = makeRun(scenarioInput);
    const comparison = compare(baselineRun, scenarioRun, changes);

    // Day-21 cash
    const day21 = comparison.cashAtDays.find((d) => d.day === 21)!;
    expect(day21.scenarioClosingMinor).toBe(3_880_000);

    // Borrowing cost: 1,200 upfront fee + 1,800 flat interest = 3,000 CNY (300,000 fen)
    expect(comparison.financing.totalCostMinor).toBe(300_000);
    expect(comparison.financing.principalMinor).toBe(6_000_000);
    expect(comparison.financing.netProceedsMinor).toBe(5_880_000);
    expect(comparison.financing.repaymentsTotalMinor).toBe(6_180_000);

    // Repayment warning: first below floor after funding on 2026-12-08
    expect(comparison.financing.repaymentWarnings).toHaveLength(1);
    const warning = comparison.financing.repaymentWarnings[0]!;
    expect(warning.date).toBe('2026-12-08');
    expect(warning.message).toContain('2026-12-08');
  });

  it('Remedy 3: Move INV-AR-LATE + Revolver 1,200,000 gives day-21 cash 3,176,000 and total cost 42,000', () => {
    const changes: ScenarioChange[] = [
      {
        type: 'move_receipt',
        invoiceExternalId: 'INV-AR-LATE',
        newExpectedSettlementOn: '2026-10-30',
      },
      {
        type: 'add_financing',
        offerCode: 'revolver-flex',
        principalMinor: 1_200_000,
      },
    ];

    const scenarioInput = applyChanges(HARBOR_ANCHOR_INPUT, changes);
    const scenarioRun = makeRun(scenarioInput);
    const comparison = compare(baselineRun, scenarioRun, changes);

    // Day-21 cash
    const day21 = comparison.cashAtDays.find((d) => d.day === 21)!;
    expect(day21.scenarioClosingMinor).toBe(3_176_000);

    // Total cost: fee 240 + interest 180 = 420 CNY (42,000 fen)
    expect(comparison.financing.totalCostMinor).toBe(42_000);
    expect(comparison.financing.principalMinor).toBe(1_200_000);
    expect(comparison.financing.netProceedsMinor).toBe(1_176_000);
    expect(comparison.financing.repaymentsTotalMinor).toBe(1_218_000);
  });

  it('canonical hashing produces identical hash for equivalent changes regardless of key ordering', () => {
    const changesA = [
      {
        type: 'move_receipt' as const,
        invoiceExternalId: 'INV-1',
        newExpectedSettlementOn: '2026-10-30',
      },
    ];
    const changesB = [
      {
        newExpectedSettlementOn: '2026-10-30',
        type: 'move_receipt' as const,
        invoiceExternalId: 'INV-1',
      },
    ];

    const hashA = computeScenarioHash(changesA, 1);
    const hashB = computeScenarioHash(changesB, 1);
    expect(hashA).toBe(hashB);

    // Different version -> different hash
    const hashV2 = computeScenarioHash(changesA, 2);
    expect(hashV2).not.toBe(hashA);
  });
});
