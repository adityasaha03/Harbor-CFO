import { describe, it, expect } from 'vitest';
import { computeCollectionQuality } from '../../engine/collection-quality';
import type { AnalyticsInvoiceItem, AnalyticsLedgerItem } from '../../engine/types';

describe('computeCollectionQuality Engine', () => {
  it('correctly categorizes on-time vs late receipts for paid AR invoices', () => {
    const invoices: AnalyticsInvoiceItem[] = [
      // Paid on-time (due 2026-10-15, paid 2026-10-14)
      {
        externalId: 'INV-PAID-ONTIME',
        direction: 'AR',
        counterpartyExternalId: 'C1',
        totalMinor: 1_000_000,
        outstandingMinor: 0,
        dueOn: '2026-10-15',
        status: 'paid',
      },
      // Paid late (due 2026-10-10, paid 2026-10-18)
      {
        externalId: 'INV-PAID-LATE',
        direction: 'AR',
        counterpartyExternalId: 'C2',
        totalMinor: 2_000_000,
        outstandingMinor: 0,
        dueOn: '2026-10-10',
        status: 'paid',
      },
    ];

    const ledger: AnalyticsLedgerItem[] = [
      {
        externalId: 'REC-1',
        bookedOn: '2026-10-14',
        amountMinor: 1_000_000,
        category: 'customer_receipt',
        invoiceExternalId: 'INV-PAID-ONTIME',
      },
      {
        externalId: 'REC-2',
        bookedOn: '2026-10-18',
        amountMinor: 2_000_000,
        category: 'customer_receipt',
        invoiceExternalId: 'INV-PAID-LATE',
      },
    ];

    const res = computeCollectionQuality(invoices, ledger);
    expect(res.sampleCount).toBe(2);
    expect(res.excludedCount).toBe(0);
    expect(res.onTimeCount).toBe(1);
    expect(res.lateCount).toBe(1);
    expect(res.onTimeSharePct).toBe(50.0);
  });

  it('excludes paid invoices that lack a linked ledger receipt', () => {
    const invoices: AnalyticsInvoiceItem[] = [
      {
        externalId: 'INV-LINKED',
        direction: 'AR',
        counterpartyExternalId: 'C1',
        totalMinor: 1_000_000,
        outstandingMinor: 0,
        dueOn: '2026-10-15',
        status: 'paid',
      },
      {
        externalId: 'INV-UNLINKED',
        direction: 'AR',
        counterpartyExternalId: 'C2',
        totalMinor: 2_000_000,
        outstandingMinor: 0,
        dueOn: '2026-10-10',
        status: 'paid',
      },
    ];

    const ledger: AnalyticsLedgerItem[] = [
      {
        externalId: 'REC-1',
        bookedOn: '2026-10-15', // on-time
        amountMinor: 1_000_000,
        category: 'customer_receipt',
        invoiceExternalId: 'INV-LINKED',
      },
    ];

    const res = computeCollectionQuality(invoices, ledger);
    expect(res.sampleCount).toBe(1);
    expect(res.excludedCount).toBe(1);
    expect(res.onTimeCount).toBe(1);
    expect(res.onTimeSharePct).toBe(100.0);
  });

  it('ignores open, partially paid, or AP invoices', () => {
    const invoices: AnalyticsInvoiceItem[] = [
      {
        externalId: 'INV-OPEN',
        direction: 'AR',
        counterpartyExternalId: 'C1',
        totalMinor: 1_000_000,
        outstandingMinor: 1_000_000,
        dueOn: '2026-10-15',
        status: 'open',
      },
      {
        externalId: 'INV-AP-PAID',
        direction: 'AP',
        counterpartyExternalId: 'S1',
        totalMinor: 2_000_000,
        outstandingMinor: 0,
        dueOn: '2026-10-10',
        status: 'paid',
      },
    ];

    const ledger: AnalyticsLedgerItem[] = [
      {
        externalId: 'REC-1',
        bookedOn: '2026-10-10',
        amountMinor: 1_000_000,
        category: 'customer_receipt',
        invoiceExternalId: 'INV-OPEN',
      },
    ];

    const res = computeCollectionQuality(invoices, ledger);
    expect(res.sampleCount).toBe(0);
    expect(res.excludedCount).toBe(0);
    expect(res.onTimeSharePct).toBe(0.0);
  });
});
