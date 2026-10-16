import { diffDays } from '@harbor/contracts/common/dates';
import { ALERT_FINGERPRINTS, ALERT_RULES } from '../../alerts.constants';
import type {
  AlertEvaluationContext,
  AlertInvoiceItem,
  CandidateAlert,
} from '../types';
import { formatYuan } from './format';

/**
 * Evaluates overdue receivables alert rule per counterparty.
 * High severity if overdue by 30+ days or amount >= minimum floor; otherwise medium.
 */
export function evaluateOverdueReceivables(
  ctx: AlertEvaluationContext,
): CandidateAlert[] {
  const alerts: CandidateAlert[] = [];
  const customerMap = new Map<
    string,
    {
      name: string;
      invoices: AlertInvoiceItem[];
      overdueInvoices: AlertInvoiceItem[];
      maxDaysOverdue: number;
      totalOverdueMinor: number;
    }
  >();

  for (const inv of ctx.invoices) {
    if (inv.direction !== 'AR') continue;
    if (inv.status === 'paid' || inv.outstandingMinor <= 0) continue;

    const daysOverdue = diffDays(ctx.asOfDate, inv.dueOn);
    const existing = customerMap.get(inv.counterpartyExternalId);
    const isOverdue = daysOverdue >= ctx.settings.overdueAlertDays;

    if (existing) {
      existing.invoices.push(inv);
      if (isOverdue) {
        existing.overdueInvoices.push(inv);
        existing.totalOverdueMinor += inv.outstandingMinor;
        if (daysOverdue > existing.maxDaysOverdue) {
          existing.maxDaysOverdue = daysOverdue;
        }
      }
      if (!existing.name && inv.counterpartyName) {
        existing.name = inv.counterpartyName;
      }
    } else {
      customerMap.set(inv.counterpartyExternalId, {
        name: inv.counterpartyName || inv.counterpartyExternalId,
        invoices: [inv],
        overdueInvoices: isOverdue ? [inv] : [],
        maxDaysOverdue: isOverdue ? daysOverdue : 0,
        totalOverdueMinor: isOverdue ? inv.outstandingMinor : 0,
      });
    }
  }

  for (const [counterpartyId, data] of customerMap.entries()) {
    if (data.overdueInvoices.length === 0) continue;

    const isHighSeverity =
      data.maxDaysOverdue >= 30 ||
      (ctx.settings.minimumCashMinor > 0 &&
        data.totalOverdueMinor >= ctx.settings.minimumCashMinor);

    const severity = isHighSeverity ? 'high' : 'medium';
    const evidence: CandidateAlert['evidence'] = data.overdueInvoices.map(
      (inv) => ({
        type: 'invoice',
        id: inv.id,
        label: inv.invoiceNumber || inv.id,
        amountMinor: inv.outstandingMinor,
      }),
    );

    alerts.push({
      ruleId: ALERT_RULES.OVERDUE_RECEIVABLE,
      fingerprint: ALERT_FINGERPRINTS.overdueReceivable(counterpartyId),
      severity,
      title: `Overdue receivables from ${data.name}`,
      summary: `${data.name} has ${formatYuan(data.totalOverdueMinor)} in overdue receivables (${data.maxDaysOverdue} days past due, policy threshold: ${ctx.settings.overdueAlertDays} days).`,
      evidence,
    });
  }

  return alerts;
}
