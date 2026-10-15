import mongoose, { type Model } from 'mongoose';
import { createSchema } from '../../core/db/base-schema';

export interface TenantSettingsDoc {
  id?: string;
  tenantId: string;
  reportingCurrency: 'CNY';
  minimumCashMinor: number;
  businessTimezone: string;
  datasetVersion: number;
  forecastAsOfDate?: string;
  overdueAlertDays: number;
  concentrationThresholdPct: number;
  staleDataDays: number;
  profile: {
    yearsInOperation?: number;
    employeeCount?: number;
    industry?: string;
    monthlyRevenueMinor?: number;
    monthlyCardSalesMinor?: number;
  };
  isDemo: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const tenantSettingsSchema = createSchema<TenantSettingsDoc>({
  tenantId: { type: String, required: true },
  reportingCurrency: { type: String, required: true, default: 'CNY' },
  minimumCashMinor: { type: Number, required: true, default: 0 },
  businessTimezone: { type: String, required: true, default: 'Asia/Shanghai' },
  datasetVersion: { type: Number, required: true, default: 1 },
  forecastAsOfDate: { type: String, required: false },
  overdueAlertDays: { type: Number, required: true, default: 7 },
  concentrationThresholdPct: { type: Number, required: true, default: 40 },
  staleDataDays: { type: Number, required: true, default: 14 },
  profile: {
    yearsInOperation: { type: Number, required: false },
    employeeCount: { type: Number, required: false },
    industry: { type: String, required: false },
    monthlyRevenueMinor: { type: Number, required: false },
    monthlyCardSalesMinor: { type: Number, required: false },
  },
  isDemo: { type: Boolean, required: true, default: false },
});

tenantSettingsSchema.index({ tenantId: 1 }, { unique: true });

export const TenantSettingsModel: Model<TenantSettingsDoc> =
  mongoose.models.TenantSettings ||
  mongoose.model<TenantSettingsDoc>('TenantSettings', tenantSettingsSchema, 'tenantSettings');

