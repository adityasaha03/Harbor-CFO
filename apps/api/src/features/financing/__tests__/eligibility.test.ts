import { describe, it, expect } from 'vitest';
import { evaluateEligibility } from '../engine/eligibility';
import { suggestAmount, getEffectiveCap } from '../engine/suggest-amount';
import { SYNTHETIC_OFFERS } from '../catalog/offers';
import type { EligibilityContext } from '../engine/types';

describe('B12 Engine: Eligibility & Suggested Amount Gates', () => {
  const bridgeOffer = SYNTHETIC_OFFERS.find((o) => o.code === 'bridge-term')!;
  const revolverOffer = SYNTHETIC_OFFERS.find((o) => o.code === 'revolver-flex')!;
  const invoiceOffer = SYNTHETIC_OFFERS.find((o) => o.code === 'invoice-advance')!;
  const equipmentOffer = SYNTHETIC_OFFERS.find((o) => o.code === 'equipment-lease')!;
  const merchantOffer = SYNTHETIC_OFFERS.find((o) => o.code === 'merchant-advance')!;
  const termLoanSlowOffer = SYNTHETIC_OFFERS.find((o) => o.code === 'term-loan-slow')!;

  const baseContext: EligibilityContext = {
    currency: 'CNY',
    purpose: 'working_capital',
    gapMinor: 5_000_000,
    asOfDate: '2026-10-20',
    breachDate: '2026-10-29', // 9 days away
    openArMinor: 6_000_000,
    hasOpenArInvoice: true,
    profile: {
      yearsInOperation: 3,
      monthlyRevenueMinor: 10_000_000,
      monthlyCardSalesMinor: 2_000_000,
    },
  };

  it('suggests 6,000,000 fen for bridge-term on a 5,000,000 gap', () => {
    // 5,000,000 / (1 - 0.02) = 5,102,040.8 -> ceil to 10k CNY (1,000,000 fen) -> 6,000,000 fen
    const suggested = suggestAmount(bridgeOffer, 5_000_000, 6_000_000);
    expect(suggested).toBe(6_000_000);
  });

  it('evaluates bridge-term as eligible on anchor tenant context', () => {
    const result = evaluateEligibility(bridgeOffer, baseContext);
    expect(result.status).toBe('eligible');
    expect(result.reasons).toHaveLength(0);
    expect(result.suggestedPrincipalMinor).toBe(6_000_000);
    expect(result.schedule).toBeDefined();
    expect(result.schedule!.principalMinor).toBe(6_000_000);
  });

  it('excludes equipment-lease when purpose is working_capital', () => {
    const result = evaluateEligibility(equipmentOffer, baseContext);
    expect(result.status).toBe('ineligible');
    expect(result.reasons.some((r) => r.code === 'PURPOSE_NOT_SUPPORTED')).toBe(true);
  });

  it('returns cannot_assess for merchant-advance when monthlyCardSalesMinor is missing', () => {
    const ctxWithoutCardSales: EligibilityContext = {
      ...baseContext,
      profile: {
        yearsInOperation: 3,
        monthlyRevenueMinor: 10_000_000,
        // monthlyCardSalesMinor missing
      },
    };
    const result = evaluateEligibility(merchantOffer, ctxWithoutCardSales);
    expect(result.status).toBe('cannot_assess');
    expect(result.missingFields).toContain('monthlyCardSalesMinor');
    expect(result.reasons.some((r) => r.code === 'MISSING_ATTRIBUTE:monthlyCardSalesMinor')).toBe(true);
  });

  it('excludes term-loan-slow with FUNDS_TOO_LATE when funding delay exceeds days to breach', () => {
    // term-loan-slow has fundingDelayDays = 30. Days to breach is 9 (2026-10-20 to 2026-10-29).
    const result = evaluateEligibility(termLoanSlowOffer, baseContext);
    expect(result.status).toBe('ineligible');
    expect(result.reasons.some((r) => r.code === 'FUNDS_TOO_LATE')).toBe(true);
  });

  it('blocks invoice-advance with INVOICE_EVIDENCE_REQUIRED when open AR invoice is missing', () => {
    const ctxNoAr: EligibilityContext = {
      ...baseContext,
      hasOpenArInvoice: false,
      openArMinor: 0,
    };
    const result = evaluateEligibility(invoiceOffer, ctxNoAr);
    expect(result.status).toBe('ineligible');
    expect(result.reasons.some((r) => r.code === 'INVOICE_EVIDENCE_REQUIRED')).toBe(true);
  });

  it('enforces 80% AR cap for invoice-advance', () => {
    // Open AR: 6,000,000 fen -> 80% = 4,800,000 fen
    const cap = getEffectiveCap(invoiceOffer, 6_000_000);
    expect(cap).toBe(4_800_000);

    const suggested = suggestAmount(invoiceOffer, 10_000_000, 6_000_000);
    expect(suggested).toBe(4_800_000);
  });

  it('fails CURRENCY_UNSUPPORTED for non-CNY requests', () => {
    const ctxUsd: EligibilityContext = {
      ...baseContext,
      currency: 'USD',
    };
    const result = evaluateEligibility(bridgeOffer, ctxUsd);
    expect(result.status).toBe('ineligible');
    expect(result.reasons.some((r) => r.code === 'CURRENCY_UNSUPPORTED')).toBe(true);
  });

  it('enforces minYearsInOperation on revolver-flex', () => {
    const ctxTenureFail: EligibilityContext = {
      ...baseContext,
      profile: {
        yearsInOperation: 0,
      },
    };
    const result = evaluateEligibility(revolverOffer, ctxTenureFail);
    expect(result.status).toBe('ineligible');
    expect(result.reasons.some((r) => r.code === 'MIN_YEARS_NOT_MET')).toBe(true);
  });
});
