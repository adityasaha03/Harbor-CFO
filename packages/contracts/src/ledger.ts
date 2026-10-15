import { z } from 'zod';
import { dateOnlySchema } from './common/dates';
import { paginationQuerySchema } from './common/pagination';
import { minorSchema } from './common/money';
import { LEDGER_CATEGORIES, ledgerCategorySchema, type LedgerCategory } from './imports';

export { LEDGER_CATEGORIES, ledgerCategorySchema, type LedgerCategory };

export const LEDGER_ENTRY_KINDS = [
  'imported',
  'sandbox_financing_draw',
  'sandbox_financing_fee',
] as const;
export const ledgerEntryKindSchema = z.enum(LEDGER_ENTRY_KINDS);
export type LedgerEntryKind = (typeof LEDGER_ENTRY_KINDS)[number];

export const accountDtoSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  code: z.string(),
  name: z.string(),
  currency: z.literal('CNY'),
  openingBalanceMinor: minorSchema,
  openingBalanceDate: dateOnlySchema,
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type AccountDto = z.infer<typeof accountDtoSchema>;

export const COUNTERPARTY_TYPES = ['customer', 'vendor'] as const;
export const counterpartyTypeSchema = z.enum(COUNTERPARTY_TYPES);
export type CounterpartyType = (typeof COUNTERPARTY_TYPES)[number];

export const counterpartyDtoSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  externalId: z.string(),
  type: counterpartyTypeSchema,
  name: z.string(),
  maskedName: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type CounterpartyDto = z.infer<typeof counterpartyDtoSchema>;

export const ledgerEntryDtoSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  accountCode: z.string(),
  externalId: z.string(),
  bookedOn: dateOnlySchema,
  amountMinor: minorSchema,
  currency: z.literal('CNY'),
  category: ledgerCategorySchema,
  description: z.string(),
  counterpartyExternalId: z.string().optional(),
  invoiceExternalId: z.string().optional(),
  kind: ledgerEntryKindSchema,
  sourceImportId: z.string().optional(),
  operationId: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type LedgerEntryDto = z.infer<typeof ledgerEntryDtoSchema>;

export const ledgerQuerySchema = paginationQuerySchema.extend({
  from: dateOnlySchema.optional(),
  to: dateOnlySchema.optional(),
  category: ledgerCategorySchema.optional(),
  accountCode: z.string().optional(),
});
export type LedgerQuery = z.input<typeof ledgerQuerySchema>;
