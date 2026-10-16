import { z } from 'zod';
import { dateOnlySchema } from './common/dates';
import { minorSchema } from './common/money';

// ---------------------------------------------------------------------------
// Aging schedule
// ---------------------------------------------------------------------------

export const agingBucketItemSchema = z.object({
  amountMinor: minorSchema,
  count: z.number().int().nonnegative(),
});
export type AgingBucketItem = z.infer<typeof agingBucketItemSchema>;

export const agingScheduleSchema = z.object({
  // Pure engine structured buckets
  notYetDue: agingBucketItemSchema.optional(),
  overdue1to30: agingBucketItemSchema.optional(),
  overdue31to60: agingBucketItemSchema.optional(),
  overdue61plus: agingBucketItemSchema.optional(),
  total: agingBucketItemSchema.optional(),
  // Flat fields for dashboard web display compatibility
  currentMinor: minorSchema,
  days1to30Minor: minorSchema,
  days31to60Minor: minorSchema,
  days61to90Minor: minorSchema,
  daysOver90Minor: minorSchema,
  totalMinor: minorSchema,
});
export type AgingSchedule = z.infer<typeof agingScheduleSchema>;
export type AgingBucket = AgingSchedule;
export const agingBucketSchema = agingScheduleSchema;

// ---------------------------------------------------------------------------
// Customer concentration
// ---------------------------------------------------------------------------

export const counterpartyConcentrationSchema = z.object({
  counterpartyExternalId: z.string(),
  counterpartyName: z.string(),
  outstandingMinor: minorSchema,
  sharePct: z.number(), // e.g. 66.7
});
export type CounterpartyConcentration = z.infer<typeof counterpartyConcentrationSchema>;

export const customerConcentrationResultSchema = z.object({
  totalOutstandingMinor: minorSchema.optional(),
  isApplicable: z.boolean().optional(),
  customers: z.array(counterpartyConcentrationSchema).optional(),
  topCustomer: counterpartyConcentrationSchema.nullable().optional(),
  // Dashboard web compatibility fields:
  topCustomerExternalId: z.string(),
  topCustomerName: z.string(),
  topCustomerArMinor: minorSchema,
  totalArMinor: minorSchema,
  shareBps: z.number().int().min(0).max(10000),
  thresholdBps: z.number().int().default(4000),
  isExceeded: z.boolean(),
});
export type CustomerConcentrationResult = z.infer<typeof customerConcentrationResultSchema>;
export type CustomerConcentration = CustomerConcentrationResult;
export const customerConcentrationSchema = customerConcentrationResultSchema;

// ---------------------------------------------------------------------------
// Burn & runway
// ---------------------------------------------------------------------------

export const burnStatusReasonSchema = z.enum(['INSUFFICIENT_HISTORY', 'NOT_BURNING']);
export type BurnStatusReason = z.infer<typeof burnStatusReasonSchema>;

export const burnResultSchema = z.object({
  historyDays: z.number().int().nonnegative(),
  netOperatingMovementMinor: minorSchema,
  monthlyBurnMinor: minorSchema.nullable(),
  reason: burnStatusReasonSchema.optional(),
  roughRunwayMonths: z.number().nullable(),
  isRoughEstimate: z.literal(true),
});
export type BurnResult = z.infer<typeof burnResultSchema>;

// ---------------------------------------------------------------------------
// Collection quality
// ---------------------------------------------------------------------------

export const collectionQualityResultSchema = z.object({
  onTimeSharePct: z.number(),
  sampleCount: z.number().int().nonnegative(),
  excludedCount: z.number().int().nonnegative(),
  onTimeCount: z.number().int().nonnegative(),
  lateCount: z.number().int().nonnegative(),
});
export type CollectionQualityResult = z.infer<typeof collectionQualityResultSchema>;

// ---------------------------------------------------------------------------
// Data completeness
// ---------------------------------------------------------------------------

export const dataCompletenessSchema = z.object({
  lastImportAt: z.string().nullable(),
  invoiceCount: z.number().int().nonnegative(),
  ledgerCount: z.number().int().nonnegative(),
  warnings: z.array(z.string()),
});
export type DataCompleteness = z.infer<typeof dataCompletenessSchema>;

// ---------------------------------------------------------------------------
// Analytics summary response
// ---------------------------------------------------------------------------

export const analyticsSummarySchema = z.object({
  asOf: dateOnlySchema.optional(),
  currentCashMinor: minorSchema.optional(),
  floorMinor: minorSchema.optional(),
  aging: z
    .object({
      ar: agingScheduleSchema,
      ap: agingScheduleSchema,
    })
    .optional(),
  concentration: customerConcentrationResultSchema,
  burn: burnResultSchema.optional(),
  collectionQuality: collectionQualityResultSchema.optional(),
  dataCompleteness: dataCompletenessSchema.optional(),
  // Dashboard web compatibility aliases:
  arAging: agingScheduleSchema,
  apAging: agingScheduleSchema,
  monthlyBurnMinor: minorSchema,
  runwayDays: z.number().int().nullable(),
  dsoDays: z.number().int().optional(),
  lastImportAt: z.string().nullable().optional(),
});
export type AnalyticsSummary = z.infer<typeof analyticsSummarySchema>;

export type CompleteAnalyticsSummary = AnalyticsSummary & {
  asOf: string;
  currentCashMinor: number;
  floorMinor: number;
  aging: {
    ar: Required<AgingSchedule>;
    ap: Required<AgingSchedule>;
  };
  concentration: Required<CustomerConcentrationResult>;
  burn: BurnResult;
  collectionQuality: CollectionQualityResult;
  dataCompleteness: DataCompleteness;
};

// ---------------------------------------------------------------------------
// Health Score (B19 P1)
// ---------------------------------------------------------------------------

export const healthScoreComponentsSchema = z.object({
  liquidity: z.number().min(0).max(1),
  receivables: z.number().min(0).max(1),
  concentration: z.number().min(0).max(1),
  freshness: z.number().min(0).max(1),
});
export type HealthScoreComponents = z.infer<typeof healthScoreComponentsSchema>;

export const healthScoreDeductionsSchema = z.object({
  liquidity: z.number().nonnegative(),
  receivables: z.number().nonnegative(),
  concentration: z.number().nonnegative(),
  freshness: z.number().nonnegative(),
});
export type HealthScoreDeductions = z.infer<typeof healthScoreDeductionsSchema>;

export const healthScoreResponseSchema = z.object({
  score: z.number().int().min(0).max(100),
  rating: z.enum(['Excellent', 'Good', 'Fair', 'Poor']),
  components: healthScoreComponentsSchema,
  deductions: healthScoreDeductionsSchema,
  reasons: z.array(z.string()),
  summary: z.string(),
});
export type HealthScoreResponse = z.infer<typeof healthScoreResponseSchema>;
