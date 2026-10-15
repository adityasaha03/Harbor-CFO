import { type ForecastPoint, type ForecastSummary } from '@harbor/contracts';

/**
 * Compute summary metrics from forecast points.
 *
 * @param points - Array of daily ForecastPoint (must have at least one)
 * @param floorMinor - The liquidity floor in fen
 * @returns ForecastSummary with min cash, breach dates, and liquidity gap
 */
export function summarize(points: ForecastPoint[], floorMinor: number): ForecastSummary {
  if (points.length === 0) {
    return {
      minCashMinor: 0,
      minCashDate: '',
      firstBelowFloorDate: null,
      firstNegativeDate: null,
      liquidityGapMinor: 0,
    };
  }

  let minCashMinor = points[0]!.closingMinor;
  let minCashDate = points[0]!.date;
  let firstBelowFloorDate: string | null = null;
  let firstNegativeDate: string | null = null;

  for (const point of points) {
    if (point.closingMinor < minCashMinor) {
      minCashMinor = point.closingMinor;
      minCashDate = point.date;
    }

    if (firstBelowFloorDate === null && point.closingMinor < floorMinor) {
      firstBelowFloorDate = point.date;
    }

    if (firstNegativeDate === null && point.closingMinor < 0) {
      firstNegativeDate = point.date;
    }
  }

  const liquidityGapMinor = Math.max(0, floorMinor - minCashMinor);

  return {
    minCashMinor,
    minCashDate,
    firstBelowFloorDate,
    firstNegativeDate,
    liquidityGapMinor,
  };
}

