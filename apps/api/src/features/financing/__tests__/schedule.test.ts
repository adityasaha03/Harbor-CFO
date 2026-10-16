import { describe, it, expect } from 'vitest';
import { buildSchedule } from '../engine/schedule';
import { SYNTHETIC_OFFERS } from '../catalog/offers';

describe('B12 Engine: Repayment Schedule Builder', () => {
  const bridgeOffer = SYNTHETIC_OFFERS.find((o) => o.code === 'bridge-term')!;
  const revolverOffer = SYNTHETIC_OFFERS.find((o) => o.code === 'revolver-flex')!;

  it('calculates exact schedule for bridge-term on 6,000,000 fen', () => {
    // Principal 6,000,000 fen on bridge-term (funding on 2026-10-22)
    const schedule = buildSchedule(bridgeOffer, 6_000_000, '2026-10-22');

    expect(schedule.principalMinor).toBe(6_000_000);
    expect(schedule.fundingOn).toBe('2026-10-22');
    expect(schedule.upfrontFeeMinor).toBe(120_000); // 200 bps
    expect(schedule.interestMinor).toBe(180_000); // 300 bps
    expect(schedule.totalRepaymentMinor).toBe(6_180_000);
    expect(schedule.netProceedsMinor).toBe(5_880_000);
    expect(schedule.totalCostMinor).toBe(300_000);

    // 3 installments of 2,060,000
    expect(schedule.installments).toHaveLength(3);
    expect(schedule.installments[0]).toEqual({
      installmentIndex: 1,
      dueOn: '2026-11-24', // 2026-10-22 + 33 days
      amountMinor: 2_060_000,
    });
    expect(schedule.installments[1]).toEqual({
      installmentIndex: 2,
      dueOn: '2026-12-08', // + 14 days
      amountMinor: 2_060_000,
    });
    expect(schedule.installments[2]).toEqual({
      installmentIndex: 3,
      dueOn: '2026-12-22', // + 14 days
      amountMinor: 2_060_000,
    });
  });

  it('calculates exact schedule for revolver-flex on 1,200,000 fen', () => {
    // Principal 1,200,000 fen on revolver-flex (funding on 2026-10-21)
    const schedule = buildSchedule(revolverOffer, 1_200_000, '2026-10-21');

    expect(schedule.principalMinor).toBe(1_200_000);
    expect(schedule.fundingOn).toBe('2026-10-21');
    expect(schedule.upfrontFeeMinor).toBe(24_000); // 200 bps
    expect(schedule.interestMinor).toBe(18_000); // 150 bps
    expect(schedule.totalRepaymentMinor).toBe(1_218_000);
    expect(schedule.netProceedsMinor).toBe(1_176_000);
    expect(schedule.totalCostMinor).toBe(42_000);

    expect(schedule.installments).toHaveLength(1);
    expect(schedule.installments[0]).toEqual({
      installmentIndex: 1,
      dueOn: '2026-11-20', // 2026-10-21 + 30 days
      amountMinor: 1_218_000,
    });
  });

  it('adds remainder to the last installment when repayment is not evenly divisible', () => {
    // Custom dummy offer with 3 installments and 0 interest for simplicity
    const oddOffer = {
      ...bridgeOffer,
      upfrontFeeBps: 0,
      flatInterestBps: 0,
      installments: {
        count: 3,
        firstDueAfterFundingDays: 10,
        intervalDays: 10,
      },
    };

    const schedule = buildSchedule(oddOffer, 100_001, '2026-10-20');
    expect(schedule.installments).toHaveLength(3);
    expect(schedule.installments[0]!.amountMinor).toBe(33_333);
    expect(schedule.installments[1]!.amountMinor).toBe(33_333);
    expect(schedule.installments[2]!.amountMinor).toBe(33_335);

    const sum = schedule.installments.reduce((acc, i) => acc + i.amountMinor, 0);
    expect(sum).toBe(100_001);
  });
});
