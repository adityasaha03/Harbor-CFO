import mongoose, { type Model } from 'mongoose';
import { createSchema } from '../../core/db/base-schema.js';
import type {
  CommitmentDirection,
  CommitmentFrequency,
  LedgerCategory,
} from '@harbor/contracts';

export interface CommitmentDoc {
  id?: string;
  tenantId: string;
  label: string;
  direction: CommitmentDirection;
  category: LedgerCategory;
  amountMinor: number;
  frequency: CommitmentFrequency;
  anchorOn: string;
  endOn?: string;
  createdAt: Date;
  updatedAt: Date;
}

const commitmentSchema = createSchema<CommitmentDoc>({
  tenantId: { type: String, required: true },
  label: { type: String, required: true },
  direction: { type: String, required: true, enum: ['inflow', 'outflow'] },
  category: { type: String, required: true },
  amountMinor: { type: Number, required: true, min: 1 },
  frequency: {
    type: String,
    required: true,
    enum: ['once', 'weekly', 'biweekly', 'monthly'],
  },
  anchorOn: { type: String, required: true },
  endOn: { type: String },
});

// Unique index per tenant + label
commitmentSchema.index({ tenantId: 1, label: 1 }, { unique: true });

export const CommitmentModel: Model<CommitmentDoc> =
  mongoose.models.Commitment ||
  mongoose.model<CommitmentDoc>('Commitment', commitmentSchema, 'commitments');

