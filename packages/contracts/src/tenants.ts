import { z } from 'zod';
import { dateOnlySchema } from './common/dates';
import { nonNegativeMinorSchema } from './common/money';

export const tenantProfileSchema = z.object({
  yearsInOperation: z.number().int().nonnegative().optional(),
  employeeCount: z.number().int().nonnegative().optional(),
  industry: z.string().max(100).optional(),
  monthlyRevenueMinor: nonNegativeMinorSchema.optional(),
  monthlyCardSalesMinor: nonNegativeMinorSchema.optional(),
});
export type TenantProfile = z.infer<typeof tenantProfileSchema>;

export const tenantSettingsDtoSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  reportingCurrency: z.literal('CNY'),
  minimumCashMinor: z.number().int().nonnegative(),
  businessTimezone: z.string(),
  datasetVersion: z.number().int().positive(),
  forecastAsOfDate: dateOnlySchema.optional(),
  overdueAlertDays: z.number().int().positive(),
  concentrationThresholdPct: z.number().int().min(1).max(100),
  staleDataDays: z.number().int().positive(),
  profile: tenantProfileSchema,
  isDemo: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type TenantSettingsDto = z.infer<typeof tenantSettingsDtoSchema>;

export const updateTenantSettingsSchema = z.object({
  minimumCashMinor: nonNegativeMinorSchema.optional(),
  businessTimezone: z.string().min(1).max(50).optional(),
  forecastAsOfDate: dateOnlySchema.nullable().optional(),
  overdueAlertDays: z.number().int().positive().max(365).optional(),
  concentrationThresholdPct: z.number().int().min(1).max(100).optional(),
  staleDataDays: z.number().int().positive().max(365).optional(),
  profile: tenantProfileSchema.optional(),
});
export type UpdateTenantSettingsInput = z.input<typeof updateTenantSettingsSchema>;
