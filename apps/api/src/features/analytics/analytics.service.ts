import type { ClientSession } from 'mongoose';
import type { CompleteAnalyticsSummary, HealthScoreResponse } from '@harbor/contracts';
import { tenantsRepository } from '../tenants';
import { ledgerService } from '../ledger';
import { LedgerEntryModel } from '../ledger/ledger.model';
import { invoicesRepository } from '../invoices';
import { ImportModel } from '../imports/imports.model';
import { forecastService } from '../forecast';
import {
  computeAging,
  computeConcentration,
  computeBurn,
  computeCollectionQuality,
  computeHealthScore,
  type AnalyticsInvoiceItem,
  type AnalyticsLedgerItem,
} from './engine';

function getTodayDateOnly(timezone = 'Asia/Shanghai'): string {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formatter.format(new Date());
}

export const analyticsService = {
  /**
   * Computes the deterministic analytics summary for a tenant.
   * Specification:
   * - asOf, currentCashMinor, floorMinor
   * - aging: { ar, ap } (with amounts, counts, and flat compatibility fields)
   * - concentration: customer concentration with sharePct, top customer
   * - burn: monthly burn over 90-day window, rough runway, reason if not burning/insufficient history
   * - collectionQuality: on-time payment rate of paid AR matched to ledger receipts
   * - dataCompleteness: counts, lastImportAt, warnings
   * - NO inferred revenue or profit from bank entries
   */
  async getSummary(
    tenantId: string,
    session?: ClientSession,
  ): Promise<CompleteAnalyticsSummary> {
    // 1. Settings & asOf
    let settings = await tenantsRepository.findByTenantId(tenantId, session);
    if (!settings) {
      settings = await tenantsRepository.upsertDefaults(tenantId, session);
    }

    const asOf =
      settings.forecastAsOfDate ||
      getTodayDateOnly(settings.businessTimezone || 'Asia/Shanghai');
    const floorMinor = settings.minimumCashMinor;

    // 2. Current Cash Balance as of asOf
    const currentCashMinor = await ledgerService.getCashAt(
      tenantId,
      asOf,
      session,
    );

    // 3. Load Invoices
    const rawInvoices = await invoicesRepository.list(tenantId, undefined, session);
    const invoiceItems: AnalyticsInvoiceItem[] = rawInvoices.map((inv) => ({
      externalId: inv.externalId,
      direction: inv.direction,
      counterpartyExternalId: inv.counterpartyExternalId,
      totalMinor: inv.totalMinor,
      outstandingMinor: inv.outstandingMinor,
      dueOn: inv.dueOn,
      status: inv.status,
    }));

    // 4. Load Ledger Entries
    const rawLedgerDocs = await LedgerEntryModel.find({ tenantId })
      .session(session ?? null)
      .lean();

    const ledgerItems: AnalyticsLedgerItem[] = rawLedgerDocs.map((doc) => ({
      externalId: doc.externalId,
      bookedOn: doc.bookedOn,
      amountMinor: doc.amountMinor,
      category: doc.category,
      invoiceExternalId: doc.invoiceExternalId,
    }));

    // 5. Load latest committed import metadata
    const latestImport = await ImportModel.findOne({
      tenantId,
      status: 'committed',
    })
      .sort({ committedAt: -1, createdAt: -1 })
      .session(session ?? null)
      .lean();

    const lastImportAt = latestImport?.committedAt
      ? latestImport.committedAt.toISOString()
      : latestImport?.createdAt
        ? latestImport.createdAt.toISOString()
        : null;

    // 6. Compute Engine Metrics
    const arAging = computeAging(invoiceItems, asOf, 'AR');
    const apAging = computeAging(invoiceItems, asOf, 'AP');
    const concentration = computeConcentration(invoiceItems);
    const burn = computeBurn(ledgerItems, asOf, currentCashMinor);
    const collectionQuality = computeCollectionQuality(invoiceItems, ledgerItems);

    // 7. Data completeness warnings
    const warnings: string[] = [];
    if (invoiceItems.length === 0) {
      warnings.push('No invoices on file.');
    }
    if (ledgerItems.length === 0) {
      warnings.push('No ledger entries on file.');
    }
    if (burn.reason === 'INSUFFICIENT_HISTORY') {
      warnings.push('Less than 60 days of transaction history available for burn calculation.');
    }
    if (collectionQuality.sampleCount === 0) {
      warnings.push('No verified paid invoices with matched bank receipts.');
    }

    const dataCompleteness = {
      lastImportAt,
      invoiceCount: invoiceItems.length,
      ledgerCount: ledgerItems.length,
      warnings,
    };

    return {
      asOf,
      currentCashMinor,
      floorMinor,
      aging: {
        ar: arAging,
        ap: apAging,
      },
      concentration,
      burn,
      collectionQuality,
      dataCompleteness,
      // Dashboard web compatibility aliases
      arAging,
      apAging,
      monthlyBurnMinor: burn.monthlyBurnMinor ?? 0,
      runwayDays:
        burn.roughRunwayMonths !== null
          ? Math.round(burn.roughRunwayMonths * 30)
          : null,
      lastImportAt,
    };
  },

  /**
   * Computes the cash health score (0-100) and top deduction reasons.
   */
  async getHealthScore(
    tenantId: string,
    session?: ClientSession,
  ): Promise<HealthScoreResponse> {
    const [summary, baseline, settings] = await Promise.all([
      this.getSummary(tenantId, session),
      forecastService.getBaseline(tenantId, session),
      tenantsRepository.findByTenantId(tenantId, session),
    ]);

    const totalArMinor = summary.arAging.totalMinor;
    const overdueArMinor =
      summary.arAging.days1to30Minor +
      summary.arAging.days31to60Minor +
      summary.arAging.days61to90Minor +
      summary.arAging.daysOver90Minor;

    return computeHealthScore({
      minCashMinor: baseline.run.summary.minCashMinor,
      floorMinor: summary.floorMinor,
      totalArMinor,
      overdueArMinor,
      topCustomerSharePct: summary.concentration.shareBps / 100,
      concentrationThresholdPct: settings?.concentrationThresholdPct ?? 40,
      lastImportAt: summary.dataCompleteness?.lastImportAt ?? null,
      asOfDate: summary.asOf,
      staleDataDays: settings?.staleDataDays ?? 14,
    });
  },
};
