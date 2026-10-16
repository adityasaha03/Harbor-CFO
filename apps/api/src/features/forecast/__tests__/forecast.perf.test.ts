import { describe, it, expect } from 'vitest';
import type { ForecastInput, ForecastInvoice, ForecastScheduledLedger } from '@harbor/contracts';
import { runForecast, summarize } from '../engine';

describe('B09 Forecast Engine Performance Target', () => {
  it('computes 91-day baseline forecast for 10,000 invoices/ledger rows in under 2 seconds', () => {
    const invoices: ForecastInvoice[] = [];
    const scheduledLedger: ForecastScheduledLedger[] = [];

    // Generate 7,000 outstanding invoices distributed across 91 days
    for (let i = 1; i <= 7000; i++) {
      const dayOffset = (i % 90) + 1;
      // Format dates within horizon 2026-10-21 to 2027-01-18
      const month = dayOffset <= 11 ? '10' : dayOffset <= 41 ? '11' : dayOffset <= 72 ? '12' : '01';
      const day = ((dayOffset % 28) + 1).toString().padStart(2, '0');
      const year = month === '01' ? '2027' : '2026';
      const dateStr = `${year}-${month}-${day}`;

      invoices.push({
        externalId: `PERF-INV-${i}`,
        direction: i % 3 === 0 ? 'AP' : 'AR',
        outstandingMinor: (i % 100 + 1) * 100_000,
        dueOn: dateStr,
        expectedSettlementOn: dateStr,
        counterpartyExternalId: `PERF-CP-${i % 200}`,
      });
    }

    // Generate 3,000 scheduled ledger entries
    for (let j = 1; j <= 3000; j++) {
      const dayOffset = (j % 90) + 1;
      const month = dayOffset <= 11 ? '10' : dayOffset <= 41 ? '11' : dayOffset <= 72 ? '12' : '01';
      const day = ((dayOffset % 28) + 1).toString().padStart(2, '0');
      const year = month === '01' ? '2027' : '2026';
      const dateStr = `${year}-${month}-${day}`;

      scheduledLedger.push({
        id: `PERF-LEDGER-${j}`,
        label: `Scheduled payment #${j}`,
        on: dateStr,
        amountMinor: ((j % 50) + 1) * 50_000,
      });
    }

    const input: ForecastInput = {
      asOfDate: '2026-10-20',
      openingCashMinor: 100_000_000,
      floorMinor: 5_000_000,
      horizonDays: 91,
      invoices,
      commitments: [
        {
          id: 'COMM-PERF-RENT',
          label: 'Office rent',
          direction: 'outflow',
          amountMinor: 2_000_000,
          frequency: 'monthly',
          anchorOn: '2026-10-25',
        },
        {
          id: 'COMM-PERF-PAYROLL',
          label: 'Staff payroll',
          direction: 'outflow',
          amountMinor: 5_000_000,
          frequency: 'monthly',
          anchorOn: '2026-11-03',
        },
      ],
      financing: [],
      scheduledLedger,
    };

    const startTime = performance.now();
    const points = runForecast(input);
    const summary = summarize(points, input.floorMinor);
    const durationMs = performance.now() - startTime;

    expect(points).toHaveLength(91);
    expect(summary.minCashMinor).toBeDefined();
    // Verify target: under 2000ms (2 seconds)
    expect(durationMs).toBeLessThan(2000);
  });
});
