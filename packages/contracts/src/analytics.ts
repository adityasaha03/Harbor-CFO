import { z } from 'zod';
import { minorSchema } from './common/money';

export const agingBucketSchema = z.object({
  currentMinor: minorSchema,
  days1to30Minor: minorSchema,
  days31to60Minor: minorSchema,
  days61to90Minor: minorSchema,
  daysOver90Minor: minorSchema,
  totalMinor: minorSchema,
});

export type AgingBucket = z.infer<typeof agingBucketSchema>;

export const customerConcentrationSchema = z.object({
  topCustomerExternalId: z.string(),
  topCustomerName: z.string(),
  topCustomerArMinor: minorSchema,
  totalArMinor: minorSchema,
  shareBps: z.number().int().min(0).max(10000), // Basis points (6670 = 66.7%)
  thresholdBps: z.number().int().default(4000), // 40% threshold
  isExceeded: z.boolean(),
});

export type CustomerConcentration = z.infer<typeof customerConcentrationSchema>;

export const analyticsSummarySchema = z.object({
  arAging: agingBucketSchema,
  apAging: agingBucketSchema,
  concentration: customerConcentrationSchema,
  monthlyBurnMinor: minorSchema,
  runwayDays: z.number().int().nullable(),
  dsoDays: z.number().int().optional(),
  lastImportAt: z.string().nullable().optional(),
});

export type AnalyticsSummary = z.infer<typeof analyticsSummarySchema>;
