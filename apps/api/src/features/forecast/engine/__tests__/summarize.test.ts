import { describe, it, expect } from 'vitest';
import { summarize } from '../summarize';
import { type ForecastPoint } from '@harbor/contracts';

function makePoint(date: string, closingMinor: number): ForecastPoint {
  return {
    date,
    closingMinor,
    receiptsMinor: 0,
    paymentsMinor: 0,
    financingMinor: 0,
    feesMinor: 0,
    repaymentsMinor: 0,
    sources: [],
  };
}

describe('summarize', () => {
  it('returns zeroes for empty points array', () => {
    const s = summarize([], 100_000);
    expect(s.minCashMinor).toBe(0);
    expect(s.minCashDate).toBe('');
    expect(s.firstBelowFloorDate).toBeNull();
    expect(s.firstNegativeDate).toBeNull();
    expect(s.liquidityGapMinor).toBe(0);
  });

  it('correctly identifies min cash, breach dates, and gap', () => {
    const points: ForecastPoint[] = [
      makePoint('2026-10-20', 80_000),
      makePoint('2026-10-21', 40_000),
      makePoint('2026-10-22', 20_000), // Below floor 30,000
      makePoint('2026-10-23', -10_000), // First negative & minimum
      makePoint('2026-10-24', 5_000),
    ];

    const s = summarize(points, 30_000);
    expect(s.minCashMinor).toBe(-10_000);
    expect(s.minCashDate).toBe('2026-10-23');
    expect(s.firstBelowFloorDate).toBe('2026-10-22');
    expect(s.firstNegativeDate).toBe('2026-10-23');
    expect(s.liquidityGapMinor).toBe(40_000); // 30,000 - (-10,000)
  });

  it('returns null for breach dates when no breach occurs', () => {
    const points: ForecastPoint[] = [
      makePoint('2026-10-20', 50_000),
      makePoint('2026-10-21', 40_000),
      makePoint('2026-10-22', 60_000),
    ];

    const s = summarize(points, 30_000);
    expect(s.minCashMinor).toBe(40_000);
    expect(s.minCashDate).toBe('2026-10-21');
    expect(s.firstBelowFloorDate).toBeNull();
    expect(s.firstNegativeDate).toBeNull();
    expect(s.liquidityGapMinor).toBe(0);
  });
});

