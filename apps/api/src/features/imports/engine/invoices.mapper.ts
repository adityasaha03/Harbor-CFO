import {
  type ImportErrorItem,
  type NormalizedInvoiceRow,
  INVOICE_CSV_HEADERS,
  invoiceDirectionSchema,
  invoiceStatusSchema,
} from '@harbor/contracts';
import { toMinor } from '@harbor/contracts/common/money';
import { isDateOnly } from '@harbor/contracts/common/dates';
import { type NumberedRow } from './types';

const EXTERNAL_ID_REGEX = /^[A-Za-z0-9._-]{1,64}$/;

/**
 * Map and validate a raw CSV row into a normalized invoice row.
 *
 * @param row - Parsed CSV row with 1-based line number
 * @returns Either a validated row or an array of error items
 */
export function mapInvoiceRow(
  row: NumberedRow,
): { ok: true; row: NormalizedInvoiceRow } | { ok: false; errors: ImportErrorItem[] } {
  const errors: ImportErrorItem[] = [];
  const { lineNumber, data } = row;

  // --- invoiceId -> externalId ---
  const externalId = (data['invoiceid'] ?? '').trim();
  if (!EXTERNAL_ID_REGEX.test(externalId)) {
    errors.push({
      row: lineNumber,
      field: 'invoiceId',
      message: 'Must be 1–64 alphanumeric, dot, dash or underscore characters',
    });
  }

  // --- direction ---
  const directionStr = (data['direction'] ?? '').trim().toUpperCase();
  const directionResult = invoiceDirectionSchema.safeParse(directionStr);
  if (!directionResult.success) {
    errors.push({
      row: lineNumber,
      field: 'direction',
      message: 'Must be AR or AP',
    });
  }

  // --- counterpartyId -> counterpartyExternalId ---
  const counterpartyExternalId = (data['counterpartyid'] ?? '').trim();
  if (!EXTERNAL_ID_REGEX.test(counterpartyExternalId)) {
    errors.push({
      row: lineNumber,
      field: 'counterpartyId',
      message: 'Must be 1–64 alphanumeric, dot, dash or underscore characters',
    });
  }

  // --- total -> totalMinor ---
  const totalStr = (data['total'] ?? '').trim();
  let totalMinor = 0;
  try {
    totalMinor = toMinor(totalStr);
    if (totalMinor <= 0) {
      errors.push({
        row: lineNumber,
        field: 'total',
        message: 'Total must be positive',
      });
    }
  } catch {
    errors.push({
      row: lineNumber,
      field: 'total',
      message: 'Invalid money amount format',
    });
  }

  // --- outstanding -> outstandingMinor ---
  const outstandingStr = (data['outstanding'] ?? '').trim();
  let outstandingMinor = 0;
  try {
    outstandingMinor = toMinor(outstandingStr);
    if (outstandingMinor < 0) {
      errors.push({
        row: lineNumber,
        field: 'outstanding',
        message: 'Outstanding must be non-negative',
      });
    }
  } catch {
    errors.push({
      row: lineNumber,
      field: 'outstanding',
      message: 'Invalid money amount format',
    });
  }

  // --- currency ---
  const currency = (data['currency'] ?? '').trim().toUpperCase();
  if (currency !== 'CNY') {
    errors.push({
      row: lineNumber,
      field: 'currency',
      message: 'Currency must be CNY',
    });
  }

  // --- dueDate -> dueOn ---
  const dueDateStr = (data['duedate'] ?? '').trim();
  if (!isDateOnly(dueDateStr)) {
    errors.push({
      row: lineNumber,
      field: 'dueDate',
      message: 'Must be a valid YYYY-MM-DD date',
    });
  }

  // --- expectedSettlementDate -> expectedSettlementOn ---
  const expectedStr = (data['expectedsettlementdate'] ?? '').trim();
  if (!isDateOnly(expectedStr)) {
    errors.push({
      row: lineNumber,
      field: 'expectedSettlementDate',
      message: 'Must be a valid YYYY-MM-DD date',
    });
  }

  // --- status ---
  const statusStr = (data['status'] ?? '').trim().toLowerCase();
  const statusResult = invoiceStatusSchema.safeParse(statusStr);
  if (!statusResult.success) {
    errors.push({
      row: lineNumber,
      field: 'status',
      message: 'Must be one of: open, partially_paid, paid',
    });
  }

  // Bail out early if field-level errors exist before cross-field checks
  if (errors.length > 0) {
    return { ok: false, errors };
  }

  // Cross-field: outstanding <= total
  if (outstandingMinor > totalMinor) {
    errors.push({
      row: lineNumber,
      field: 'outstanding',
      message: 'Outstanding must not exceed total',
    });
  }

  // Cross-field: paid status requires outstanding = 0
  if (statusResult.data === 'paid' && outstandingMinor !== 0) {
    errors.push({
      row: lineNumber,
      field: 'outstanding',
      message: 'Outstanding must be 0 when status is paid',
    });
  }

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    row: {
      externalId,
      direction: directionResult.data!,
      counterpartyExternalId,
      totalMinor,
      outstandingMinor,
      currency: 'CNY' as const,
      dueOn: dueDateStr,
      expectedSettlementOn: expectedStr,
      status: statusResult.data!,
    },
  };
}

/** Allowed CSV headers for the invoice template. */
export { INVOICE_CSV_HEADERS };

