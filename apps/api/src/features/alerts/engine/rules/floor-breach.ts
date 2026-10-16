import { ALERT_FINGERPRINTS, ALERT_RULES } from '../../alerts.constants';
import type { AlertEvaluationContext, CandidateAlert } from '../types';
import { formatYuan } from './format';

/**
 * Evaluates minimum cash floor breach alert rule.
 * Triggered when projected balance drops below tenant policy floor (high severity).
 */
export function evaluateFloorBreach(
  ctx: AlertEvaluationContext,
): CandidateAlert | null {
  const summary = ctx.forecastSummary;
  if (!summary || !summary.firstBelowFloorDate) {
    return null;
  }

  const breachDate = summary.firstBelowFloorDate;
  const gapMinor = summary.liquidityGapMinor;
  const floorMinor = ctx.settings.minimumCashMinor;

  return {
    ruleId: ALERT_RULES.FLOOR_BREACH,
    fingerprint: ALERT_FINGERPRINTS.FLOOR_BREACH_HORIZON,
    severity: 'high',
    title: `Cash floor breach projected on ${breachDate}`,
    summary: `Cash balance falls below the minimum policy floor of ${formatYuan(floorMinor)} on ${breachDate}. Liquidity gap to restore floor is ${formatYuan(gapMinor)}.`,
    evidence: [
      {
        type: 'forecast',
        id: breachDate,
        label: `Floor breach on ${breachDate}`,
        amountMinor: gapMinor,
      },
    ],
  };
}
