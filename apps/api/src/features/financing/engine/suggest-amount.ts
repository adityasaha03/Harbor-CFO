import type { FinancingOffer } from '@harbor/contracts';

const STEP_SIZE_MINOR = 1_000_000; // 10,000 CNY (1,000,000 fen)

/**
 * Calculates effective upper cap considering dynamic limits (e.g. 80% of outstanding AR).
 */
export function getEffectiveCap(offer: FinancingOffer, openArMinor: number): number {
  if (offer.dynamicCap === 'ar_advance_80pct') {
    const dynamicCap = Math.floor(openArMinor * 0.8);
    return Math.min(offer.maxAmountMinor, dynamicCap);
  }
  return offer.maxAmountMinor;
}

/**
 * Suggests loan principal amount required to cover the liquidity gap after upfront fees,
 * rounded up to nearest 10,000 CNY (1,000,000 fen) and clamped between offer limits.
 * 
 * Formula: clamp(ceilTo(gap / (1 - feeRate), 1,000,000 fen), min, cap)
 */
export function suggestAmount(
  offer: FinancingOffer,
  gapMinor: number,
  openArMinor: number,
  desiredAmountMinor?: number,
): number {
  const cap = getEffectiveCap(offer, openArMinor);

  if (desiredAmountMinor && desiredAmountMinor > 0) {
    return Math.max(offer.minAmountMinor, Math.min(cap, desiredAmountMinor));
  }

  const feeRate = offer.upfrontFeeBps / 10000;
  const netRequired = feeRate >= 1 ? gapMinor : gapMinor / (1 - feeRate);

  const rounded = Math.ceil(netRequired / STEP_SIZE_MINOR) * STEP_SIZE_MINOR;
  return Math.max(offer.minAmountMinor, Math.min(cap, rounded));
}
