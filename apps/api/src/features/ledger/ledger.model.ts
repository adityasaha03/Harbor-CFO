import mongoose, { type Model } from 'mongoose';
import type { LedgerCategory, LedgerEntryKind } from '@harbor/contracts';
import { createSchema } from '../../core/db/base-schema';

export interface LedgerEntryDoc {
  id?: string;
  tenantId: string;
  accountCode: string;
  externalId: string;
  bookedOn: string;
  amountMinor: number;
  currency: 'CNY';
  category: LedgerCategory;
  description: string;
  counterpartyExternalId?: string;
  invoiceExternalId?: string;
  kind: LedgerEntryKind;
  sourceImportId?: mongoose.Types.ObjectId;
  operationId?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ledgerEntrySchema = createSchema<LedgerEntryDoc>({
  tenantId: { type: String, required: true },
  accountCode: { type: String, required: true },
  externalId: { type: String, required: true },
  bookedOn: { type: String, required: true },
  amountMinor: { type: Number, required: true },
  currency: { type: String, required: true, default: 'CNY' },
  category: {
    type: String,
    required: true,
    enum: [
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
    ],
  },
  description: { type: String, required: false, default: '' },
  counterpartyExternalId: { type: String, required: false },
  invoiceExternalId: { type: String, required: false },
  kind: {
    type: String,
    required: true,
    enum: ['imported', 'sandbox_financing_draw', 'sandbox_financing_fee'],
    default: 'imported',
  },
  sourceImportId: { type: mongoose.Schema.Types.ObjectId, required: false },
  operationId: { type: String, required: false },
});

// Indexes per DB_SCHEMA.md
ledgerEntrySchema.index({ tenantId: 1, accountCode: 1, externalId: 1 }, { unique: true });
ledgerEntrySchema.index({ tenantId: 1, bookedOn: 1 });

export const LedgerEntryModel: Model<LedgerEntryDoc> =
  mongoose.models.LedgerEntry ||
  mongoose.model<LedgerEntryDoc>('LedgerEntry', ledgerEntrySchema, 'ledgerEntries');

