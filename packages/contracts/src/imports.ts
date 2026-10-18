import { z } from 'zod';
import { dateOnlySchema } from './common/dates';
import { minorSchema, positiveMinorSchema, nonNegativeMinorSchema } from './common/money';

// ---------------------------------------------------------------------------
// CSV template headers (case-insensitive, exact match)
// ---------------------------------------------------------------------------

export const TRANSACTION_CSV_HEADERS = [
  'externalId',
  'date',
  'accountId',
  'amount',
  'currency',
  'category',
  'description',
] as const;

export const INVOICE_CSV_HEADERS = [
  'invoiceId',
  'direction',
  'counterpartyId',
  'total',
  'outstanding',
  'currency',
  'dueDate',
  'expectedSettlementDate',
  'status',
] as const;

// ---------------------------------------------------------------------------
// Shared enums (used by both CSV validation and domain models)
// ---------------------------------------------------------------------------

export const LEDGER_CATEGORIES = [
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
] as const;

export const ledgerCategorySchema = z.enum(LEDGER_CATEGORIES);
export type LedgerCategory = z.infer<typeof ledgerCategorySchema>;

export const INVOICE_DIRECTIONS = ['AR', 'AP'] as const;
export const invoiceDirectionSchema = z.enum(INVOICE_DIRECTIONS);
export type InvoiceDirection = z.infer<typeof invoiceDirectionSchema>;

export const INVOICE_STATUSES = ['open', 'partially_paid', 'paid'] as const;
export const invoiceStatusSchema = z.enum(INVOICE_STATUSES);
export type InvoiceStatus = z.infer<typeof invoiceStatusSchema>;

export const IMPORT_KINDS = ['transactions', 'invoices'] as const;
export const importKindSchema = z.enum(IMPORT_KINDS);
export type ImportKind = z.infer<typeof importKindSchema>;

// ---------------------------------------------------------------------------
// External ID pattern (used in CSV validation)
// ---------------------------------------------------------------------------

const EXTERNAL_ID_REGEX = /^[A-Za-z0-9._-]{1,64}$/;

export const externalIdSchema = z
  .string()
  .regex(EXTERNAL_ID_REGEX, 'Must be 1–64 alphanumeric, dot, dash or underscore characters');

// ---------------------------------------------------------------------------
// Normalized row schemas (output of the engine mappers, stored in imports.stagedRows)
// ---------------------------------------------------------------------------

export const normalizedTransactionRowSchema = z.object({
  externalId: externalIdSchema,
  bookedOn: dateOnlySchema,
  accountCode: z.string().min(1),
  amountMinor: minorSchema.refine((v) => v !== 0, { message: 'Amount must be non-zero' }),
  currency: z.literal('CNY'),
  category: ledgerCategorySchema,
  description: z.string().max(2000).default(''),
});

export type NormalizedTransactionRow = z.infer<typeof normalizedTransactionRowSchema>;

export const normalizedInvoiceRowSchema = z
  .object({
    externalId: externalIdSchema,
    direction: invoiceDirectionSchema,
    counterpartyExternalId: externalIdSchema,
    totalMinor: positiveMinorSchema,
    outstandingMinor: nonNegativeMinorSchema,
    currency: z.literal('CNY'),
    dueOn: dateOnlySchema,
    expectedSettlementOn: dateOnlySchema,
    status: invoiceStatusSchema,
  })
  .refine((row) => row.outstandingMinor <= row.totalMinor, {
    message: 'Outstanding must not exceed total',
    path: ['outstandingMinor'],
  })
  .refine(
    (row) => {
      if (row.status === 'paid') return row.outstandingMinor === 0;
      return true;
    },
    {
      message: 'Outstanding must be 0 when status is paid',
      path: ['outstandingMinor'],
    },
  );

export type NormalizedInvoiceRow = z.infer<typeof normalizedInvoiceRowSchema>;

// ---------------------------------------------------------------------------
// Error item schema
// ---------------------------------------------------------------------------

export const importErrorItemSchema = z.object({
  row: z.number().int().positive(),
  field: z.string(),
  message: z.string(),
});

export type ImportErrorItem = z.infer<typeof importErrorItemSchema>;

// ---------------------------------------------------------------------------
// Engine result types
// ---------------------------------------------------------------------------

export const importWarningSchema = z.object({
  row: z.number().int().positive(),
  field: z.string(),
  message: z.string(),
});

export type ImportWarning = z.infer<typeof importWarningSchema>;

export interface ImportSuccessResult<T> {
  ok: true;
  rows: T[];
  rowCount: number;
  warnings: ImportWarning[];
}

export interface ImportFailureResult {
  ok: false;
  errors: ImportErrorItem[];
  truncated: boolean;
}

export type ImportResult<T> = ImportSuccessResult<T> | ImportFailureResult;

// ---------------------------------------------------------------------------
// Import statuses and DTOs
// ---------------------------------------------------------------------------

export const IMPORT_STATUSES = ['previewed', 'committed', 'rejected', 'expired'] as const;
export const importStatusSchema = z.enum(IMPORT_STATUSES);
export type ImportStatus = z.infer<typeof importStatusSchema>;

export const importDtoSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  kind: importKindSchema,
  fileName: z.string(),
  checksum: z.string(),
  mappingVersion: z.number().int(),
  status: importStatusSchema,
  rowCount: z.number().int(),
  acceptedRows: z.number().int(),
  rejectedRows: z.number().int(),
  errors: z.array(importErrorItemSchema),
  actorId: z.string(),
  expiresAt: z.string(),
  committedAt: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type ImportDto = z.infer<typeof importDtoSchema>;

export const importPreviewResponseSchema = z.object({
  importId: z.string(),
  kind: importKindSchema,
  fileName: z.string(),
  status: importStatusSchema,
  rowCount: z.number().int(),
  acceptedRows: z.number().int(),
  rejectedRows: z.number().int(),
  warnings: z.array(importWarningSchema),
  errors: z.array(importErrorItemSchema),
  sampleRows: z.array(z.record(z.unknown())).optional(),
});

export type ImportPreviewResponse = z.infer<typeof importPreviewResponseSchema>;

export const importsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
  kind: importKindSchema.optional(),
  status: importStatusSchema.optional(),
});

export type ImportsQuery = z.infer<typeof importsQuerySchema>;

export const importIdParamSchema = z.object({
  id: z.string().min(1),
});

export type ImportIdParam = z.infer<typeof importIdParamSchema>;

export const importPreviewBodySchema = z.object({
  kind: importKindSchema,
});

export type ImportPreviewBody = z.infer<typeof importPreviewBodySchema>;

// ---------------------------------------------------------------------------
// Limits
// ---------------------------------------------------------------------------

export const IMPORT_LIMITS = {
  MAX_FILE_BYTES: 5 * 1024 * 1024,
  MAX_ROWS: 10_000,
  MAX_COLUMNS: 30,
  MAX_CELL_LENGTH: 2_000,
  MAX_ERRORS: 200,
} as const;

// ---------------------------------------------------------------------------
// Smart AI Data Mapper Contracts
// ---------------------------------------------------------------------------

export const transformImportInputSchema = z.object({
  kind: importKindSchema,
  rawContent: z.string().min(1, 'Raw content cannot be empty').max(500_000, 'Raw content too large (max 500KB)'),
  fileName: z.string().max(255).optional(),
});

export type TransformImportInput = z.infer<typeof transformImportInputSchema>;

export const transformImportResponseSchema = z.object({
  kind: importKindSchema,
  csvContent: z.string(),
  rowCount: z.number().int().nonnegative(),
  detectedColumns: z.array(z.string()),
  warnings: z.array(z.string()),
  sampleRows: z.array(z.record(z.unknown())),
});

export type TransformImportResponse = z.infer<typeof transformImportResponseSchema>;


