import {
  TRANSACTION_CSV_HEADERS,
  INVOICE_CSV_HEADERS,
  type ImportKind,
} from '@harbor/contracts';

/**
 * Returns header row + sample rows for bank transactions CSV.
 */
export function getTransactionCsvTemplate(): string {
  const header = TRANSACTION_CSV_HEADERS.join(',');
  const sampleRows = [
    'TXN-1001,2026-10-20,1001,15000.00,CNY,customer_receipt,Sample customer invoice payment',
    'TXN-1002,2026-10-21,1001,-3500.00,CNY,overhead,Office supplies expense',
    'TXN-1003,2026-10-22,1001,-12000.00,CNY,rent,Monthly office lease payment',
  ];
  return [header, ...sampleRows].join('\n');
}

/**
 * Returns header row + sample rows for invoices CSV.
 */
export function getInvoiceCsvTemplate(): string {
  const header = INVOICE_CSV_HEADERS.join(',');
  const sampleRows = [
    'INV-2001,AR,CUST-001,25000.00,25000.00,CNY,2026-11-15,2026-11-15,open',
    'INV-2002,AP,SUPP-001,18000.00,18000.00,CNY,2026-11-05,2026-11-05,open',
    'INV-2003,AR,CUST-002,12000.00,0.00,CNY,2026-10-10,2026-10-10,paid',
  ];
  return [header, ...sampleRows].join('\n');
}

/**
 * Generates and triggers browser download of a template CSV blob.
 */
export function downloadCsvTemplate(kind: ImportKind): void {
  const content =
    kind === 'transactions'
      ? getTransactionCsvTemplate()
      : getInvoiceCsvTemplate();

  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.setAttribute('download', `${kind}-template.csv`);
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}
