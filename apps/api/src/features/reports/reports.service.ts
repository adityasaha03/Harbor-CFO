import type { ClientSession } from 'mongoose';
import { tenantsRepository } from '../tenants';
import { ledgerService } from '../ledger';
import { LedgerEntryModel } from '../ledger/ledger.model';
import { forecastService } from '../forecast';
import { buildCashSummaryCsv, type CashSummaryReportData } from './reports.csv';
import { buildCashSummaryPdf } from './reports.pdf';

export const reportsService = {
  /**
   * Compiles the data for monthly cash summary.
   */
  async getCashSummaryData(
    tenantId: string,
    monthParam?: string,
    session?: ClientSession,
  ): Promise<CashSummaryReportData> {
    const settings = await tenantsRepository.findByTenantId(tenantId, session);
    const asOf = settings?.forecastAsOfDate || '2026-10-20';
    const month = monthParam || asOf.slice(0, 7);
    const floorMinor = settings?.minimumCashMinor ?? 3_000_000;
    const currency = settings?.reportingCurrency ?? 'CNY';

    const monthStart = `${month}-01`;
    const monthEnd = `${month}-31`;

    // 1. Opening Cash Balance at month start
    const openingCashMinor = await ledgerService.getCashAt(tenantId, monthStart, session);

    // 2. Fetch Ledger Entries in the month
    const ledgerDocs = await LedgerEntryModel.find({
      tenantId,
      bookedOn: { $gte: monthStart, $lte: monthEnd },
    })
      .sort({ bookedOn: 1, createdAt: 1 })
      .session(session ?? null)
      .lean();

    let totalReceiptsMinor = 0;
    let totalPaymentsMinor = 0;

    const entries = ledgerDocs.map((doc) => {
      if (doc.amountMinor > 0) {
        totalReceiptsMinor += doc.amountMinor;
      } else {
        totalPaymentsMinor += Math.abs(doc.amountMinor);
      }

      return {
        bookedOn: doc.bookedOn,
        externalId: doc.externalId,
        category: doc.category,
        description: doc.description || '',
        amountMinor: doc.amountMinor,
      };
    });

    const netCashFlowMinor = totalReceiptsMinor - totalPaymentsMinor;
    const closingCashMinor = openingCashMinor + (totalReceiptsMinor - totalPaymentsMinor);

    // 3. Forecast baseline metrics
    const baseline = await forecastService.getBaseline(tenantId, session);
    const minCashMinor = baseline.run.summary.minCashMinor;
    const liquidityGapMinor = Math.max(floorMinor - minCashMinor, 0);

    return {
      tenantId,
      month,
      currency,
      generatedAt: new Date().toISOString(),
      openingCashMinor,
      totalReceiptsMinor,
      totalPaymentsMinor,
      netCashFlowMinor,
      closingCashMinor,
      minCashMinor,
      floorMinor,
      liquidityGapMinor,
      entries,
    };
  },

  /**
   * Generates CSV export with spreadsheet formula injection protection.
   */
  async exportCsv(
    tenantId: string,
    monthParam?: string,
    session?: ClientSession,
  ): Promise<{ csv: string; filename: string }> {
    const data = await this.getCashSummaryData(tenantId, monthParam, session);
    const csv = buildCashSummaryCsv(data);
    return {
      csv,
      filename: `cash-summary-${data.month}.csv`,
    };
  },

  /**
   * Generates server-side PDF document.
   */
  async exportPdf(
    tenantId: string,
    monthParam?: string,
    session?: ClientSession,
  ): Promise<{ pdf: Buffer; filename: string }> {
    const data = await this.getCashSummaryData(tenantId, monthParam, session);
    const pdf = buildCashSummaryPdf(data);
    return {
      pdf,
      filename: `cash-summary-${data.month}.pdf`,
    };
  },
};
