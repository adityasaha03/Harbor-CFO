import type { WeeklyBriefingResponse } from '@harbor/contracts';

/**
 * Pure Deterministic Weekly Briefing Engine (B19 P1)
 *
 * Produces structured briefing narrative from:
 *   - Current cash & 91-day forecast minimums
 *   - Liquidity floor & gap
 *   - Overdue receivables & aging
 *   - Open risk alerts
 *   - Health score
 *
 * Invariant: Never invents numbers; numbers are computed deterministically.
 */

export interface GenerateBriefingInput {
  tenantId: string;
  asOfDate: string;
  currentCashMinor: number;
  floorMinor: number;
  minCashMinor: number;
  minCashDate: string;
  liquidityGapMinor: number;
  totalArMinor: number;
  overdueArMinor: number;
  openAlerts: Array<{
    ruleId: string;
    severity: string;
    title: string;
    summary: string;
  }>;
  healthScore: number;
  topOverdueInvoice?: {
    externalId: string;
    amountMinor: number;
    expectedSettlementOn: string;
  } | null;
}

function formatCny(minor: number): string {
  const sign = minor < 0 ? '-' : '';
  const yuan = Math.abs(minor) / 100;
  return `${sign}¥${yuan.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

/**
 * Pure deterministic briefing synthesizer.
 */
export function generateBriefingNarrative(input: GenerateBriefingInput): WeeklyBriefingResponse {
  const criticalCount = input.openAlerts.filter((a) => a.severity === 'critical').length;
  const hasGap = input.liquidityGapMinor > 0;
  const turnsNegative = input.minCashMinor < 0;

  // 1. What Happened
  const overdueSection =
    input.overdueArMinor > 0
      ? `, of which ${formatCny(input.overdueArMinor)} is overdue past contractual payment terms`
      : '';
  const whatHappened =
    `Operating cash stands at ${formatCny(input.currentCashMinor)} as of ${input.asOfDate}. ` +
    `Outstanding customer receivables total ${formatCny(input.totalArMinor)}${overdueSection}.`;

  // 2. What Matters
  let outlook = '';
  if (turnsNegative) {
    outlook =
      `Projected cash turns negative, reaching a low of ${formatCny(input.minCashMinor)} on ${input.minCashDate}. ` +
      `This breaches the ${formatCny(input.floorMinor)} safety floor, leaving a ${formatCny(input.liquidityGapMinor)} liquidity shortfall.`;
  } else if (hasGap) {
    outlook =
      `Projected cash drops to ${formatCny(input.minCashMinor)} on ${input.minCashDate}, ` +
      `breaching the ${formatCny(input.floorMinor)} liquidity floor with a ${formatCny(input.liquidityGapMinor)} gap.`;
  } else {
    outlook =
      `Cash projections remain healthy, bottoming at ${formatCny(input.minCashMinor)} on ${input.minCashDate}, ` +
      `above the ${formatCny(input.floorMinor)} liquidity floor.`;
  }

  const alertNote =
    input.openAlerts.length > 0
      ? ` There are ${input.openAlerts.length} active risk alert(s) on file${criticalCount > 0 ? ` (${criticalCount} critical)` : ''}.`
      : ' No critical risk alerts are active.';
  const whatMatters = `${outlook}${alertNote}`;

  // 3. What To Do Next
  const actions: string[] = [];
  if (input.topOverdueInvoice && input.topOverdueInvoice.amountMinor > 0) {
    actions.push(
      `Expedite collection on invoice ${input.topOverdueInvoice.externalId} (${formatCny(input.topOverdueInvoice.amountMinor)}) to accelerate cash inflow prior to day-21 cash dip.`,
    );
  }

  if (hasGap) {
    actions.push(
      `Review eligible financing options (such as bridge loan or revolving credit) to secure up to ${formatCny(input.liquidityGapMinor)} in standby liquidity.`,
    );
  }

  if (actions.length === 0) {
    actions.push('Maintain regular transaction imports and reconcile recurring commitments.');
  }

  const whatToDoNext = actions.join(' ');

  // Summary Lead
  const summary =
    `Harbor Weekly Briefing (${input.asOfDate}): Operating cash is ${formatCny(input.currentCashMinor)}. ` +
    (hasGap
      ? `A projected dip to ${formatCny(input.minCashMinor)} on ${input.minCashDate} creates a ${formatCny(input.liquidityGapMinor)} liquidity shortfall. Proactive invoice collection and standby financing are recommended.`
      : 'Operating cash flows and projected balances remain within safety thresholds.');

  return {
    tenantId: input.tenantId,
    asOfDate: input.asOfDate,
    title: `Weekly Cash Briefing — ${input.asOfDate}`,
    summary,
    sections: {
      whatHappened,
      whatMatters,
      whatToDoNext,
    },
    metrics: {
      currentCashMinor: input.currentCashMinor,
      minCashMinor: input.minCashMinor,
      minCashDate: input.minCashDate,
      floorMinor: input.floorMinor,
      liquidityGapMinor: input.liquidityGapMinor,
      openAlertsCount: input.openAlerts.length,
      criticalAlertsCount: criticalCount,
      overdueArMinor: input.overdueArMinor,
      healthScore: input.healthScore,
    },
    generatedAt: new Date().toISOString(),
  };
}
