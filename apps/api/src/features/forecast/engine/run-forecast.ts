import { type ForecastInput, type ForecastPoint } from '@harbor/contracts';
import { addDays } from '@harbor/contracts/common/dates';
import { buildFlows } from './build-flows';

/**
 * Run the deterministic 91-day cash forecast.
 *
 * Day 0 closing = openingCashMinor (flows already in the ledger are not repeated).
 * For day d >= 1: closing[d] = closing[d-1] + sum of all flows on that day.
 *
 * @param input - Complete forecast input (asOfDate, opening cash, invoices, commitments, financing, ledger)
 * @returns Array of ForecastPoint, one per day, for days 0..horizonDays-1
 */
export function runForecast(input: ForecastInput): ForecastPoint[] {
  const { asOfDate, openingCashMinor, horizonDays } = input;

  // Build all flows
  const flows = buildFlows(input);

  // Initialize points
  const points: ForecastPoint[] = [];
  for (let d = 0; d < horizonDays; d++) {
    points.push({
      date: addDays(asOfDate, d),
      closingMinor: 0,
      receiptsMinor: 0,
      paymentsMinor: 0,
      financingMinor: 0,
      feesMinor: 0,
      repaymentsMinor: 0,
      sources: [],
    });
  }

  // Place flows into their day buckets
  for (const flow of flows) {
    const point = points[flow.dayIndex];
    if (!point) continue;

    switch (flow.category) {
      case 'receipt':
        point.receiptsMinor += flow.amountMinor;
        break;
      case 'payment':
        point.paymentsMinor += Math.abs(flow.amountMinor);
        break;
      case 'financing':
        point.financingMinor += flow.amountMinor;
        break;
      case 'fee':
        point.feesMinor += Math.abs(flow.amountMinor);
        break;
      case 'repayment':
        point.repaymentsMinor += Math.abs(flow.amountMinor);
        break;
    }

    point.sources.push(flow.source);
  }

  // Accumulate closing balances
  const day0 = points[0];
  if (day0) {
    day0.closingMinor = openingCashMinor;
  }

  for (let d = 1; d < horizonDays; d++) {
    const prev = points[d - 1]!;
    const curr = points[d]!;
    curr.closingMinor =
      prev.closingMinor
      + curr.receiptsMinor
      - curr.paymentsMinor
      + curr.financingMinor
      - curr.feesMinor
      - curr.repaymentsMinor;
  }

  return points;
}

