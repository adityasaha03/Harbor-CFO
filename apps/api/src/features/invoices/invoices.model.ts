import mongoose, { type Model, type Types } from 'mongoose';
import { createSchema } from '../../core/db/base-schema.js';
import type { InvoiceDirection, InvoiceStatus } from '@harbor/contracts';

export interface InvoiceDoc {
  id?: string;
  tenantId: string;
  externalId: string;
  direction: InvoiceDirection;
  counterpartyExternalId: string;
  totalMinor: number;
  outstandingMinor: number;
  currency: 'CNY';
  issuedOn?: string;
  dueOn: string;
  expectedSettlementOn: string;
  status: InvoiceStatus;
  description?: string;
  sourceImportId?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const invoiceSchema = createSchema<InvoiceDoc>({
  tenantId: { type: String, required: true },
  externalId: { type: String, required: true },
  direction: { type: String, required: true, enum: ['AR', 'AP'] },
  counterpartyExternalId: { type: String, required: true },
  totalMinor: { type: Number, required: true, min: 1 },
  outstandingMinor: { type: Number, required: true, min: 0 },
  currency: { type: String, required: true, default: 'CNY' },
  issuedOn: { type: String },
  dueOn: { type: String, required: true },
  expectedSettlementOn: { type: String, required: true },
  status: { type: String, required: true, enum: ['open', 'partially_paid', 'paid'] },
  description: { type: String },
  sourceImportId: { type: mongoose.Schema.Types.ObjectId },
});

// Unique index per tenant + externalId
invoiceSchema.index({ tenantId: 1, externalId: 1 }, { unique: true });

// Secondary index for forecast & filtering
invoiceSchema.index({ tenantId: 1, direction: 1, status: 1, expectedSettlementOn: 1 });

export const InvoiceModel: Model<InvoiceDoc> =
  mongoose.models.Invoice || mongoose.model<InvoiceDoc>('Invoice', invoiceSchema, 'invoices');
