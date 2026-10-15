import { describe, it, expect } from 'vitest';
import { conservative } from '../conservative';
import { type ForecastInput } from '@harbor/contracts';

describe('conservative', () => {
  const baseInput: ForecastInput = {
    asOfDate: '2026-10-20',
    openingCashMinor: 100_000,
    floorMinor: 50_000,
    horizonDays: 91,
    invoices: [
      {
        externalId: 'AR-OVERDUE',
        direction: 'AR',
        outstandingMinor: 40_000,
        dueOn: '2026-09-30', // overdue (dueOn < asOfDate)
        expectedSettlementOn: '2026-11-01',
        counterpartyExternalId: 'CUST-1',
      },
      {
        externalId: 'AR-CURRENT',
        direction: 'AR',
        outstandingMinor: 20_000,
        dueOn: '2026-11-15', // not overdue
        expectedSettlementOn: '2026-11-20',
        counterpartyExternalId: 'CUST-2',
      },
      {
        externalId: 'AP-OVERDUE',
        direction: 'AP',
        outstandingMinor: 30_000,
        dueOn: '2026-09-15', // AP should not be shifted
        expectedSettlementOn: '2026-10-25',
        counterpartyExternalId: 'VEND-1',
      },
    ],
    commitments: [],
    financing: [],
    scheduledLedger: [],
  };

  it('shifts overdue AR invoices by extraDays without mutating original', () => {
    const result = conservative(baseInput, 14);

    // Original not mutated
    expect(baseInput.invoices[0]!.expectedSettlementOn).toBe('2026-11-01');

    // Overdue AR shifted by 14 days: 2026-11-01 + 14 = 2026-11-15
    const overdueAr = result.invoices.find((i) => i.externalId === 'AR-OVERDUE')!;
    expect(overdueAr.expectedSettlementOn).toBe('2026-11-15');

    // Current AR untouched
    const currentAr = result.invoices.find((i) => i.externalId === 'AR-CURRENT')!;
    expect(currentAr.expectedSettlementOn).toBe('2026-11-20');

    // AP untouched
    const overdueAp = result.invoices.find((i) => i.externalId === 'AP-OVERDUE')!;
    expect(overdueAp.expectedSettlementOn).toBe('2026-10-25');
  });
});

