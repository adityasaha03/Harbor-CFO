import { z } from 'zod';
import { dateOnlySchema } from './common/dates';
import { positiveMinorSchema, nonNegativeMinorSchema } from './common/money';
import {
  INVOICE_DIRECTIONS,
  invoiceDirectionSchema,
  INVOICE_STATUSES,
  invoiceStatusSchema,
  ledgerCategorySchema,
  type InvoiceDirection,
  type InvoiceStatus,
} from './imports';

export {
  INVOICE_DIRECTIONS,
  invoiceDirectionSchema,
  INVOICE_STATUSES,
  invoiceStatusSchema,
  type InvoiceDirection,
  type InvoiceStatus,
};

export const invoiceDtoSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  externalId: z.string(),
  direction: invoiceDirectionSchema,
  counterpartyExternalId: z.string(),
  totalMinor: positiveMinorSchema,
  outstandingMinor: nonNegativeMinorSchema,
  currency: z.literal('CNY'),
  issuedOn: dateOnlySchema.optional(),
  dueOn: dateOnlySchema,
  expectedSettlementOn: dateOnlySchema,
  status: invoiceStatusSchema,
  description: z.string().optional(),
  sourceImportId: z.string().optional(),
  isOverdue: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type InvoiceDto = z.infer<typeof invoiceDtoSchema>;

export const invoicesQuerySchema = z.object({
  direction: invoiceDirectionSchema.optional(),
  status: invoiceStatusSchema.optional(),
  overdue: z
    .union([z.boolean(), z.enum(['true', 'false'])])
    .transform((v) => (typeof v === 'boolean' ? v : v === 'true'))
    .optional(),
});
export type InvoicesQuery = z.input<typeof invoicesQuerySchema>;

// ---------------------------------------------------------------------------
// Commitments schemas and DTOs
// ---------------------------------------------------------------------------

import {
  COMMITMENT_FREQUENCIES,
  commitmentFrequencySchema,
  type CommitmentFrequency,
} from './forecast';

export {
  COMMITMENT_FREQUENCIES,
  commitmentFrequencySchema,
  type CommitmentFrequency,
};

export const COMMITMENT_DIRECTIONS = ['inflow', 'outflow'] as const;
export const commitmentDirectionSchema = z.enum(COMMITMENT_DIRECTIONS);
export type CommitmentDirection = (typeof COMMITMENT_DIRECTIONS)[number];

export const commitmentDtoSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  label: z.string(),
  direction: commitmentDirectionSchema,
  category: ledgerCategorySchema,
  amountMinor: positiveMinorSchema,
  frequency: commitmentFrequencySchema,
  anchorOn: dateOnlySchema,
  endOn: dateOnlySchema.optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type CommitmentDto = z.infer<typeof commitmentDtoSchema>;

export const createCommitmentSchema = z.object({
  label: z.string().min(1).max(200),
  direction: commitmentDirectionSchema,
  category: ledgerCategorySchema,
  amountMinor: positiveMinorSchema,
  frequency: commitmentFrequencySchema,
  anchorOn: dateOnlySchema,
  endOn: dateOnlySchema.optional(),
});
export type CreateCommitmentInput = z.input<typeof createCommitmentSchema>;

export const updateCommitmentSchema = createCommitmentSchema.partial();
export type UpdateCommitmentInput = z.input<typeof updateCommitmentSchema>;
