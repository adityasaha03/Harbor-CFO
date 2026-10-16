import { diffDays } from '@harbor/contracts/common/dates';
import { ALERT_FINGERPRINTS, ALERT_RULES } from '../../alerts.constants';
import type { AlertEvaluationContext, CandidateAlert } from '../types';

/**
 * Evaluates stale data alert rule.
 * Triggered when last committed import is older than staleDataDays (info severity).
 */
export function evaluateStaleData(
  ctx: AlertEvaluationContext,
): CandidateAlert | null {
  if (!ctx.lastCommittedImportAt) {
    return null;
  }

  const importDateStr =
    typeof ctx.lastCommittedImportAt === 'string'
      ? ctx.lastCommittedImportAt.slice(0, 10)
      : ctx.lastCommittedImportAt.toISOString().slice(0, 10);

  const daysSinceImport = diffDays(ctx.asOfDate, importDateStr);

  if (daysSinceImport > ctx.settings.staleDataDays) {
    return {
      ruleId: ALERT_RULES.STALE_DATA,
      fingerprint: ALERT_FINGERPRINTS.STALE_DATA_IMPORTS,
      severity: 'info',
      title: 'Financial data is stale',
      summary: `Last committed import was ${daysSinceImport} days ago, exceeding the ${ctx.settings.staleDataDays} day freshness threshold.`,
      evidence: [
        {
          type: 'import',
          id: 'imports',
          label: `Last committed import on ${importDateStr}`,
        },
      ],
    };
  }

  return null;
}
