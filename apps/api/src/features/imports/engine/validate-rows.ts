import {
  type ImportErrorItem,
  type ImportWarning,
  type ImportResult,
  type NormalizedTransactionRow,
  type NormalizedInvoiceRow,
  TRANSACTION_CSV_HEADERS,
  INVOICE_CSV_HEADERS,
  type ImportKind,
} from '@harbor/contracts';
import { parseCsv } from './parse-csv';
import { mapTransactionRow } from './transactions.mapper';
import { mapInvoiceRow } from './invoices.mapper';
import { MAX_ERRORS } from './limits';

/**
 * Validate and normalize parsed CSV rows.
 * Handles per-row validation, duplicate detection, and error capping.
 *
 * Import is atomic: any error rejects the entire file.
 *
 * @param buffer - Raw CSV file bytes
 * @param kind - 'transactions' or 'invoices'
 * @returns Success result with normalized rows or failure result with errors
 */
export function validateAndMapRows(
  buffer: Buffer,
  kind: ImportKind,
): ImportResult<NormalizedTransactionRow | NormalizedInvoiceRow> {
  const headers = kind === 'transactions' ? TRANSACTION_CSV_HEADERS : INVOICE_CSV_HEADERS;
  const numberedRows = parseCsv(buffer, headers);

  const allErrors: ImportErrorItem[] = [];
  const allWarnings: ImportWarning[] = [];
  const validRows: (NormalizedTransactionRow | NormalizedInvoiceRow)[] = [];

  // Track duplicates by external ID
  const seenIds = new Map<string, { lineNumber: number; serialized: string }>();

  for (const row of numberedRows) {
    // Map and validate the row
    const result = kind === 'transactions'
      ? mapTransactionRow(row)
      : mapInvoiceRow(row);

    if (!result.ok) {
      allErrors.push(...result.errors);
      continue;
    }

    const mapped = result.row;
    const id = mapped.externalId;
    const serialized = JSON.stringify(mapped);

    const existing = seenIds.get(id);
    if (existing) {
      if (existing.serialized === serialized) {
        // Identical duplicate: collapse with a warning
        allWarnings.push({
          row: row.lineNumber,
          field: kind === 'transactions' ? 'externalId' : 'invoiceId',
          message: `Duplicate row with same content as row ${existing.lineNumber}; collapsed`,
        });
        continue;
      } else {
        // Conflicting duplicate: error
        allErrors.push({
          row: row.lineNumber,
          field: kind === 'transactions' ? 'externalId' : 'invoiceId',
          message: `Duplicate ID "${id}" with different content (first seen at row ${existing.lineNumber})`,
        });
        continue;
      }
    }

    seenIds.set(id, { lineNumber: row.lineNumber, serialized });
    validRows.push(mapped);
  }

  // Atomic rejection: if any errors, reject the entire file
  if (allErrors.length > 0) {
    const truncated = allErrors.length > MAX_ERRORS;
    return {
      ok: false,
      errors: allErrors.slice(0, MAX_ERRORS),
      truncated,
    };
  }

  return {
    ok: true,
    rows: validRows,
    rowCount: validRows.length,
    warnings: allWarnings,
  };
}

