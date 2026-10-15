import { type ForecastInput } from '@harbor/contracts';
import { addDays, diffDays } from '@harbor/contracts/common/dates';

/**
 * Produce a conservative forecast input variant.
 *
 * Shifts the expected settlement date of every overdue AR receivable (dueOn < asOfDate)
 * later by `extraDays` (default 14 days). AP invoices, commitments, and financing are untouched.
 *
 * @param input - The base forecast input (not mutated)
 * @param extraDays - Number of days to delay overdue AR (default 14)
 * @returns A new ForecastInput with shifted settlement dates for overdue receivables
 */
export function conservative(input: ForecastInput, extraDays = 14): ForecastInput {
  const { asOfDate, invoices } = input;

  const modifiedInvoices = invoices.map((inv) => {
    // Check if AR and overdue relative to asOfDate
    if (inv.direction === 'AR' && diffDays(inv.dueOn, asOfDate) < 0) {
      return {
        ...inv,
        expectedSettlementOn: addDays(inv.expectedSettlementOn, extraDays),
      };
    }
    return { ...inv };
  });

  return {
    ...input,
    invoices: modifiedInvoices,
    commitments: input.commitments.map((c) => ({ ...c })),
    financing: input.financing.map((f) => ({
      ...f,
      flows: f.flows.map((fl) => ({ ...fl })),
    })),
    scheduledLedger: input.scheduledLedger.map((s) => ({ ...s })),
  };
}

