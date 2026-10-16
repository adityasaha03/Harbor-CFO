import type {
  AgingSchedule,
  AgingBucketItem,
  InvoiceDirection,
} from '@harbor/contracts';
import { diffDays } from '@harbor/contracts/common/dates';
import type { AnalyticsInvoiceItem } from './types';

/**
 * Computes Accounts Receivable (AR) or Accounts Payable (AP) aging schedule.
 *
 * Formula & Specification:
 * - Filter invoices by direction (AR or AP) with outstandingMinor > 0 and status != 'paid'.
 * - Days Overdue = diffDays(asOf, dueOn) = calendar days between dueOn and asOf.
 * - Bucketing rules:
 *     * notYetDue (Current): daysOverdue <= 0 (dueOn >= asOf)
 *     * overdue1to30: 1 <= daysOverdue <= 30
 *     * overdue31to60: 31 <= daysOverdue <= 60
 *     * overdue61plus: daysOverdue >= 61
 * - Amounts sum outstandingMinor; counts track the number of unpaid invoices.
 */
export function computeAging(
  invoices: AnalyticsInvoiceItem[],
  asOf: string,
  direction: InvoiceDirection,
): Required<AgingSchedule> {
  const notYetDue: AgingBucketItem = { amountMinor: 0, count: 0 };
  const overdue1to30: AgingBucketItem = { amountMinor: 0, count: 0 };
  const overdue31to60: AgingBucketItem = { amountMinor: 0, count: 0 };
  const overdue61plus: AgingBucketItem = { amountMinor: 0, count: 0 };

  let days61to90Minor = 0;
  let daysOver90Minor = 0;

  for (const inv of invoices) {
    if (inv.direction !== direction) continue;
    if (inv.status === 'paid' || inv.outstandingMinor <= 0) continue;

    const daysOverdue = diffDays(asOf, inv.dueOn);

    if (daysOverdue <= 0) {
      notYetDue.amountMinor += inv.outstandingMinor;
      notYetDue.count += 1;
    } else if (daysOverdue <= 30) {
      overdue1to30.amountMinor += inv.outstandingMinor;
      overdue1to30.count += 1;
    } else if (daysOverdue <= 60) {
      overdue31to60.amountMinor += inv.outstandingMinor;
      overdue31to60.count += 1;
    } else {
      overdue61plus.amountMinor += inv.outstandingMinor;
      overdue61plus.count += 1;

      if (daysOverdue <= 90) {
        days61to90Minor += inv.outstandingMinor;
      } else {
        daysOver90Minor += inv.outstandingMinor;
      }
    }
  }

  const totalAmount =
    notYetDue.amountMinor +
    overdue1to30.amountMinor +
    overdue31to60.amountMinor +
    overdue61plus.amountMinor;

  const totalCount =
    notYetDue.count +
    overdue1to30.count +
    overdue31to60.count +
    overdue61plus.count;

  const total: AgingBucketItem = {
    amountMinor: totalAmount,
    count: totalCount,
  };

  return {
    notYetDue,
    overdue1to30,
    overdue31to60,
    overdue61plus,
    total,
    currentMinor: notYetDue.amountMinor,
    days1to30Minor: overdue1to30.amountMinor,
    days31to60Minor: overdue31to60.amountMinor,
    days61to90Minor,
    daysOver90Minor,
    totalMinor: totalAmount,
  };
}
