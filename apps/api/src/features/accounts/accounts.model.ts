import mongoose, { type Model } from 'mongoose';
import { createSchema } from '../../core/db/base-schema';

export interface AccountDoc {
  id?: string;
  tenantId: string;
  code: string;
  name: string;
  currency: 'CNY';
  openingBalanceMinor: number;
  openingBalanceDate: string;
  createdAt: Date;
  updatedAt: Date;
}

const accountSchema = createSchema<AccountDoc>({
  tenantId: { type: String, required: true },
  code: { type: String, required: true },
  name: { type: String, required: true },
  currency: { type: String, required: true, default: 'CNY' },
  openingBalanceMinor: { type: Number, required: true },
  openingBalanceDate: { type: String, required: true },
});

// Unique index per tenant + account code
accountSchema.index({ tenantId: 1, code: 1 }, { unique: true });

export const AccountModel: Model<AccountDoc> =
  mongoose.models.Account || mongoose.model<AccountDoc>('Account', accountSchema, 'accounts');

