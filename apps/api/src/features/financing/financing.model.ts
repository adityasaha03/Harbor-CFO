import mongoose, { type Model } from 'mongoose';
import type { FinancingOffer } from '@harbor/contracts';
import { createSchema } from '../../core/db/base-schema';

export interface FinancingOfferDoc extends FinancingOffer {
  id?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const offerInstallmentsSchema = new mongoose.Schema(
  {
    count: { type: Number, required: true },
    firstDueAfterFundingDays: { type: Number, required: true },
    intervalDays: { type: Number, required: true },
  },
  { _id: false },
);

const financingOfferSchema = createSchema<FinancingOfferDoc>({
  code: { type: String, required: true },
  version: { type: Number, required: true, default: 1 },
  synthetic: { type: Boolean, required: true, default: true },
  type: {
    type: String,
    required: true,
    enum: [
      'revolving_credit',
      'bridge_loan',
      'invoice_finance',
      'equipment_finance',
      'merchant_advance',
      'term_loan',
    ],
  },
  name: { type: String, required: true },
  description: { type: String, required: true },
  currency: { type: String, required: true, default: 'CNY' },
  minAmountMinor: { type: Number, required: true },
  maxAmountMinor: { type: Number, required: true },
  dynamicCap: {
    type: String,
    required: true,
    enum: ['none', 'ar_advance_80pct'],
    default: 'none',
  },
  fundingDelayDays: { type: Number, required: true },
  upfrontFeeBps: { type: Number, required: true },
  flatInterestBps: { type: Number, required: true },
  installments: { type: offerInstallmentsSchema, required: true },
  eligiblePurposes: {
    type: [String],
    required: true,
    enum: ['working_capital', 'bridge', 'equipment'],
  },
  requiresInvoiceEvidence: { type: Boolean, required: true, default: false },
  requiredProfileFields: { type: [String], required: true, default: [] },
  minYearsInOperation: { type: Number, required: false },
});

financingOfferSchema.index({ code: 1, version: 1 }, { unique: true });

export const FinancingOfferModel: Model<FinancingOfferDoc> =
  mongoose.models.FinancingOffer ||
  mongoose.model<FinancingOfferDoc>('FinancingOffer', financingOfferSchema, 'financingOffers');
