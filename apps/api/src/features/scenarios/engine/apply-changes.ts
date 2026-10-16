import { addDays } from '@harbor/contracts';
import type {
  ForecastInput,
  ForecastFinancing,
  ForecastCommitment,
  ScenarioChange,
  FinancingOffer,
} from '@harbor/contracts';
import { SYNTHETIC_OFFERS_CATALOG } from '../../financing/catalog/offers';
import { buildSchedule } from '../../financing/engine/schedule';

/**
 * Pure, immutable application of scenario changes onto a ForecastInput.
 * Moving a receipt replaces its expected date, ensuring zero duplicate inflows.
 */
export function applyChanges(
  baseInput: ForecastInput,
  changes: readonly ScenarioChange[],
  offers: readonly FinancingOffer[] = SYNTHETIC_OFFERS_CATALOG,
): ForecastInput {
  let invoices = [...baseInput.invoices];
  let commitments = [...baseInput.commitments];
  let financing = [...baseInput.financing];
  const scheduledLedger = [...baseInput.scheduledLedger];

  for (const change of changes) {
    switch (change.type) {
      case 'move_receipt': {
        invoices = invoices.map((inv) =>
          inv.externalId === change.invoiceExternalId
            ? { ...inv, expectedSettlementOn: change.newExpectedSettlementOn }
            : inv,
        );
        break;
      }

      case 'add_financing': {
        const offer = offers.find((o) => o.code === change.offerCode);
        if (offer) {
          const fundingOn = change.fundingOn ?? addDays(baseInput.asOfDate, offer.fundingDelayDays);
          const schedule = buildSchedule(offer, change.principalMinor, fundingOn);

          const simFinancing: ForecastFinancing = {
            id: `hypothetical-${offer.code}-${fundingOn}`,
            label: offer.name,
            flows: [
              {
                on: schedule.fundingOn,
                amountMinor: schedule.principalMinor,
                kind: 'draw',
              },
              ...(schedule.upfrontFeeMinor > 0
                ? [
                    {
                      on: schedule.fundingOn,
                      amountMinor: schedule.upfrontFeeMinor,
                      kind: 'fee' as const,
                    },
                  ]
                : []),
              ...schedule.installments.map((inst) => ({
                on: inst.dueOn,
                amountMinor: inst.amountMinor,
                kind: 'repayment' as const,
              })),
            ],
          };

          financing = [...financing, simFinancing];
        }
        break;
      }

      case 'add_recurring': {
        const newCommitment: ForecastCommitment = {
          id: `recurring-${change.label.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${change.startOn}`,
          label: change.label,
          direction: change.direction,
          amountMinor: change.amountMinor,
          frequency: change.frequency,
          anchorOn: change.startOn,
        };
        commitments = [...commitments, newCommitment];
        break;
      }

      case 'defer_payment': {
        invoices = invoices.map((inv) =>
          inv.externalId === change.invoiceExternalId
            ? { ...inv, expectedSettlementOn: change.newExpectedSettlementOn }
            : inv,
        );
        break;
      }

      case 'delay_customer_receipts': {
        invoices = invoices.map((inv) =>
          inv.counterpartyExternalId === change.counterpartyExternalId && inv.direction === 'AR'
            ? {
                ...inv,
                expectedSettlementOn: addDays(inv.expectedSettlementOn, change.days),
              }
            : inv,
        );
        break;
      }
    }
  }

  return {
    ...baseInput,
    invoices,
    commitments,
    financing,
    scheduledLedger,
  };
}
