import type { ClientSession } from 'mongoose';
import { diffDays } from '@harbor/contracts';
import type {
  ScenarioChange,
  ForecastInput,
  ForecastRunDto,
  TenantSettingsDto,
} from '@harbor/contracts';
import { ValidationError } from '../../core/http/app-error';
import { invoicesRepository } from '../invoices';
import { financingRepository } from '../financing/financing.repository';
import { evaluateEligibility, type EligibilityContext } from '../financing/engine';

/**
 * Validates a list of scenario changes against current tenant data, horizon limits, and financing gates.
 */
export async function validateScenarioChanges(
  tenantId: string,
  changes: readonly ScenarioChange[],
  baseInput: ForecastInput,
  baselineRun: ForecastRunDto,
  tenantSettings: TenantSettingsDto,
  session?: ClientSession,
): Promise<void> {
  const openArInvoices = baseInput.invoices.filter((i) => i.direction === 'AR');
  const openArMinor = openArInvoices.reduce((sum, i) => sum + i.outstandingMinor, 0);

  for (const change of changes) {
    switch (change.type) {
      case 'move_receipt': {
        const invoice = await invoicesRepository.findByExternalId(
          tenantId,
          change.invoiceExternalId,
          session,
        );
        if (!invoice) {
          throw new ValidationError(`Invoice ${change.invoiceExternalId} not found`);
        }
        if (invoice.direction !== 'AR') {
          throw new ValidationError(`Invoice ${change.invoiceExternalId} is not an AR invoice`);
        }
        if (invoice.status !== 'open') {
          throw new ValidationError(
            `Invoice ${change.invoiceExternalId} is already paid or closed`,
          );
        }

        const diff = diffDays(change.newExpectedSettlementOn, baseInput.asOfDate);
        if (diff < 1 || diff > baseInput.horizonDays) {
          throw new ValidationError(
            'New settlement date must be between day 1 and the end of the forecast horizon',
          );
        }
        break;
      }

      case 'defer_payment': {
        const invoice = await invoicesRepository.findByExternalId(
          tenantId,
          change.invoiceExternalId,
          session,
        );
        if (!invoice) {
          throw new ValidationError(`Invoice ${change.invoiceExternalId} not found`);
        }
        if (invoice.direction !== 'AP') {
          throw new ValidationError(`Invoice ${change.invoiceExternalId} is not an AP invoice`);
        }
        if (invoice.status !== 'open') {
          throw new ValidationError(
            `Invoice ${change.invoiceExternalId} is already paid or closed`,
          );
        }

        const diff = diffDays(change.newExpectedSettlementOn, baseInput.asOfDate);
        if (diff < 1 || diff > baseInput.horizonDays) {
          throw new ValidationError(
            'New payment date must be between day 1 and the end of the forecast horizon',
          );
        }

        if (
          !change.assumption ||
          change.assumption.trim().length === 0 ||
          change.assumption.length > 300
        ) {
          throw new ValidationError(
            'Assumption is required for deferring a payment (1 to 300 characters)',
          );
        }
        break;
      }

      case 'add_financing': {
        const offer = await financingRepository.findByCode(change.offerCode, 1, session);
        if (!offer) {
          throw new ValidationError(`Financing offer ${change.offerCode} not found in catalog`);
        }

        if (
          change.principalMinor < offer.minAmountMinor ||
          change.principalMinor > offer.maxAmountMinor
        ) {
          throw new ValidationError(
            `Principal ${change.principalMinor} is outside offer range [${offer.minAmountMinor}, ${offer.maxAmountMinor}]`,
          );
        }

        const breachDate =
          baselineRun.summary.firstBelowFloorDate ?? baselineRun.summary.firstNegativeDate ?? null;

        const ctx: EligibilityContext = {
          currency: tenantSettings.reportingCurrency || 'CNY',
          purpose: 'working_capital',
          desiredAmountMinor: change.principalMinor,
          gapMinor: baselineRun.summary.liquidityGapMinor,
          asOfDate: baseInput.asOfDate,
          breachDate,
          openArMinor,
          hasOpenArInvoice: openArInvoices.length > 0,
          profile: tenantSettings.profile,
        };

        const evaluated = evaluateEligibility(offer, ctx);
        if (evaluated.status !== 'eligible') {
          const reasonCodes = evaluated.reasons.map((r) => r.code).join(', ');
          throw new ValidationError(`Offer gate failed: ${reasonCodes || evaluated.status}`);
        }
        break;
      }

      case 'add_recurring': {
        if (change.amountMinor <= 0) {
          throw new ValidationError('Recurring amount must be positive');
        }
        break;
      }

      case 'delay_customer_receipts': {
        if (change.days <= 0) {
          throw new ValidationError('Delay days must be positive');
        }
        break;
      }
    }
  }
}
