import { diffDays, type HealthScoreResponse } from '@harbor/contracts';

/**
 * Cash Health Score Engine (B19 P1)
 *
 * Formula:
 *   Score = 40 * liquidity + 25 * receivables + 20 * concentration + 15 * freshness
 *
 * Component Weights:
 *   - Liquidity:     40% (40 points max)
 *   - Receivables:   25% (25 points max)
 *   - Concentration: 20% (20 points max)
 *   - Freshness:     15% (15 points max)
 *   Total: 100 points
 *
 * Component Definitions (each in [0, 1]):
 *   - liquidity = clamp(minCash / floor, 0, 1) (1 if floor <= 0 and minCash >= 0)
 *   - receivables = 1 - (overdueAR / totalAR) (1 if no AR, clamped to [0, 1])
 *   - concentration = 1 - clamp((topSharePct - threshold) / (100 - threshold), 0, 1) when above threshold, else 1
 *   - freshness = 1 if last import is within staleDataDays of asOfDate, else 0.5 (0.5 if no import)
 *
 * Deductions & Reasons:
 *   Point deductions = Weight * (1 - Component).
 *   Top 3 point deductions are returned as short, actionable human sentences.
 */

export const HEALTH_SCORE_WEIGHTS = {
  liquidity: 40,
  receivables: 25,
  concentration: 20,
  freshness: 15,
} as const;

export interface HealthScoreInput {
  minCashMinor: number;
  floorMinor: number;
  totalArMinor: number;
  overdueArMinor: number;
  topCustomerSharePct: number; // 0 to 100
  concentrationThresholdPct?: number; // default 40
  lastImportAt: string | null;
  asOfDate: string; // YYYY-MM-DD
  staleDataDays?: number; // default 14
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function formatCny(minor: number): string {
  const yuan = minor / 100;
  return `¥${yuan.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

/**
 * Pure deterministic calculation of the Cash Health Score and component deductions.
 */
export function computeHealthScore(input: HealthScoreInput): HealthScoreResponse {
  const threshold = input.concentrationThresholdPct ?? 40;
  const staleDays = input.staleDataDays ?? 14;

  // 1. Liquidity component [0, 1]
  let liquidity: number;
  if (input.floorMinor <= 0) {
    liquidity = input.minCashMinor >= 0 ? 1 : 0;
  } else {
    liquidity = clamp(input.minCashMinor / input.floorMinor, 0, 1);
  }

  // 2. Receivables component [0, 1]
  let receivables: number;
  if (input.totalArMinor <= 0) {
    receivables = 1;
  } else {
    const overdueRatio = clamp(input.overdueArMinor / input.totalArMinor, 0, 1);
    receivables = 1 - overdueRatio;
  }

  // 3. Concentration component [0, 1]
  let concentration = 1;
  if (input.topCustomerSharePct > threshold) {
    const excess = input.topCustomerSharePct - threshold;
    const denominator = Math.max(100 - threshold, 1);
    concentration = 1 - clamp(excess / denominator, 0, 1);
  }

  // 4. Freshness component [0, 1]
  let freshness = 0.5;
  if (input.lastImportAt) {
    try {
      const importDateOnly = input.lastImportAt.slice(0, 10);
      const daysSince = diffDays(input.asOfDate, importDateOnly);
      if (daysSince >= 0 && daysSince <= staleDays) {
        freshness = 1.0;
      }
    } catch {
      freshness = 0.5;
    }
  }

  // Compute deductions (points lost out of each component's weight)
  const liquidityDeduction = Number((HEALTH_SCORE_WEIGHTS.liquidity * (1 - liquidity)).toFixed(2));
  const receivablesDeduction = Number(
    (HEALTH_SCORE_WEIGHTS.receivables * (1 - receivables)).toFixed(2),
  );
  const concentrationDeduction = Number(
    (HEALTH_SCORE_WEIGHTS.concentration * (1 - concentration)).toFixed(2),
  );
  const freshnessDeduction = Number((HEALTH_SCORE_WEIGHTS.freshness * (1 - freshness)).toFixed(2));

  // Total raw score and rounded integer
  const rawScore =
    HEALTH_SCORE_WEIGHTS.liquidity * liquidity +
    HEALTH_SCORE_WEIGHTS.receivables * receivables +
    HEALTH_SCORE_WEIGHTS.concentration * concentration +
    HEALTH_SCORE_WEIGHTS.freshness * freshness;

  const score = clamp(Math.round(rawScore), 0, 100);

  // Rating band
  let rating: 'Excellent' | 'Good' | 'Fair' | 'Poor';
  if (score >= 80) rating = 'Excellent';
  else if (score >= 60) rating = 'Good';
  else if (score >= 40) rating = 'Fair';
  else rating = 'Poor';

  // Build candidate deduction reasons
  const deductionItems: Array<{ deduction: number; reason: string }> = [];

  if (liquidityDeduction > 0) {
    if (input.minCashMinor < 0) {
      deductionItems.push({
        deduction: liquidityDeduction,
        reason: `Projected cash turns negative (${formatCny(input.minCashMinor)}), falling ${formatCny(input.floorMinor - input.minCashMinor)} short of the required floor.`,
      });
    } else {
      deductionItems.push({
        deduction: liquidityDeduction,
        reason: `Projected minimum cash of ${formatCny(input.minCashMinor)} breaches the ${formatCny(input.floorMinor)} liquidity floor.`,
      });
    }
  }

  if (receivablesDeduction > 0) {
    const overduePct = Math.round((input.overdueArMinor / Math.max(input.totalArMinor, 1)) * 100);
    deductionItems.push({
      deduction: receivablesDeduction,
      reason: `Overdue receivables of ${formatCny(input.overdueArMinor)} account for ${overduePct}% of total outstanding invoices.`,
    });
  }

  if (concentrationDeduction > 0) {
    deductionItems.push({
      deduction: concentrationDeduction,
      reason: `Single customer holds ${input.topCustomerSharePct.toFixed(1)}% of receivables, exceeding the ${threshold}% safety threshold.`,
    });
  }

  if (freshnessDeduction > 0) {
    deductionItems.push({
      deduction: freshnessDeduction,
      reason: `Data freshness penalty: ledger and invoices have not been updated within the ${staleDays}-day target window.`,
    });
  }

  // Sort by largest deduction first, pick top 3
  deductionItems.sort((a, b) => b.deduction - a.deduction);
  const topReasons = deductionItems.slice(0, 3).map((item) => item.reason);

  const reasons =
    topReasons.length > 0
      ? topReasons
      : ['All financial health indicators are within optimal operating targets.'];

  const summary = `Harbor Cash Health Score is ${score}/100 (${rating}). ${reasons[0]}`;

  return {
    score,
    rating,
    components: {
      liquidity: Number(liquidity.toFixed(3)),
      receivables: Number(receivables.toFixed(3)),
      concentration: Number(concentration.toFixed(3)),
      freshness: Number(freshness.toFixed(3)),
    },
    deductions: {
      liquidity: liquidityDeduction,
      receivables: receivablesDeduction,
      concentration: concentrationDeduction,
      freshness: freshnessDeduction,
    },
    reasons,
    summary,
  };
}
