import { escapeSpreadsheetCell } from '../imports';

export interface CashSummaryReportData {
  tenantId: string;
  month: string; // YYYY-MM
  currency: string;
  generatedAt: string;
  openingCashMinor: number;
  totalReceiptsMinor: number;
  totalPaymentsMinor: number;
  netCashFlowMinor: number;
  closingCashMinor: number;
  minCashMinor: number;
  floorMinor: number;
  liquidityGapMinor: number;
  entries: {
    bookedOn: string;
    externalId: string;
    category: string;
    description: string;
    amountMinor: number;
  }[];
}

function formatAmount(minor: number): string {
  return (minor / 100).toFixed(2);
}

/**
 * Builds formula-safe CSV string for monthly cash summary.
 * Every text cell is escaped to prevent CSV spreadsheet formula injection (=, +, -, @, tab, cr).
 */
export function buildCashSummaryCsv(data: CashSummaryReportData): string {
  const lines: string[] = [];

  // Metadata Header
  lines.push(`"HarborCFO Monthly Cash Summary Report"`);
  lines.push(`"Tenant ID",${escapeSpreadsheetCell(data.tenantId)}`);
  lines.push(`"Reporting Month",${escapeSpreadsheetCell(data.month)}`);
  lines.push(`"Currency",${escapeSpreadsheetCell(data.currency)}`);
  lines.push(`"Generated At",${escapeSpreadsheetCell(data.generatedAt)}`);
  lines.push('');

  // Key Totals Table
  lines.push('"METRIC","AMOUNT_CNY","AMOUNT_MINOR_FEN"');
  lines.push(`"Opening Cash Balance",${formatAmount(data.openingCashMinor)},${data.openingCashMinor}`);
  lines.push(`"Total Inflows (Receipts)",${formatAmount(data.totalReceiptsMinor)},${data.totalReceiptsMinor}`);
  lines.push(`"Total Outflows (Payments)",${formatAmount(data.totalPaymentsMinor)},${data.totalPaymentsMinor}`);
  lines.push(`"Net Cash Movement",${formatAmount(data.netCashFlowMinor)},${data.netCashFlowMinor}`);
  lines.push(`"Closing Cash Balance",${formatAmount(data.closingCashMinor)},${data.closingCashMinor}`);
  lines.push(`"Projected 91-Day Minimum Cash",${formatAmount(data.minCashMinor)},${data.minCashMinor}`);
  lines.push(`"Liquidity Floor Target",${formatAmount(data.floorMinor)},${data.floorMinor}`);
  lines.push(`"Liquidity Gap",${formatAmount(data.liquidityGapMinor)},${data.liquidityGapMinor}`);
  lines.push('');

  // Transactions Details Table
  lines.push('"BOOKED_ON","EXTERNAL_ID","CATEGORY","DESCRIPTION","AMOUNT_CNY","AMOUNT_MINOR_FEN"');
  for (const entry of data.entries) {
    const escapedDate = escapeSpreadsheetCell(entry.bookedOn);
    const escapedId = escapeSpreadsheetCell(entry.externalId);
    const escapedCategory = escapeSpreadsheetCell(entry.category);
    const escapedDesc = escapeSpreadsheetCell(entry.description.replace(/"/g, '""'));
    const amountCny = formatAmount(entry.amountMinor);

    lines.push(
      `"${escapedDate}","${escapedId}","${escapedCategory}","${escapedDesc}",${amountCny},${entry.amountMinor}`,
    );
  }

  return lines.join('\r\n') + '\r\n';
}
