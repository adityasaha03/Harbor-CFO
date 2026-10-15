import mongoose, { type Model } from 'mongoose';
import type { CounterpartyType } from '@harbor/contracts';
import { createSchema } from '../../core/db/base-schema';

export interface CounterpartyDoc {
  id?: string;
  tenantId: string;
  externalId: string;
  type: CounterpartyType;
  name: string;
  maskedName: string;
  createdAt: Date;
  updatedAt: Date;
}

const counterpartySchema = createSchema<CounterpartyDoc>({
  tenantId: { type: String, required: true },
  externalId: { type: String, required: true },
  type: { type: String, required: true, enum: ['customer', 'vendor'] },
  name: { type: String, required: true },
  maskedName: { type: String, required: true },
});

// Unique index on (tenantId, externalId)
counterpartySchema.index({ tenantId: 1, externalId: 1 }, { unique: true });

export const CounterpartyModel: Model<CounterpartyDoc> =
  mongoose.models.Counterparty ||
  mongoose.model<CounterpartyDoc>('Counterparty', counterpartySchema, 'counterparties');

