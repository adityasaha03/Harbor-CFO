import type { ClientSession } from 'mongoose';
import type { WeeklyBriefingResponse } from '@harbor/contracts';
import { tenantsRepository } from '../tenants';
import { forecastService } from '../forecast';
import { analyticsService } from '../analytics';
import { alertsRepository } from '../alerts';
import { invoicesRepository } from '../invoices';
import { generateBriefingNarrative } from './briefings.engine';

export const briefingsService = {
  /**
   * Generates the deterministic weekly briefing for a tenant.
   */
  async getLatestBriefing(
    tenantId: string,
    session?: ClientSession,
  ): Promise<WeeklyBriefingResponse> {
    const [settings, baseline, summary, healthScore, openAlerts, arInvoices] =
      await Promise.all([
        tenantsRepository.findByTenantId(tenantId, session),
        forecastService.getBaseline(tenantId, session),
        analyticsService.getSummary(tenantId, session),
        analyticsService.getHealthScore(tenantId, session),
        alertsRepository.list(tenantId, { status: 'open' }, session),
        invoicesRepository.list(tenantId, { direction: 'AR' }, session),
      ]);

    const floorMinor = settings?.minimumCashMinor ?? 3_000_000;
    const asOfDate = summary.asOf;
    const currentCashMinor = summary.currentCashMinor;
    const minCashMinor = baseline.run.summary.minCashMinor;
    const minCashDate = baseline.run.summary.minCashDate;
    const liquidityGapMinor = Math.max(floorMinor - minCashMinor, 0);

    const totalArMinor = summary.arAging.totalMinor;
    const overdueArMinor =
      summary.arAging.days1to30Minor +
      summary.arAging.days31to60Minor +
      summary.arAging.days61to90Minor +
      summary.arAging.daysOver90Minor;

    // Identify top overdue invoice
    const overdueInvoices = arInvoices
      .filter((inv) => inv.status !== 'paid' && inv.dueOn < asOfDate && inv.outstandingMinor > 0)
      .sort((a, b) => b.outstandingMinor - a.outstandingMinor);

    const topOverdueInvoice = overdueInvoices[0]
      ? {
          externalId: overdueInvoices[0].externalId,
          amountMinor: overdueInvoices[0].outstandingMinor,
          expectedSettlementOn: overdueInvoices[0].expectedSettlementOn,
        }
      : null;

    return generateBriefingNarrative({
      tenantId,
      asOfDate,
      currentCashMinor,
      floorMinor,
      minCashMinor,
      minCashDate,
      liquidityGapMinor,
      totalArMinor,
      overdueArMinor,
      openAlerts: openAlerts.map((a) => ({
        ruleId: a.ruleId,
        severity: a.severity,
        title: a.title,
        summary: a.summary,
      })),
      healthScore: healthScore.score,
      topOverdueInvoice,
    });
  },
};
