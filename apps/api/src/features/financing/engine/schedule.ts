import { applyBps, addDays } from '@harbor/contracts';
import type { FinancingOffer, FinancingSchedule, RepaymentScheduleItem } from '@harbor/contracts';

/**
 * Builds the exact repayment schedule, fees, interest, net proceeds, and total cost for an offer.
 * Uses integer minor units (fen) and half-up rounding at documented boundaries.
 * 
 * @param offer - The financing offer catalog terms
 * @param principalMinor - The principal amount in minor units (fen)
 * @param fundingOn - The DateOnly string when loan funds are disbursed
 */
export function buildSchedule(
  offer: FinancingOffer,
  principalMinor: number,
  fundingOn: string,
): FinancingSchedule {
  const upfrontFeeMinor = applyBps(principalMinor, offer.upfrontFeeBps);
  const interestMinor = applyBps(principalMinor, offer.flatInterestBps);
  const totalRepaymentMinor = principalMinor + interestMinor;
  const netProceedsMinor = principalMinor - upfrontFeeMinor;
  const totalCostMinor = upfrontFeeMinor + interestMinor;

  const count = offer.installments.count;
  const baseInstallment = Math.floor(totalRepaymentMinor / count);
  const remainder = totalRepaymentMinor - baseInstallment * count;

  const installments: RepaymentScheduleItem[] = [];

  for (let i = 1; i <= count; i++) {
    const isLast = i === count;
    const amountMinor = isLast ? baseInstallment + remainder : baseInstallment;

    const daysOffset =
      offer.installments.firstDueAfterFundingDays + (i - 1) * offer.installments.intervalDays;
    const dueOn = addDays(fundingOn, daysOffset);

    installments.push({
      installmentIndex: i,
      dueOn,
      amountMinor,
    });
  }

  return {
    principalMinor,
    fundingOn,
    upfrontFeeMinor,
    interestMinor,
    totalRepaymentMinor,
    netProceedsMinor,
    totalCostMinor,
    installments,
  };
}
