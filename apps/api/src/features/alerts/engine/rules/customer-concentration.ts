import { ALERT_FINGERPRINTS, ALERT_RULES } from '../../alerts.constants';
import type { AlertEvaluationContext, CandidateAlert } from '../types';
import { formatYuan } from './format';

/**
 * Evaluates customer concentration alert rule.
 * Triggered when a single customer represents > concentrationThresholdPct of outstanding AR.
 * Not applicable when total outstanding AR is zero.
 */
export function evaluateCustomerConcentration(
  ctx: AlertEvaluationContext,
): CandidateAlert[] {
  let totalOutstandingMinor = 0;
  const customerMap = new Map<
    string,
    { name: string; outstandingMinor: number }
  >();

  for (const inv of ctx.invoices) {
    if (inv.direction !== 'AR') continue;
    if (inv.status === 'paid' || inv.outstandingMinor <= 0) continue;

    totalOutstandingMinor += inv.outstandingMinor;
    const existing = customerMap.get(inv.counterpartyExternalId);
    if (existing) {
      existing.outstandingMinor += inv.outstandingMinor;
      if (!existing.name && inv.counterpartyName) {
        existing.name = inv.counterpartyName;
      }
    } else {
      customerMap.set(inv.counterpartyExternalId, {
        name: inv.counterpartyName || inv.counterpartyExternalId,
        outstandingMinor: inv.outstandingMinor,
      });
    }
  }

  if (totalOutstandingMinor === 0 || customerMap.size === 0) {
    return [];
  }

  const alerts: CandidateAlert[] = [];
  const thresholdPct = ctx.settings.concentrationThresholdPct;

  for (const [counterpartyId, data] of customerMap.entries()) {
    const shareBps = Math.round(
      (data.outstandingMinor / totalOutstandingMinor) * 10000,
    );
    const thresholdBps = thresholdPct * 100;

    if (shareBps > thresholdBps) {
      const sharePct =
        Math.round((data.outstandingMinor / totalOutstandingMinor) * 1000) / 10;

      alerts.push({
        ruleId: ALERT_RULES.CUSTOMER_CONCENTRATION,
        fingerprint: ALERT_FINGERPRINTS.customerConcentration(counterpartyId),
        severity: 'medium',
        title: `High customer concentration: ${data.name}`,
        summary: `${data.name} represents ${sharePct.toFixed(1)}% (${formatYuan(data.outstandingMinor)} of ${formatYuan(totalOutstandingMinor)}) of outstanding receivables, exceeding the ${thresholdPct}% threshold.`,
        evidence: [
          {
            type: 'counterparty',
            id: counterpartyId,
            label: data.name,
            amountMinor: data.outstandingMinor,
          },
        ],
      });
    }
  }

  return alerts;
}
