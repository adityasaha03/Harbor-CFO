import { diffDays, addDays } from '@harbor/contracts';
import type { FinancingOffer, EligibilityReason, EligibilityStatus } from '@harbor/contracts';
import { buildSchedule } from './schedule';
import { suggestAmount, getEffectiveCap } from './suggest-amount';
import type { EligibilityContext, EvaluatedOffer } from './types';

/**
 * Evaluates hard eligibility gates for an offer against the tenant's current profile and forecast context.
 * 
 * Reasons preserved:
 * - CURRENCY_UNSUPPORTED
 * - AMOUNT_OUT_OF_RANGE
 * - PURPOSE_NOT_SUPPORTED
 * - MISSING_ATTRIBUTE:<field>
 * - INVOICE_EVIDENCE_REQUIRED
 * - MIN_YEARS_NOT_MET
 * - FUNDS_TOO_LATE
 */
export function evaluateEligibility(
  offer: FinancingOffer,
  ctx: EligibilityContext,
): EvaluatedOffer {
  const reasons: EligibilityReason[] = [];
  const missingFields: string[] = [];

  // 1. Currency Gate
  if (ctx.currency !== 'CNY' || offer.currency !== 'CNY') {
    reasons.push({
      code: 'CURRENCY_UNSUPPORTED',
      explanation: 'Financing offers are currently denominated and available in CNY only.',
    });
  }

  // 2. Purpose Gate
  if (!offer.eligiblePurposes.includes(ctx.purpose)) {
    reasons.push({
      code: 'PURPOSE_NOT_SUPPORTED',
      explanation: `Offer supports [${offer.eligiblePurposes.join(', ')}] but requested purpose is ${ctx.purpose}.`,
    });
  }

  // 3. Required Profile Attributes Check (e.g. monthlyCardSalesMinor)
  for (const field of offer.requiredProfileFields) {
    const val = ctx.profile ? (ctx.profile as Record<string, unknown>)[field] : undefined;
    if (val === undefined || val === null) {
      missingFields.push(field);
      reasons.push({
        code: `MISSING_ATTRIBUTE:${field}`,
        explanation: `Business profile field "${field}" is required to assess eligibility for this offer.`,
      });
    }
  }

  // 4. Minimum Years in Operation
  if (offer.minYearsInOperation !== undefined && offer.minYearsInOperation > 0) {
    const years = ctx.profile?.yearsInOperation;
    if (years === undefined || years === null) {
      if (!missingFields.includes('yearsInOperation')) {
        missingFields.push('yearsInOperation');
        reasons.push({
          code: 'MISSING_ATTRIBUTE:yearsInOperation',
          explanation: `Business tenure is required to verify the ${offer.minYearsInOperation}-year minimum threshold.`,
        });
      }
    } else if (years < offer.minYearsInOperation) {
      reasons.push({
        code: 'MIN_YEARS_NOT_MET',
        explanation: `Requires at least ${offer.minYearsInOperation} years in operation (current: ${years}).`,
      });
    }
  }

  // 5. Invoice Evidence Requirement
  if (offer.requiresInvoiceEvidence && !ctx.hasOpenArInvoice) {
    reasons.push({
      code: 'INVOICE_EVIDENCE_REQUIRED',
      explanation: 'Receivables advance requires at least one open, verified accounts receivable invoice.',
    });
  }

  // 6. Timing Gate: funds must arrive before the earliest breach date
  if (ctx.breachDate) {
    const daysUntilBreach = diffDays(ctx.breachDate, ctx.asOfDate);
    if (offer.fundingDelayDays >= daysUntilBreach) {
      reasons.push({
        code: 'FUNDS_TOO_LATE',
        explanation: `Funding delay (${offer.fundingDelayDays} days) arrives after or on the breach date (${daysUntilBreach} days away).`,
      });
    }
  }

  // 7. Suggested Principal & Range / Cap Gate
  const suggestedPrincipalMinor = suggestAmount(
    offer,
    ctx.gapMinor,
    ctx.openArMinor,
    ctx.desiredAmountMinor,
  );
  const effectiveCap = getEffectiveCap(offer, ctx.openArMinor);

  if (suggestedPrincipalMinor < offer.minAmountMinor || suggestedPrincipalMinor > effectiveCap) {
    reasons.push({
      code: 'AMOUNT_OUT_OF_RANGE',
      explanation: `Amount ${suggestedPrincipalMinor} falls outside allowable range [${offer.minAmountMinor}, ${effectiveCap}].`,
    });
  }

  // Determine overall status
  let status: EligibilityStatus = 'eligible';
  if (reasons.length > 0) {
    if (missingFields.length > 0 && reasons.every((r) => r.code.startsWith('MISSING_ATTRIBUTE:'))) {
      status = 'cannot_assess';
    } else {
      status = 'ineligible';
    }
  }

  // If eligible, build the schedule
  let schedule;
  if (status === 'eligible') {
    const fundingOn = addDays(ctx.asOfDate, offer.fundingDelayDays);
    schedule = buildSchedule(offer, suggestedPrincipalMinor, fundingOn);
  }

  return {
    offer,
    status,
    reasons,
    missingFields,
    suggestedPrincipalMinor,
    schedule,
  };
}
