import {
  type ImportErrorItem,
  type NormalizedTransactionRow,
  TRANSACTION_CSV_HEADERS,
  ledgerCategorySchema,
} from '@harbor/contracts';
import { toMinor } from '@harbor/contracts/common/money';
import { normalizeDateOnly } from '@harbor/contracts/common/dates';
import { type NumberedRow } from './types';

const EXTERNAL_ID_REGEX = /^[A-Za-z0-9._-]{1,64}$/;

/**
 * Map and validate a raw CSV row into a normalized transaction row.
 *
 * @param row - Parsed CSV row with 1-based line number
 * @returns Either a validated row or an array of error items
 */
export function mapTransactionRow(
  row: NumberedRow,
): { ok: true; row: NormalizedTransactionRow } | { ok: false; errors: ImportErrorItem[] } {
  const errors: ImportErrorItem[] = [];
  const { lineNumber, data } = row;

  // --- externalId ---
  const externalId = (data['externalid'] ?? '').trim();
  if (!EXTERNAL_ID_REGEX.test(externalId)) {
    errors.push({
      row: lineNumber,
      field: 'externalId',
      message: 'Must be 1–64 alphanumeric, dot, dash or underscore characters',
    });
  }

  // --- date -> bookedOn ---
  const rawDateStr = (data['date'] ?? '').trim();
  const normalizedDate = normalizeDateOnly(rawDateStr);
  if (!normalizedDate) {
    errors.push({
      row: lineNumber,
      field: 'date',
      message: 'Must be a valid date (YYYY-MM-DD or MM/DD/YYYY)',
    });
  }

  // --- accountId -> accountCode ---
  const accountCode = (data['accountid'] ?? '').trim();
  if (accountCode.length === 0) {
    errors.push({
      row: lineNumber,
      field: 'accountId',
      message: 'Account ID is required',
    });
  }

  // --- amount -> amountMinor ---
  const amountStr = (data['amount'] ?? '').trim();
  let amountMinor = 0;
  try {
    amountMinor = toMinor(amountStr);
    if (amountMinor === 0) {
      errors.push({
        row: lineNumber,
        field: 'amount',
        message: 'Amount must be non-zero',
      });
    }
  } catch {
    errors.push({
      row: lineNumber,
      field: 'amount',
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

  // --- category ---
  const categoryStr = (data['category'] ?? '').trim().toLowerCase();
  const categoryResult = ledgerCategorySchema.safeParse(categoryStr);
  if (!categoryResult.success) {
    errors.push({
      row: lineNumber,
      field: 'category',
      message: `Invalid category. Must be one of: ${VALID_CATEGORIES}`,
    });
  }

  // --- description ---
  const description = (data['description'] ?? '').trim();
  if (description.length > 2000) {
    errors.push({
      row: lineNumber,
      field: 'description',
      message: 'Description exceeds 2000 characters',
    });
  }

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    row: {
      externalId,
      bookedOn: normalizedDate!,
      accountCode,
      amountMinor,
      currency: 'CNY' as const,
      category: categoryResult.data!,
      description,
    },
  };
}

const VALID_CATEGORIES = [
  'customer_receipt',
  'supplier_payment',
  'payroll',
  'rent',
  'overhead',
  'tax',
  'loan_draw',
  'loan_fee',
  'loan_repayment',
  'other_income',
  'other_expense',
].join(', ');

/** Allowed CSV headers for the transaction template. */
export { TRANSACTION_CSV_HEADERS };

