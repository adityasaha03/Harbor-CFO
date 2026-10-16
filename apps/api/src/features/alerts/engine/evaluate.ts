import {
  evaluateCustomerConcentration,
  evaluateFloorBreach,
  evaluateNegativeCash,
  evaluateOverdueReceivables,
  evaluateStaleData,
} from './rules';
import type { AlertEvaluationContext, CandidateAlert } from './types';

/**
 * Pure evaluation function that executes all alert rules against a given context.
 * Returns an array of CandidateAlert objects with deterministic fingerprints.
 */
export function evaluateAlerts(
  ctx: AlertEvaluationContext,
): CandidateAlert[] {
  const alerts: CandidateAlert[] = [];

  const negCash = evaluateNegativeCash(ctx);
  if (negCash) {
    alerts.push(negCash);
  }

  const floorBreach = evaluateFloorBreach(ctx);
  if (floorBreach) {
    alerts.push(floorBreach);
  }

  const overdue = evaluateOverdueReceivables(ctx);
  alerts.push(...overdue);

  const concentration = evaluateCustomerConcentration(ctx);
  alerts.push(...concentration);

  const stale = evaluateStaleData(ctx);
  if (stale) {
    alerts.push(stale);
  }

  return alerts;
}
