import { type ForecastPoint, type WeeklyBucket } from '@harbor/contracts';

/**
 * Aggregate 91 daily forecast points into 13 7-day weekly buckets.
 * Buckets are 0..6 (week 1), 7..13 (week 2), ..., 84..90 (week 13).
 *
 * @param points - Array of 91 ForecastPoint
 * @returns Array of 13 WeeklyBucket
 */
export function toWeekly(points: ForecastPoint[]): WeeklyBucket[] {
  const buckets: WeeklyBucket[] = [];
  const DAYS_PER_WEEK = 7;
  const numWeeks = Math.floor(points.length / DAYS_PER_WEEK);

  for (let w = 0; w < numWeeks; w++) {
    const startIdx = w * DAYS_PER_WEEK;
    const endIdx = startIdx + DAYS_PER_WEEK;
    const weekPoints = points.slice(startIdx, endIdx);

    const first = weekPoints[0]!;
    const last = weekPoints[weekPoints.length - 1]!;

    let minMinor = first.closingMinor;
    let receiptsMinor = 0;
    let paymentsMinor = 0;
    let financingMinor = 0;
    let feesMinor = 0;
    let repaymentsMinor = 0;

    for (const p of weekPoints) {
      if (p.closingMinor < minMinor) {
        minMinor = p.closingMinor;
      }
      receiptsMinor += p.receiptsMinor;
      paymentsMinor += p.paymentsMinor;
      financingMinor += p.financingMinor;
      feesMinor += p.feesMinor;
      repaymentsMinor += p.repaymentsMinor;
    }

    buckets.push({
      startDate: first.date,
      endDate: last.date,
      closingMinor: last.closingMinor,
      minMinor,
      receiptsMinor,
      paymentsMinor,
      financingMinor,
      feesMinor,
      repaymentsMinor,
    });
  }

  return buckets;
}

