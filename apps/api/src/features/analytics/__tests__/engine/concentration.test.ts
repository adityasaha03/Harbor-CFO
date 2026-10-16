import { describe, it, expect } from 'vitest';
import { computeConcentration } from '../../engine/concentration';
import type { AnalyticsInvoiceItem } from '../../engine/types';

describe('computeConcentration Engine', () => {
  it('returns isApplicable false and empty customers when AR is zero', () => {
    const res = computeConcentration([]);
    expect(res.isApplicable).toBe(false);
    expect(res.totalOutstandingMinor).toBe(0);
    expect(res.customers).toHaveLength(0);
    expect(res.topCustomer).toBeNull();
    expect(res.topCustomerArMinor).toBe(0);
  });

  it('computes 100% concentration for a single customer', () => {
    const invoices: AnalyticsInvoiceItem[] = [
      {
        externalId: 'INV-1',
        direction: 'AR',
        counterpartyExternalId: 'CUST-SOLO',
        counterpartyName: 'Solo Buyer Co',
        totalMinor: 5_000_000,
        outstandingMinor: 5_000_000,
        dueOn: '2026-11-01',
        status: 'open',
      },
    ];

    const res = computeConcentration(invoices);
    expect(res.isApplicable).toBe(true);
    expect(res.totalOutstandingMinor).toBe(5_000_000);
    expect(res.customers).toHaveLength(1);
    expect(res.topCustomer).not.toBeNull();
    expect(res.topCustomer!.counterpartyExternalId).toBe('CUST-SOLO');
    expect(res.topCustomer!.counterpartyName).toBe('Solo Buyer Co');
    expect(res.topCustomer!.sharePct).toBe(100.0);
    expect(res.shareBps).toBe(10000);
    expect(res.isExceeded).toBe(true);
  });

  it('computes equal split (50.0% each) across two customers', () => {
    const invoices: AnalyticsInvoiceItem[] = [
      {
        externalId: 'INV-1',
        direction: 'AR',
        counterpartyExternalId: 'CUST-A',
        counterpartyName: 'Customer A',
        totalMinor: 3_000_000,
        outstandingMinor: 3_000_000,
        dueOn: '2026-11-01',
        status: 'open',
      },
      {
        externalId: 'INV-2',
        direction: 'AR',
        counterpartyExternalId: 'CUST-B',
        counterpartyName: 'Customer B',
        totalMinor: 3_000_000,
        outstandingMinor: 3_000_000,
        dueOn: '2026-11-05',
        status: 'open',
      },
    ];

    const res = computeConcentration(invoices);
    expect(res.isApplicable).toBe(true);
    expect(res.totalOutstandingMinor).toBe(6_000_000);
    expect(res.customers).toHaveLength(2);
    expect(res.customers[0]!.sharePct).toBe(50.0);
    expect(res.customers[1]!.sharePct).toBe(50.0);
  });

  it('aggregates multiple invoices per customer and excludes paid invoices', () => {
    const invoices: AnalyticsInvoiceItem[] = [
      {
        externalId: 'INV-1A',
        direction: 'AR',
        counterpartyExternalId: 'CUST-A',
        totalMinor: 2_000_000,
        outstandingMinor: 2_000_000,
        dueOn: '2026-11-01',
        status: 'open',
      },
      {
        externalId: 'INV-1B',
        direction: 'AR',
        counterpartyExternalId: 'CUST-A',
        totalMinor: 2_000_000,
        outstandingMinor: 2_000_000,
        dueOn: '2026-11-15',
        status: 'open',
      },
      {
        externalId: 'INV-PAID',
        direction: 'AR',
        counterpartyExternalId: 'CUST-A',
        totalMinor: 10_000_000,
        outstandingMinor: 0,
        dueOn: '2026-10-01',
        status: 'paid',
      },
      {
        externalId: 'INV-2',
        direction: 'AR',
        counterpartyExternalId: 'CUST-B',
        totalMinor: 2_000_000,
        outstandingMinor: 2_000_000,
        dueOn: '2026-11-10',
        status: 'open',
      },
    ];

    // Total AR = 4,000,000 (A) + 2,000,000 (B) = 6,000,000
    // CUST-A has 4,000,000 / 6,000,000 = 66.7%
    const res = computeConcentration(invoices);
    expect(res.totalOutstandingMinor).toBe(6_000_000);
    expect(res.topCustomer!.counterpartyExternalId).toBe('CUST-A');
    expect(res.topCustomer!.outstandingMinor).toBe(4_000_000);
    expect(res.topCustomer!.sharePct).toBe(66.7);
  });
});
