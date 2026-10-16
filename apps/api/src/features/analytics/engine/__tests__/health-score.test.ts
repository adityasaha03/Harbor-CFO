import { describe, it, expect } from 'vitest';
import { computeHealthScore } from '../health-score';

describe('B19 Health Score Engine', () => {
  it('returns perfect 100 score and Excellent rating when all indicators are optimal', () => {
    const result = computeHealthScore({
      minCashMinor: 5_000_000, // 50,000 >= 30,000 floor -> liquidity = 1.0 (40 pts)
      floorMinor: 3_000_000,
      totalArMinor: 10_000_000,
      overdueArMinor: 0, // 0 overdue -> receivables = 1.0 (25 pts)
      topCustomerSharePct: 25, // 25% <= 40% threshold -> concentration = 1.0 (20 pts)
      concentrationThresholdPct: 40,
      lastImportAt: '2026-10-18T10:00:00.000Z', // 2 days ago <= 14 -> freshness = 1.0 (15 pts)
      asOfDate: '2026-10-20',
      staleDataDays: 14,
    });

    expect(result.score).toBe(100);
    expect(result.rating).toBe('Excellent');
    expect(result.components).toEqual({
      liquidity: 1,
      receivables: 1,
      concentration: 1,
      freshness: 1,
    });
    expect(result.deductions).toEqual({
      liquidity: 0,
      receivables: 0,
      concentration: 0,
      freshness: 0,
    });
    expect(result.reasons).toEqual([
      'All financial health indicators are within optimal operating targets.',
    ]);
  });

  it('correctly handles zero AR without penalty (receivables = 1)', () => {
    const result = computeHealthScore({
      minCashMinor: 4_000_000,
      floorMinor: 3_000_000,
      totalArMinor: 0, // No AR on file
      overdueArMinor: 0,
      topCustomerSharePct: 0,
      lastImportAt: '2026-10-19T00:00:00.000Z',
      asOfDate: '2026-10-20',
    });

    expect(result.components.receivables).toBe(1);
    expect(result.deductions.receivables).toBe(0);
    expect(result.score).toBe(100);
  });

  it('lowers liquidity component and overall score when floor is breached', () => {
    const result = computeHealthScore({
      minCashMinor: 1_500_000, // 15,000 / 30,000 = 0.5 liquidity (20/40 pts)
      floorMinor: 3_000_000,
      totalArMinor: 10_000_000,
      overdueArMinor: 0,
      topCustomerSharePct: 20,
      lastImportAt: '2026-10-19T00:00:00.000Z',
      asOfDate: '2026-10-20',
    });

    // 40 * 0.5 + 25 * 1 + 20 * 1 + 15 * 1 = 20 + 25 + 20 + 15 = 80
    expect(result.components.liquidity).toBe(0.5);
    expect(result.deductions.liquidity).toBe(20);
    expect(result.score).toBe(80);
    expect(result.rating).toBe('Excellent');
    expect(result.reasons[0]).toContain('liquidity floor');
  });

  it('clamps liquidity to 0 when projected cash is negative', () => {
    const result = computeHealthScore({
      minCashMinor: -2_000_000, // -20,000 -> liquidity clamped to 0
      floorMinor: 3_000_000,
      totalArMinor: 6_000_000,
      overdueArMinor: 4_000_000, // 40k/60k = 66.7% overdue -> receivables = 0.333
      topCustomerSharePct: 66.7, // 66.7% > 40% threshold -> concentration deduction
      lastImportAt: '2026-10-19T00:00:00.000Z',
      asOfDate: '2026-10-20',
    });

    expect(result.components.liquidity).toBe(0);
    expect(result.deductions.liquidity).toBe(40);
    expect(result.score).toBeLessThan(40);
    expect(result.rating).toBe('Poor');
    expect(result.reasons[0]).toContain('Projected cash turns negative');
  });

  it('penalizes stale data when import is older than staleDataDays or missing', () => {
    const resultStale = computeHealthScore({
      minCashMinor: 5_000_000,
      floorMinor: 3_000_000,
      totalArMinor: 10_000_000,
      overdueArMinor: 0,
      topCustomerSharePct: 20,
      lastImportAt: '2026-09-01T00:00:00.000Z', // > 14 days ago
      asOfDate: '2026-10-20',
      staleDataDays: 14,
    });

    expect(resultStale.components.freshness).toBe(0.5);
    expect(resultStale.deductions.freshness).toBe(7.5);
    // 40 + 25 + 20 + 7.5 = 92.5 -> 93
    expect(resultStale.score).toBe(93);

    const resultMissing = computeHealthScore({
      minCashMinor: 5_000_000,
      floorMinor: 3_000_000,
      totalArMinor: 10_000_000,
      overdueArMinor: 0,
      topCustomerSharePct: 20,
      lastImportAt: null,
      asOfDate: '2026-10-20',
    });

    expect(resultMissing.components.freshness).toBe(0.5);
  });

  it('orders top reasons by largest point deduction', () => {
    const result = computeHealthScore({
      minCashMinor: 0, // 0 / 30,000 = 0 -> 40 points deducted
      floorMinor: 3_000_000,
      totalArMinor: 10_000_000,
      overdueArMinor: 5_000_000, // 50% overdue -> 12.5 points deducted
      topCustomerSharePct: 70, // (70 - 40) / 60 = 0.5 -> 10 points deducted
      lastImportAt: '2026-09-01T00:00:00.000Z', // 7.5 points deducted
      asOfDate: '2026-10-20',
    });

    // Deductions order: liquidity (40) > receivables (12.5) > concentration (10) > freshness (7.5)
    expect(result.reasons).toHaveLength(3);
    expect(result.reasons[0]).toContain('liquidity floor');
    expect(result.reasons[1]).toContain('Overdue receivables');
    expect(result.reasons[2]).toContain('safety threshold');
  });
});
