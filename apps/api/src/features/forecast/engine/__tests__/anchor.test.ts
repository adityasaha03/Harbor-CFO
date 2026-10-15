import { describe, it, expect } from 'vitest';
import { HARBOR_ANCHOR_INPUT } from './fixtures/harbor-anchor';
import { runForecast } from '../run-forecast';
import { summarize } from '../summarize';
import { conservative } from '../conservative';
import { type ForecastInput } from '@harbor/contracts';

describe('B08 Anchor Assertions', () => {
  describe('Baseline Harbor Wholesale fixture', () => {
    const points = runForecast(HARBOR_ANCHOR_INPUT);
    const summary = summarize(points, HARBOR_ANCHOR_INPUT.floorMinor);

    it('asserts 91 daily points generated from day 0', () => {
      expect(points).toHaveLength(91);
      expect(points[0]!.date).toBe('2026-10-20');
      expect(points[0]!.closingMinor).toBe(8_000_000);
      expect(points[90]!.date).toBe('2027-01-18');
    });

    it('asserts day-21 (2026-11-10) closing balance is -2,000,000 fen', () => {
      const day21 = points[21]!;
      expect(day21.date).toBe('2026-11-10');
      expect(day21.closingMinor).toBe(-2_000_000);
    });

    it('asserts receipts by day 21 sum to 2,000,000 fen', () => {
      let totalReceipts = 0;
      for (let i = 0; i <= 21; i++) {
        totalReceipts += points[i]!.receiptsMinor;
      }
      expect(totalReceipts).toBe(2_000_000);
    });

    it('asserts payments by day 21 sum to 12,000,000 fen', () => {
      let totalPayments = 0;
      for (let i = 0; i <= 21; i++) {
        totalPayments += points[i]!.paymentsMinor;
      }
      expect(totalPayments).toBe(12_000_000);
    });

    it('asserts firstBelowFloorDate is 2026-10-29', () => {
      expect(summary.firstBelowFloorDate).toBe('2026-10-29');
    });

    it('asserts firstNegativeDate is 2026-11-03', () => {
      expect(summary.firstNegativeDate).toBe('2026-11-03');
    });

    it('asserts minCashMinor is -2,000,000 occurring first on 2026-11-07', () => {
      expect(summary.minCashMinor).toBe(-2_000_000);
      expect(summary.minCashDate).toBe('2026-11-07');
    });

    it('asserts liquidityGapMinor is 5,000,000 fen', () => {
      expect(summary.liquidityGapMinor).toBe(5_000_000);
    });
  });

  describe('Remedy 1: Move INV-AR-LATE to 2026-10-30 (day 10)', () => {
    it('results in day-21 closing of 2,000,000 fen', () => {
      const modifiedInput: ForecastInput = {
        ...HARBOR_ANCHOR_INPUT,
        invoices: HARBOR_ANCHOR_INPUT.invoices.map((inv) =>
          inv.externalId === 'INV-AR-LATE'
            ? { ...inv, expectedSettlementOn: '2026-10-30' }
            : { ...inv },
        ),
      };

      const points = runForecast(modifiedInput);
      const day21 = points[21]!;
      expect(day21.date).toBe('2026-11-10');
      expect(day21.closingMinor).toBe(2_000_000);
    });
  });

  describe('Remedy 2: Bridge loan', () => {
    it('results in day-21 closing 3,880,000 and first below floor after day 21 is 2026-12-08', () => {
      const bridgeInput: ForecastInput = {
        ...HARBOR_ANCHOR_INPUT,
        financing: [
          {
            id: 'FIN-BRIDGE-01',
            label: 'Bridge loan',
            flows: [
              { on: '2026-10-22', amountMinor: 6_000_000, kind: 'draw' },
              { on: '2026-10-22', amountMinor: 120_000, kind: 'fee' },
              { on: '2026-11-24', amountMinor: 2_060_000, kind: 'repayment' }, // day 35
              { on: '2026-12-08', amountMinor: 2_060_000, kind: 'repayment' }, // day 49
              { on: '2026-12-22', amountMinor: 2_060_000, kind: 'repayment' }, // day 63
            ],
          },
        ],
      };

      const points = runForecast(bridgeInput);
      const day21 = points[21]!;
      expect(day21.date).toBe('2026-11-10');
      expect(day21.closingMinor).toBe(3_880_000);

      // Check first day below floor after day 21
      let firstBelowFloorAfterDay21: string | null = null;
      for (let i = 22; i < points.length; i++) {
        if (points[i]!.closingMinor < bridgeInput.floorMinor) {
          firstBelowFloorAfterDay21 = points[i]!.date;
          break;
        }
      }
      expect(firstBelowFloorAfterDay21).toBe('2026-12-08');
    });
  });

  describe('Remedy 3: Move INV-AR-LATE to day 10 + revolver draw', () => {
    it('results in day-21 closing of 3,176,000 fen', () => {
      const combinedInput: ForecastInput = {
        ...HARBOR_ANCHOR_INPUT,
        invoices: HARBOR_ANCHOR_INPUT.invoices.map((inv) =>
          inv.externalId === 'INV-AR-LATE'
            ? { ...inv, expectedSettlementOn: '2026-10-30' }
            : { ...inv },
        ),
        financing: [
          {
            id: 'FIN-REVOLVER-01',
            label: 'Revolver draw',
            flows: [
              { on: '2026-10-21', amountMinor: 1_200_000, kind: 'draw' },
              { on: '2026-10-21', amountMinor: 24_000, kind: 'fee' },
              { on: '2026-11-20', amountMinor: 1_218_000, kind: 'repayment' }, // day 31
            ],
          },
        ],
      };

      const points = runForecast(combinedInput);
      const day21 = points[21]!;
      expect(day21.date).toBe('2026-11-10');
      expect(day21.closingMinor).toBe(3_176_000);
    });
  });

  describe('Conservative variant', () => {
    it('shifts overdue INV-AR-LATE by 14 days to 2026-11-27 (day 38) and baseline min cash is <= baseline', () => {
      const consInput = conservative(HARBOR_ANCHOR_INPUT, 14);
      const lateInv = consInput.invoices.find((i) => i.externalId === 'INV-AR-LATE')!;
      expect(lateInv.expectedSettlementOn).toBe('2026-11-27');

      const consPoints = runForecast(consInput);
      const consSummary = summarize(consPoints, consInput.floorMinor);
      const basePoints = runForecast(HARBOR_ANCHOR_INPUT);
      const baseSummary = summarize(basePoints, HARBOR_ANCHOR_INPUT.floorMinor);

      expect(consSummary.minCashMinor).toBeLessThanOrEqual(baseSummary.minCashMinor);
    });
  });

  describe('Edge cases', () => {
    it('handles empty input cleanly', () => {
      const emptyInput: ForecastInput = {
        asOfDate: '2026-10-20',
        openingCashMinor: 500_000,
        floorMinor: 100_000,
        horizonDays: 91,
        invoices: [],
        commitments: [],
        financing: [],
        scheduledLedger: [],
      };

      const points = runForecast(emptyInput);
      expect(points).toHaveLength(91);
      expect(points[0]!.closingMinor).toBe(500_000);
      expect(points[90]!.closingMinor).toBe(500_000);

      const summary = summarize(points, emptyInput.floorMinor);
      expect(summary.minCashMinor).toBe(500_000);
      expect(summary.firstBelowFloorDate).toBeNull();
      expect(summary.firstNegativeDate).toBeNull();
      expect(summary.liquidityGapMinor).toBe(0);
    });

    it('ignores invoices with zero or negative outstanding', () => {
      const input: ForecastInput = {
        asOfDate: '2026-10-20',
        openingCashMinor: 100_000,
        floorMinor: 50_000,
        horizonDays: 91,
        invoices: [
          {
            externalId: 'INV-ZERO',
            direction: 'AR',
            outstandingMinor: 0,
            dueOn: '2026-10-25',
            expectedSettlementOn: '2026-10-25',
            counterpartyExternalId: 'CUST-001',
          },
        ],
        commitments: [],
        financing: [],
        scheduledLedger: [],
      };

      const points = runForecast(input);
      expect(points[5]!.receiptsMinor).toBe(0);
    });

    it('clamps monthly commitment on 31st to last day of shorter month', () => {
      const input: ForecastInput = {
        asOfDate: '2026-01-20',
        openingCashMinor: 100_000,
        floorMinor: 50_000,
        horizonDays: 60,
        invoices: [],
        commitments: [
          {
            id: 'COMM-31',
            label: 'Month-end fee',
            direction: 'outflow',
            amountMinor: 10_000,
            frequency: 'monthly',
            anchorOn: '2026-01-31',
          },
        ],
        financing: [],
        scheduledLedger: [],
      };

      const points = runForecast(input);
      // Jan 31 is day 11
      expect(points[11]!.paymentsMinor).toBe(10_000);
      // Feb 28 is day 39 (2026 is non-leap year: 31 - 20 = 11 days in Jan, + 28 days = day 39)
      const feb28Point = points.find((p) => p.date === '2026-02-28');
      expect(feb28Point).toBeDefined();
      expect(feb28Point!.paymentsMinor).toBe(10_000);
    });

    it('ignores financing flows outside the horizon', () => {
      const input: ForecastInput = {
        asOfDate: '2026-10-20',
        openingCashMinor: 100_000,
        floorMinor: 50_000,
        horizonDays: 91,
        invoices: [],
        commitments: [],
        financing: [
          {
            id: 'FIN-FAR',
            label: 'Far loan',
            flows: [{ on: '2030-01-01', amountMinor: 10_000_000, kind: 'draw' }],
          },
        ],
        scheduledLedger: [],
      };

      const points = runForecast(input);
      for (const p of points) {
        expect(p.financingMinor).toBe(0);
      }
    });

    it('places expected settlement dates in the past on day 1 (asOfDate + 1)', () => {
      const input: ForecastInput = {
        asOfDate: '2026-10-20',
        openingCashMinor: 100_000,
        floorMinor: 50_000,
        horizonDays: 91,
        invoices: [
          {
            externalId: 'INV-PAST',
            direction: 'AR',
            outstandingMinor: 50_000,
            dueOn: '2026-09-01',
            expectedSettlementOn: '2026-09-10', // past
            counterpartyExternalId: 'CUST-001',
          },
        ],
        commitments: [],
        financing: [],
        scheduledLedger: [],
      };

      const points = runForecast(input);
      expect(points[1]!.date).toBe('2026-10-21');
      expect(points[1]!.receiptsMinor).toBe(50_000);
    });
  });
});
