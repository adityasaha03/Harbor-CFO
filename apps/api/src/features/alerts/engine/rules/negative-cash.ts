import { ALERT_FINGERPRINTS, ALERT_RULES } from '../../alerts.constants';
import type { AlertEvaluationContext, CandidateAlert } from '../types';
import { formatYuan } from './format';

/**
 * Evaluates negative cash alert rule.
 * Triggered when projected cash dips below zero (critical severity).
 */
export function evaluateNegativeCash(
  ctx: AlertEvaluationContext,
): CandidateAlert | null {
  const summary = ctx.forecastSummary;
  if (!summary || !summary.firstNegativeDate) {
    return null;
  }

  const negDate = summary.firstNegativeDate;
  const point = summary.points?.find((p) => p.date === negDate);

  let outflowsSummary = '';
  const evidence: CandidateAlert['evidence'] = [
    {
      type: 'forecast',
      id: negDate,
      label: `Projected negative cash balance on ${negDate}`,
      amountMinor: summary.minCashMinor,
    },
  ];

  if (point && point.sources.length > 0) {
    const outflows = point.sources
      .filter((s) => s.amountMinor < 0)
      .sort((a, b) => a.amountMinor - b.amountMinor);

    if (outflows.length > 0) {
      const topOutflows = outflows.slice(0, 3);
      const labels = topOutflows
        .map((s) => `${s.label} (${formatYuan(s.amountMinor)})`)
        .join(', ');
      outflowsSummary = ` Largest outflows on that day: ${labels}.`;

      for (const s of topOutflows) {
        evidence.push({
          type: s.type,
          id: s.id,
          label: s.label,
          amountMinor: s.amountMinor,
        });
      }
    }
  }

  return {
    ruleId: ALERT_RULES.NEGATIVE_CASH,
    fingerprint: ALERT_FINGERPRINTS.NEGATIVE_CASH_HORIZON,
    severity: 'critical',
    title: `Negative cash projected on ${negDate}`,
    summary: `Projected cash balance dips below zero on ${negDate}.${outflowsSummary}`,
    evidence,
  };
}
