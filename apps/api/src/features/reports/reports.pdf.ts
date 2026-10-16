import type { CashSummaryReportData } from './reports.csv';

function escapePdfString(str: string): string {
  return str.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
}

/**
 * Pure lightweight server-side PDF generator (PDF-1.4 standard compliant).
 * Creates a valid, styled, single-page summary report with zero external dependencies.
 */
export function buildCashSummaryPdf(data: CashSummaryReportData): Buffer {
  const streamLines: string[] = [];

  streamLines.push('BT');
  // Title
  streamLines.push('/F1 18 Tf');
  streamLines.push('50 790 Td');
  streamLines.push('(HarborCFO — Monthly Cash Summary Report) Tj');

  // Metadata Subhead
  streamLines.push('/F1 10 Tf');
  streamLines.push('0 -22 Td');
  streamLines.push(`(Tenant: ${escapePdfString(data.tenantId)}    Month: ${escapePdfString(data.month)}    Currency: ${escapePdfString(data.currency)}) Tj`);
  streamLines.push('0 -14 Td');
  streamLines.push(`(Generated: ${escapePdfString(data.generatedAt)}) Tj`);

  // Section: Key Totals
  streamLines.push('0 -30 Td');
  streamLines.push('/F1 12 Tf');
  streamLines.push('(1. Cash Position & Liquidity Summary) Tj');
  streamLines.push('/F1 10 Tf');

  const yuan = (m: number) => `¥${(m / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}`;

  const rows = [
    `Opening Cash Balance:        ${yuan(data.openingCashMinor)}`,
    `Total Inflows (Receipts):    ${yuan(data.totalReceiptsMinor)}`,
    `Total Outflows (Payments):   ${yuan(data.totalPaymentsMinor)}`,
    `Net Cash Movement:           ${yuan(data.netCashFlowMinor)}`,
    `Closing Cash Balance:        ${yuan(data.closingCashMinor)}`,
    `Projected 91-Day Min Cash:   ${yuan(data.minCashMinor)}`,
    `Liquidity Floor Target:      ${yuan(data.floorMinor)}`,
    `Liquidity Floor Gap:         ${yuan(data.liquidityGapMinor)}`,
  ];

  for (const row of rows) {
    streamLines.push('0 -16 Td');
    streamLines.push(`(${escapePdfString(row)}) Tj`);
  }

  // Section: Transaction Details
  streamLines.push('0 -30 Td');
  streamLines.push('/F1 12 Tf');
  streamLines.push(`(2. Transactions Booked in ${escapePdfString(data.month)}) Tj`);
  streamLines.push('/F1 9 Tf');

  const previewEntries = data.entries.slice(0, 15);
  for (const entry of previewEntries) {
    const desc = entry.description.slice(0, 35);
    const line = `${entry.bookedOn} | ${entry.externalId.padEnd(12)} | ${entry.category.padEnd(16)} | ${yuan(entry.amountMinor).padStart(12)} | ${desc}`;
    streamLines.push('0 -14 Td');
    streamLines.push(`(${escapePdfString(line)}) Tj`);
  }

  if (data.entries.length > 15) {
    streamLines.push('0 -14 Td');
    streamLines.push(`(... and ${data.entries.length - 15} more transaction records.) Tj`);
  }

  streamLines.push('ET');

  const contentStream = streamLines.join('\n');
  const streamLength = Buffer.byteLength(contentStream, 'utf-8');

  // Build PDF structure
  const pdfChunks: string[] = [];
  const offsets: number[] = [];

  let currentOffset = 0;
  function addChunk(chunk: string) {
    pdfChunks.push(chunk);
    currentOffset += Buffer.byteLength(chunk, 'utf-8');
  }

  // Header
  addChunk('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n');

  // Object 1: Catalog
  offsets.push(currentOffset);
  addChunk('1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n');

  // Object 2: Pages
  offsets.push(currentOffset);
  addChunk('2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n');

  // Object 3: Page
  offsets.push(currentOffset);
  addChunk(
    '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>\nendobj\n',
  );

  // Object 4: Font
  offsets.push(currentOffset);
  addChunk('4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n');

  // Object 5: Contents
  offsets.push(currentOffset);
  addChunk(`5 0 obj\n<< /Length ${streamLength} >>\nstream\n${contentStream}\nendstream\nendobj\n`);

  // XRef
  const xrefOffset = currentOffset;
  let xref = `xref\n0 6\n0000000000 65535 f \n`;
  for (const off of offsets) {
    xref += `${String(off).padStart(10, '0')} 00000 n \n`;
  }
  addChunk(xref);

  // Trailer
  addChunk(`trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`);

  return Buffer.from(pdfChunks.join(''), 'utf-8');
}
