import { describe, it, expect } from 'vitest';
import { toWeekly } from '../weekly';
import { type ForecastPoint } from '@harbor/contracts';
import { addDays } from '@harbor/contracts/common/dates';

describe('toWeekly', () => {
  it('aggregates 91 daily points into exactly 13 weekly buckets', () => {
    const points: ForecastPoint[] = [];
    const startDate = '2026-10-20';

    for (let i = 0; i < 91; i++) {
      points.push({
        date: addDays(startDate, i),
        closingMinor: 100_000 + i * 1_000,
        receiptsMinor: 2_000,
        paymentsMinor: 1_000,
        financingMinor: 0,
        feesMinor: 0,
        repaymentsMinor: 0,
        sources: [],
      });
    }

    const weekly = toWeekly(points);
    expect(weekly).toHaveLength(13);

    // Week 1 (days 0..6)
    expect(weekly[0]!.startDate).toBe('2026-10-20');
    expect(weekly[0]!.endDate).toBe('2026-10-26');
    expect(weekly[0]!.closingMinor).toBe(points[6]!.closingMinor);
    expect(weekly[0]!.minMinor).toBe(points[0]!.closingMinor);
    expect(weekly[0]!.receiptsMinor).toBe(2_000 * 7);
    expect(weekly[0]!.paymentsMinor).toBe(1_000 * 7);

    // Week 13 (days 84..90)
    expect(weekly[12]!.startDate).toBe('2027-01-12');
    expect(weekly[12]!.endDate).toBe('2027-01-18');
    expect(weekly[12]!.closingMinor).toBe(points[90]!.closingMinor);
  });
});

