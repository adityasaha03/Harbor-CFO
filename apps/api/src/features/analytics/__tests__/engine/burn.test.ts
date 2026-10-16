import { describe, it, expect } from 'vitest';
import { computeBurn } from '../../engine/burn';
import type { AnalyticsLedgerItem } from '../../engine/types';

describe('computeBurn Engine', () => {
  const asOf = '2026-10-20';
  const currentCash = 10_000_000; // 100,000 CNY

  it('returns INSUFFICIENT_HISTORY when operating history is under 60 days', () => {
    // Only 30 days of history: 2026-09-20 to 2026-10-20
    const ledger: AnalyticsLedgerItem[] = [
      {
        externalId: 'L-1',
        bookedOn: '2026-09-20',
        amountMinor: -500_000,
        category: 'rent',
      },
      {
        externalId: 'L-2',
        bookedOn: '2026-10-15',
        amountMinor: -500_000,
        category: 'payroll',
      },
    ];

    const res = computeBurn(ledger, asOf, currentCash);
    expect(res.monthlyBurnMinor).toBeNull();
    expect(res.reason).toBe('INSUFFICIENT_HISTORY');
    expect(res.roughRunwayMonths).toBeNull();
    expect(res.isRoughEstimate).toBe(true);
  });

  it('returns NOT_BURNING when net operating movement is positive (net inflow)', () => {
    // 75 days of history: 2026-08-06 to 2026-10-20
    const ledger: AnalyticsLedgerItem[] = [
      {
        externalId: 'L-EARLY',
        bookedOn: '2026-08-06',
        amountMinor: 3_000_000,
        category: 'customer_receipt',
      },
      {
        externalId: 'L-EXP',
        bookedOn: '2026-09-10',
        amountMinor: -1_000_000,
        category: 'payroll',
      },
    ];

    const res = computeBurn(ledger, asOf, currentCash);
    expect(res.historyDays).toBeGreaterThanOrEqual(60);
    expect(res.netOperatingMovementMinor).toBe(2_000_000); // Positive inflow
    expect(res.monthlyBurnMinor).toBeNull();
    expect(res.reason).toBe('NOT_BURNING');
    expect(res.roughRunwayMonths).toBeNull();
  });

  it('strictly excludes loan_* non-operating entries from burn calculations', () => {
    // 75 days of history:
    // Operating: rent -1_000_000, payroll -2_000_000 (net operating = -3_000_000)
    // Loan draw of 10_000_000 should NOT make the tenant appear to not burn!
    const ledger: AnalyticsLedgerItem[] = [
      {
        externalId: 'L-OPERATING-1',
        bookedOn: '2026-08-01',
        amountMinor: -1_000_000,
        category: 'rent',
      },
      {
        externalId: 'L-LOAN-DRAW',
        bookedOn: '2026-08-15',
        amountMinor: 10_000_000,
        category: 'loan_draw',
      },
      {
        externalId: 'L-LOAN-FEE',
        bookedOn: '2026-08-15',
        amountMinor: -200_000,
        category: 'loan_fee',
      },
      {
        externalId: 'L-OPERATING-2',
        bookedOn: '2026-09-25',
        amountMinor: -2_000_000,
        category: 'payroll',
      },
      {
        externalId: 'L-LOAN-REPAY',
        bookedOn: '2026-10-10',
        amountMinor: -3_000_000,
        category: 'loan_repayment',
      },
    ];

    const res = computeBurn(ledger, asOf, currentCash);
    expect(res.historyDays).toBeGreaterThanOrEqual(60);
    // Net operating movement is -3_000_000 (ignoring loan_draw, loan_fee, loan_repayment)
    expect(res.netOperatingMovementMinor).toBe(-3_000_000);
    expect(res.monthlyBurnMinor).toBeGreaterThan(0);
    expect(res.roughRunwayMonths).toBeGreaterThan(0);
  });

  it('computes monthly burn and rough runway when net outflow is positive with >= 60 days history', () => {
    // 90 days of history: net outflow 3,000,000 fen across 90 days -> 1,000,000 fen/month
    const ledger: AnalyticsLedgerItem[] = [
      {
        externalId: 'L-1',
        bookedOn: '2026-07-22',
        amountMinor: -1_000_000,
        category: 'payroll',
      },
      {
        externalId: 'L-2',
        bookedOn: '2026-08-20',
        amountMinor: -1_000_000,
        category: 'rent',
      },
      {
        externalId: 'L-3',
        bookedOn: '2026-09-20',
        amountMinor: -1_000_000,
        category: 'overhead',
      },
    ];

    const res = computeBurn(ledger, asOf, 5_000_000);
    expect(res.historyDays).toBe(90);
    expect(res.netOperatingMovementMinor).toBe(-3_000_000);
    expect(res.monthlyBurnMinor).toBe(1_000_000);
    // Runway: 5,000,000 / 1,000,000 = 5.0 months
    expect(res.roughRunwayMonths).toBe(5.0);
    expect(res.isRoughEstimate).toBe(true);
  });
});
