import { type ForecastInput } from '@harbor/contracts';
import { addDays, diffDays } from '@harbor/contracts/common/dates';
import { type DatedFlow } from './types';
import { expandCommitment } from './expand-commitments';

/**
 * Build all dated flows from the forecast input.
 *
 * Converts invoices, commitments, financing schedules and scheduled ledger entries
 * into a flat array of DatedFlow objects positioned within the forecast horizon.
 *
 * Rules:
 * - Invoice flows: only invoices with outstandingMinor > 0. Date = max(expectedSettlementOn, asOfDate + 1).
 *   AR is a receipt (positive), AP is a payment (negative).
 * - Commitment flows: expanded via expandCommitment().
 * - Financing flows: draw is positive, fee and repayment are negative. Only within horizon.
 * - Scheduled ledger entries: applied on their dates if within horizon.
 *
 * @param input - The complete forecast input
 * @returns Array of all flows sorted by day index
 */
export function buildFlows(input: ForecastInput): DatedFlow[] {
  const { asOfDate, horizonDays } = input;
  const flows: DatedFlow[] = [];
  const day1 = addDays(asOfDate, 1);

  // --- Invoice flows ---
  for (const inv of input.invoices) {
    if (inv.outstandingMinor <= 0) continue;

    // Date = max(expectedSettlementOn, asOfDate + 1 day)
    const effectiveDate = diffDays(inv.expectedSettlementOn, day1) >= 0
      ? inv.expectedSettlementOn
      : day1;

    const dayIndex = diffDays(effectiveDate, asOfDate);
    if (dayIndex < 1 || dayIndex >= horizonDays) continue;

    const isReceipt = inv.direction === 'AR';
    const signedAmount = isReceipt ? inv.outstandingMinor : -inv.outstandingMinor;

    flows.push({
      dayIndex,
      date: effectiveDate,
      amountMinor: signedAmount,
      category: isReceipt ? 'receipt' : 'payment',
      source: {
        type: 'invoice',
        id: inv.externalId,
        label: `${inv.direction} ${inv.externalId} (${inv.counterpartyExternalId})`,
        amountMinor: signedAmount,
      },
    });
  }

  // --- Commitment flows ---
  for (const commitment of input.commitments) {
    const commitmentFlows = expandCommitment(commitment, asOfDate, horizonDays);
    flows.push(...commitmentFlows);
  }

  // --- Financing flows ---
  for (const fin of input.financing) {
    for (const flow of fin.flows) {
      const dayIndex = diffDays(flow.on, asOfDate);
      if (dayIndex < 1 || dayIndex >= horizonDays) continue;

      let category: DatedFlow['category'];
      let signedAmount: number;

      switch (flow.kind) {
        case 'draw':
          category = 'financing';
          signedAmount = flow.amountMinor;
          break;
        case 'fee':
          category = 'fee';
          signedAmount = -flow.amountMinor;
          break;
        case 'repayment':
          category = 'repayment';
          signedAmount = -flow.amountMinor;
          break;
      }

      flows.push({
        dayIndex,
        date: flow.on,
        amountMinor: signedAmount,
        category,
        source: {
          type: 'financing',
          id: fin.id,
          label: `${fin.label} (${flow.kind})`,
          amountMinor: signedAmount,
        },
      });
    }
  }

  // --- Scheduled ledger entries ---
  for (const entry of input.scheduledLedger) {
    const dayIndex = diffDays(entry.on, asOfDate);
    if (dayIndex < 1 || dayIndex >= horizonDays) continue;

    flows.push({
      dayIndex,
      date: entry.on,
      amountMinor: entry.amountMinor,
      category: entry.amountMinor >= 0 ? 'receipt' : 'payment',
      source: {
        type: 'ledger',
        id: entry.id,
        label: entry.label,
        amountMinor: entry.amountMinor,
      },
    });
  }

  // Sort by day index for deterministic processing
  flows.sort((a, b) => a.dayIndex - b.dayIndex);

  return flows;
}

