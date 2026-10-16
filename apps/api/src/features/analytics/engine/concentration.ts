import type {
  CustomerConcentrationResult,
  CounterpartyConcentration,
} from '@harbor/contracts';
import type { AnalyticsInvoiceItem } from './types';

/**
 * Computes customer concentration across outstanding Accounts Receivable (AR).
 *
 * Formula & Specification:
 * - Filter invoices to AR with outstandingMinor > 0 and status != 'paid'.
 * - Group by counterpartyExternalId and sum outstandingMinor per customer.
 * - If total AR is 0: isApplicable is false; customers list is empty; topCustomer is null.
 * - If total AR > 0: isApplicable is true;
 *     * sharePct = (customerOutstanding / totalOutstanding) * 100 rounded to 1 decimal place.
 *     * shareBps = basis points (1% = 100 bps; 66.7% = 6670 bps).
 *     * topCustomer is the customer with highest outstandingMinor.
 */
export function computeConcentration(
  arInvoices: AnalyticsInvoiceItem[],
  thresholdBps = 4000,
): Required<CustomerConcentrationResult> {
  const customerMap = new Map<
    string,
    { name: string; outstandingMinor: number }
  >();

  let totalOutstandingMinor = 0;

  for (const inv of arInvoices) {
    if (inv.direction !== 'AR') continue;
    if (inv.status === 'paid' || inv.outstandingMinor <= 0) continue;

    totalOutstandingMinor += inv.outstandingMinor;
    const existing = customerMap.get(inv.counterpartyExternalId);
    if (existing) {
      existing.outstandingMinor += inv.outstandingMinor;
      if (!existing.name && inv.counterpartyName) {
        existing.name = inv.counterpartyName;
      }
    } else {
      customerMap.set(inv.counterpartyExternalId, {
        name: inv.counterpartyName || inv.counterpartyExternalId,
        outstandingMinor: inv.outstandingMinor,
      });
    }
  }

  if (totalOutstandingMinor === 0 || customerMap.size === 0) {
    return {
      totalOutstandingMinor: 0,
      isApplicable: false,
      customers: [],
      topCustomer: null,
      topCustomerExternalId: '',
      topCustomerName: '',
      topCustomerArMinor: 0,
      totalArMinor: 0,
      shareBps: 0,
      thresholdBps,
      isExceeded: false,
    };
  }

  const customers: CounterpartyConcentration[] = [];
  for (const [id, data] of customerMap.entries()) {
    const sharePct =
      Math.round((data.outstandingMinor / totalOutstandingMinor) * 1000) / 10;
    customers.push({
      counterpartyExternalId: id,
      counterpartyName: data.name,
      outstandingMinor: data.outstandingMinor,
      sharePct,
    });
  }

  // Sort descending by outstandingMinor
  customers.sort((a, b) => b.outstandingMinor - a.outstandingMinor);
  const top = customers[0]!;

  const shareBps = Math.round(
    (top.outstandingMinor / totalOutstandingMinor) * 10000,
  );
  const isExceeded = shareBps > thresholdBps;

  return {
    totalOutstandingMinor,
    isApplicable: true,
    customers,
    topCustomer: top,
    topCustomerExternalId: top.counterpartyExternalId,
    topCustomerName: top.counterpartyName,
    topCustomerArMinor: top.outstandingMinor,
    totalArMinor: totalOutstandingMinor,
    shareBps,
    thresholdBps,
    isExceeded,
  };
}
