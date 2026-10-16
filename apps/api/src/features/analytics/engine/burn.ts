import type { BurnResult } from '@harbor/contracts';
import { diffDays, addDays } from '@harbor/contracts/common/dates';
import type { AnalyticsLedgerItem } from './types';

/**
 * Computes monthly operating cash burn and rough runway.
 *
 * Formula & Specification:
 * - Excludes non-operating entries: loan_* categories (loan_draw, loan_fee, loan_repayment).
 * - Window: last up to 3 full months (90 days) prior to asOf (bookedOn <= asOf).
 * - History check: historyDays = diffDays(asOf, earliestOperatingEntryDate).
 *     * If historyDays < 60: returns monthlyBurnMinor: null with reason 'INSUFFICIENT_HISTORY'.
 * - Net operating movement: sum of operating cash flows in the window (inflow > 0, outflow < 0).
 *     * If netOperatingMovementMinor >= 0: no net burn; returns monthlyBurnMinor: null with reason 'NOT_BURNING'.
 *     * If netOperatingMovementMinor < 0:
 *         netOutflow = -netOperatingMovementMinor
 *         effectiveDays = Math.min(historyDays, 90)
 *         monthlyBurnMinor = Math.round((netOutflow / effectiveDays) * 30)
 *         roughRunwayMonths = currentCashMinor <= 0 ? 0 : Math.round((currentCashMinor / monthlyBurnMinor) * 10) / 10
 *         isRoughEstimate: true (never presented as primary liquidity signal)
 */
export function computeBurn(
  ledger: AnalyticsLedgerItem[],
  asOf: string,
  currentCashMinor: number,
): BurnResult {
  // 1. Filter operating entries on or before asOf
  const operatingEntries = ledger.filter((entry) => {
    if (entry.bookedOn > asOf) return false;
    if (entry.category.startsWith('loan_')) return false;
    return true;
  });

  if (operatingEntries.length === 0) {
    return {
      historyDays: 0,
      netOperatingMovementMinor: 0,
      monthlyBurnMinor: null,
      reason: 'INSUFFICIENT_HISTORY',
      roughRunwayMonths: null,
      isRoughEstimate: true,
    };
  }

  // 2. Compute history duration
  let earliestDate = asOf;
  for (const entry of operatingEntries) {
    if (entry.bookedOn < earliestDate) {
      earliestDate = entry.bookedOn;
    }
  }

  const historyDays = diffDays(asOf, earliestDate);

  // 3. Filter entries in the 90-day window
  const windowStart = addDays(asOf, -90);
  let netOperatingMovementMinor = 0;

  for (const entry of operatingEntries) {
    if (entry.bookedOn >= windowStart) {
      netOperatingMovementMinor += entry.amountMinor;
    }
  }

  // Check 60-day history requirement
  if (historyDays < 60) {
    return {
      historyDays,
      netOperatingMovementMinor,
      monthlyBurnMinor: null,
      reason: 'INSUFFICIENT_HISTORY',
      roughRunwayMonths: null,
      isRoughEstimate: true,
    };
  }

  // Check if burning cash
  if (netOperatingMovementMinor >= 0) {
    return {
      historyDays,
      netOperatingMovementMinor,
      monthlyBurnMinor: null,
      reason: 'NOT_BURNING',
      roughRunwayMonths: null,
      isRoughEstimate: true,
    };
  }

  // Net outflow is positive
  const netOutflow = -netOperatingMovementMinor;
  const effectiveDays = Math.max(Math.min(historyDays, 90), 1);
  const monthlyBurnMinor = Math.round((netOutflow / effectiveDays) * 30);

  let roughRunwayMonths: number | null = null;
  if (monthlyBurnMinor > 0) {
    if (currentCashMinor <= 0) {
      roughRunwayMonths = 0;
    } else {
      roughRunwayMonths =
        Math.round((currentCashMinor / monthlyBurnMinor) * 10) / 10;
    }
  }

  return {
    historyDays,
    netOperatingMovementMinor,
    monthlyBurnMinor,
    roughRunwayMonths,
    isRoughEstimate: true,
  };
}
