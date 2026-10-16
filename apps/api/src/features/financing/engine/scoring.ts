import { diffDays } from '@harbor/contracts';
import type {
  FinancingSchedule,
  FinancingImpact,
  FinancingScoringBreakdown,
  RankedFinancingOffer,
} from '@harbor/contracts';
import type { EvaluatedOffer } from './types';

/**
 * =============================================================================
 * SCORING ENGINE NORMALIZATION RULES
 * =============================================================================
 * 
 * Formula:
 *   score = 0.35 * gapCoverage + 0.25 * timeliness + 0.25 * repaymentResilience + 0.15 * costEfficiency
 * 
 * Weights & Normalizers:
 * 1. gapCoverage (weight: 0.35):
 *    - min(netProceeds / requiredGap, 1.0)
 *    - Evaluates how much of the liquidity gap is covered after deducting upfront fees.
 * 
 * 2. timeliness (weight: 0.25):
 *    - If funding arrives >= 7 days before breach: 1.0
 *    - Falls linearly to 0.0 on the breach date: clamp((daysUntilBreach - fundingDelay) / 7, 0, 1)
 *    - If no breach exists: 1.0
 * 
 * 3. repaymentResilience (weight: 0.25):
 *    - Share of 91 horizon days where projected closing cash >= liquidity floor after financing.
 *    - clamp(daysAboveFloor / horizonDays, 0, 1)
 * 
 * 4. costEfficiency (weight: 0.15):
 *    - Evaluated across the eligible candidate set:
 *    - 1.0 - (totalCost - minCost) / (maxCost - minCost)
 *    - If minCost === maxCost (or single offer): 1.0
 * 
 * Safety Invariants:
 * - Scores never override failed gates.
 * - anyNegativeCash is preserved as an explicit warning, never swallowed into ranking.
 * =============================================================================
 */

export interface CandidateEvaluation {
  evaluated: EvaluatedOffer;
  impact: FinancingImpact;
  daysAtOrAboveFloor: number;
  horizonDays: number;
}

export function computeCandidateScores(
  candidates: CandidateEvaluation[],
  requiredGapMinor: number,
  asOfDate: string,
  breachDate: string | null,
): RankedFinancingOffer[] {
  if (candidates.length === 0) return [];

  // 1. Calculate min and max total cost across the eligible set
  const costs = candidates.map((c) => c.evaluated.schedule!.totalCostMinor);
  const minCost = Math.min(...costs);
  const maxCost = Math.max(...costs);

  // 2. Score each candidate
  const ranked: RankedFinancingOffer[] = candidates.map((c) => {
    const schedule: FinancingSchedule = c.evaluated.schedule!;
    const offer = c.evaluated.offer;

    // --- Component 1: Gap Coverage ---
    const rawCoverage = requiredGapMinor <= 0 ? 1 : schedule.netProceedsMinor / requiredGapMinor;
    const gapCoverage = Math.max(0, Math.min(1, rawCoverage));

    // --- Component 2: Timeliness ---
    let timeliness = 1.0;
    if (breachDate) {
      const daysUntilBreach = diffDays(breachDate, asOfDate);
      const daysBuffer = daysUntilBreach - offer.fundingDelayDays;
      timeliness = Math.max(0, Math.min(1, daysBuffer / 7));
    }

    // --- Component 3: Repayment Resilience ---
    const rawResilience = c.horizonDays <= 0 ? 0 : c.daysAtOrAboveFloor / c.horizonDays;
    const repaymentResilience = Math.max(0, Math.min(1, rawResilience));

    // --- Component 4: Cost Efficiency ---
    let costEfficiency = 1.0;
    if (maxCost > minCost) {
      costEfficiency = 1.0 - (schedule.totalCostMinor - minCost) / (maxCost - minCost);
      costEfficiency = Math.max(0, Math.min(1, costEfficiency));
    }

    // Weighted composite score
    const totalScore = Number(
      (
        0.35 * gapCoverage +
        0.25 * timeliness +
        0.25 * repaymentResilience +
        0.15 * costEfficiency
      ).toFixed(4),
    );

    const warnings: string[] = [];
    if (c.impact.anyNegativeCash) {
      warnings.push('Projected closing balance dips below zero during loan term.');
    }
    if (gapCoverage < 1.0) {
      warnings.push(`Net proceeds cover ${(gapCoverage * 100).toFixed(1)}% of required liquidity gap.`);
    }

    const scoringBreakdown: FinancingScoringBreakdown = {
      gapCoverage: Number(gapCoverage.toFixed(4)),
      timeliness: Number(timeliness.toFixed(4)),
      repaymentResilience: Number(repaymentResilience.toFixed(4)),
      costEfficiency: Number(costEfficiency.toFixed(4)),
      totalScore,
    };

    return {
      offer,
      suggestedPrincipalMinor: schedule.principalMinor,
      schedule,
      impact: c.impact,
      score: totalScore,
      scoringBreakdown,
      warnings,
    };
  });

  // Sort descending by score. If tie, sort by lower total cost, then lower funding delay
  ranked.sort((a, b) => {
    if (b.score !== a.score) {
      return b.score - a.score;
    }
    if (a.schedule.totalCostMinor !== b.schedule.totalCostMinor) {
      return a.schedule.totalCostMinor - b.schedule.totalCostMinor;
    }
    return a.offer.fundingDelayDays - b.offer.fundingDelayDays;
  });

  return ranked;
}
