import type { CollectionQualityResult } from '@harbor/contracts';
import type { AnalyticsInvoiceItem, AnalyticsLedgerItem } from './types';

/**
 * Computes Accounts Receivable (AR) collection quality metrics.
 *
 * Formula & Specification:
 * - Scope: AR invoices with status === 'paid'.
 * - Linkage: A paid invoice is considered verified if a corresponding ledger entry
 *   exists with entry.invoiceExternalId === invoice.externalId and (entry.category === 'customer_receipt' or entry.amountMinor > 0).
 * - Exclusions: Paid AR invoices without any linked ledger receipt are excluded
 *   from the sample and counted in excludedCount.
 * - On-time evaluation:
 *     * An invoice is on-time if the linked receipt entry.bookedOn <= invoice.dueOn.
 *     * Otherwise, it is late (entry.bookedOn > invoice.dueOn).
 * - onTimeSharePct = (onTimeCount / sampleCount) * 100 rounded to 1 decimal place.
 */
export function computeCollectionQuality(
  arInvoices: AnalyticsInvoiceItem[],
  ledgerEntries: AnalyticsLedgerItem[],
): CollectionQualityResult {
  // Map invoiceExternalId -> latest receipt bookedOn
  const receiptMap = new Map<string, string>();

  for (const entry of ledgerEntries) {
    if (!entry.invoiceExternalId) continue;
    if (entry.category !== 'customer_receipt' && entry.amountMinor <= 0) continue;

    const existing = receiptMap.get(entry.invoiceExternalId);
    if (!existing || entry.bookedOn > existing) {
      receiptMap.set(entry.invoiceExternalId, entry.bookedOn);
    }
  }

  let sampleCount = 0;
  let excludedCount = 0;
  let onTimeCount = 0;
  let lateCount = 0;

  for (const inv of arInvoices) {
    if (inv.direction !== 'AR' || inv.status !== 'paid') {
      continue;
    }

    const receiptBookedOn = receiptMap.get(inv.externalId);
    if (!receiptBookedOn) {
      excludedCount += 1;
      continue;
    }

    sampleCount += 1;
    if (receiptBookedOn <= inv.dueOn) {
      onTimeCount += 1;
    } else {
      lateCount += 1;
    }
  }

  const onTimeSharePct =
    sampleCount > 0
      ? Math.round((onTimeCount / sampleCount) * 1000) / 10
      : 0.0;

  return {
    onTimeSharePct,
    sampleCount,
    excludedCount,
    onTimeCount,
    lateCount,
  };
}
