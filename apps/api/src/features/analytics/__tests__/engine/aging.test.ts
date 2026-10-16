import { describe, it, expect } from 'vitest';
import { computeAging } from '../../engine/aging';
import type { AnalyticsInvoiceItem } from '../../engine/types';

describe('computeAging Engine', () => {
  const asOf = '2026-10-20';

  it('correctly partitions invoices by exact day boundaries (0, 1, 30, 31, 60, 61 days overdue)', () => {
    const invoices: AnalyticsInvoiceItem[] = [
      // 0 days overdue: dueOn == asOf (notYetDue)
      {
        externalId: 'INV-BOUND-0',
        direction: 'AR',
        counterpartyExternalId: 'C1',
        totalMinor: 100_000,
        outstandingMinor: 100_000,
        dueOn: '2026-10-20',
        status: 'open',
      },
      // Future: dueOn > asOf (notYetDue)
      {
        externalId: 'INV-FUTURE',
        direction: 'AR',
        counterpartyExternalId: 'C1',
        totalMinor: 200_000,
        outstandingMinor: 200_000,
        dueOn: '2026-10-25',
        status: 'open',
      },
      // 1 day overdue: dueOn = 2026-10-19 (overdue1to30)
      {
        externalId: 'INV-BOUND-1',
        direction: 'AR',
        counterpartyExternalId: 'C2',
        totalMinor: 300_000,
        outstandingMinor: 300_000,
        dueOn: '2026-10-19',
        status: 'open',
      },
      // 30 days overdue: dueOn = 2026-09-20 (overdue1to30)
      {
        externalId: 'INV-BOUND-30',
        direction: 'AR',
        counterpartyExternalId: 'C2',
        totalMinor: 400_000,
        outstandingMinor: 400_000,
        dueOn: '2026-09-20',
        status: 'open',
      },
      // 31 days overdue: dueOn = 2026-09-19 (overdue31to60)
      {
        externalId: 'INV-BOUND-31',
        direction: 'AR',
        counterpartyExternalId: 'C3',
        totalMinor: 500_000,
        outstandingMinor: 500_000,
        dueOn: '2026-09-19',
        status: 'open',
      },
      // 60 days overdue: dueOn = 2026-08-21 (overdue31to60)
      {
        externalId: 'INV-BOUND-60',
        direction: 'AR',
        counterpartyExternalId: 'C3',
        totalMinor: 600_000,
        outstandingMinor: 600_000,
        dueOn: '2026-08-21',
        status: 'open',
      },
      // 61 days overdue: dueOn = 2026-08-20 (overdue61plus)
      {
        externalId: 'INV-BOUND-61',
        direction: 'AR',
        counterpartyExternalId: 'C4',
        totalMinor: 700_000,
        outstandingMinor: 700_000,
        dueOn: '2026-08-20',
        status: 'open',
      },
    ];

    const schedule = computeAging(invoices, asOf, 'AR');

    // notYetDue: INV-BOUND-0 (100_000) + INV-FUTURE (200_000) = 300_000, count 2
    expect(schedule.notYetDue.amountMinor).toBe(300_000);
    expect(schedule.notYetDue.count).toBe(2);
    expect(schedule.currentMinor).toBe(300_000);

    // overdue1to30: INV-BOUND-1 (300_000) + INV-BOUND-30 (400_000) = 700_000, count 2
    expect(schedule.overdue1to30.amountMinor).toBe(700_000);
    expect(schedule.overdue1to30.count).toBe(2);
    expect(schedule.days1to30Minor).toBe(700_000);

    // overdue31to60: INV-BOUND-31 (500_000) + INV-BOUND-60 (600_000) = 1_100_000, count 2
    expect(schedule.overdue31to60.amountMinor).toBe(1_100_000);
    expect(schedule.overdue31to60.count).toBe(2);
    expect(schedule.days31to60Minor).toBe(1_100_000);

    // overdue61plus: INV-BOUND-61 (700_000), count 1
    expect(schedule.overdue61plus.amountMinor).toBe(700_000);
    expect(schedule.overdue61plus.count).toBe(1);

    // Total
    expect(schedule.total.amountMinor).toBe(2_800_000);
    expect(schedule.total.count).toBe(7);
    expect(schedule.totalMinor).toBe(2_800_000);
  });

  it('excludes paid invoices and invoices with zero outstanding amount', () => {
    const invoices: AnalyticsInvoiceItem[] = [
      {
        externalId: 'INV-PAID',
        direction: 'AR',
        counterpartyExternalId: 'C1',
        totalMinor: 500_000,
        outstandingMinor: 0,
        dueOn: '2026-09-01',
        status: 'paid',
      },
      {
        externalId: 'INV-ZERO-OUTSTANDING',
        direction: 'AR',
        counterpartyExternalId: 'C2',
        totalMinor: 300_000,
        outstandingMinor: 0,
        dueOn: '2026-09-15',
        status: 'open',
      },
      {
        externalId: 'INV-VALID',
        direction: 'AR',
        counterpartyExternalId: 'C3',
        totalMinor: 250_000,
        outstandingMinor: 250_000,
        dueOn: '2026-10-15', // 5 days overdue
        status: 'open',
      },
    ];

    const schedule = computeAging(invoices, asOf, 'AR');
    expect(schedule.total.amountMinor).toBe(250_000);
    expect(schedule.total.count).toBe(1);
    expect(schedule.overdue1to30.amountMinor).toBe(250_000);
    expect(schedule.overdue1to30.count).toBe(1);
  });

  it('computes AR and AP schedules separately without cross-contamination', () => {
    const mixedInvoices: AnalyticsInvoiceItem[] = [
      {
        externalId: 'AR-1',
        direction: 'AR',
        counterpartyExternalId: 'CUST-1',
        totalMinor: 1_000_000,
        outstandingMinor: 1_000_000,
        dueOn: '2026-10-25',
        status: 'open',
      },
      {
        externalId: 'AP-1',
        direction: 'AP',
        counterpartyExternalId: 'SUPP-1',
        totalMinor: 4_000_000,
        outstandingMinor: 4_000_000,
        dueOn: '2026-10-10', // 10 days overdue
        status: 'open',
      },
    ];

    const arSchedule = computeAging(mixedInvoices, asOf, 'AR');
    const apSchedule = computeAging(mixedInvoices, asOf, 'AP');

    expect(arSchedule.total.amountMinor).toBe(1_000_000);
    expect(arSchedule.notYetDue.amountMinor).toBe(1_000_000);
    expect(arSchedule.overdue1to30.amountMinor).toBe(0);

    expect(apSchedule.total.amountMinor).toBe(4_000_000);
    expect(apSchedule.overdue1to30.amountMinor).toBe(4_000_000);
    expect(apSchedule.notYetDue.amountMinor).toBe(0);
  });
});
