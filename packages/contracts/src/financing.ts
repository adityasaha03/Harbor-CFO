import { z } from 'zod';
import { dateOnlySchema } from './common/dates';
import { nonNegativeMinorSchema, positiveMinorSchema } from './common/money';

// ---------------------------------------------------------------------------
// Financing enums and types
// ---------------------------------------------------------------------------

export const FINANCING_TYPES = [
  'revolving_credit',
  'bridge_loan',
  'invoice_finance',
  'equipment_finance',
  'merchant_advance',
  'term_loan',
] as const;
export const financingTypeSchema = z.enum(FINANCING_TYPES);
export type FinancingType = (typeof FINANCING_TYPES)[number];

export const FINANCING_PURPOSES = ['working_capital', 'bridge', 'equipment'] as const;
export const financingPurposeSchema = z.enum(FINANCING_PURPOSES);
export type FinancingPurpose = (typeof FINANCING_PURPOSES)[number];

export const DYNAMIC_CAP_TYPES = ['none', 'ar_advance_80pct'] as const;
export const dynamicCapTypeSchema = z.enum(DYNAMIC_CAP_TYPES);
export type DynamicCapType = (typeof DYNAMIC_CAP_TYPES)[number];

// ---------------------------------------------------------------------------
// Financing Offer Catalog Schema
// ---------------------------------------------------------------------------

export const offerInstallmentsSchema = z.object({
  count: z.number().int().positive(),
  firstDueAfterFundingDays: z.number().int().nonnegative(),
  intervalDays: z.number().int().nonnegative(),
});
export type OfferInstallments = z.infer<typeof offerInstallmentsSchema>;

export const financingOfferSchema = z.object({
  code: z.string().min(1),
  version: z.number().int().positive(),
  synthetic: z.literal(true),
  type: financingTypeSchema,
  name: z.string().min(1),
  description: z.string(),
  currency: z.literal('CNY'),
  minAmountMinor: positiveMinorSchema,
  maxAmountMinor: positiveMinorSchema,
  dynamicCap: dynamicCapTypeSchema,
  fundingDelayDays: z.number().int().nonnegative(),
  upfrontFeeBps: z.number().int().nonnegative(),
  flatInterestBps: z.number().int().nonnegative(),
  installments: offerInstallmentsSchema,
  eligiblePurposes: z.array(financingPurposeSchema),
  requiresInvoiceEvidence: z.boolean(),
  requiredProfileFields: z.array(z.string()),
  minYearsInOperation: z.number().int().nonnegative().optional(),
});
export type FinancingOffer = z.infer<typeof financingOfferSchema>;

// ---------------------------------------------------------------------------
// Repayment Schedule & Terms
// ---------------------------------------------------------------------------

export const repaymentScheduleItemSchema = z.object({
  installmentIndex: z.number().int().positive(),
  dueOn: dateOnlySchema,
  amountMinor: positiveMinorSchema,
});
export type RepaymentScheduleItem = z.infer<typeof repaymentScheduleItemSchema>;

export const financingScheduleSchema = z.object({
  principalMinor: positiveMinorSchema,
  fundingOn: dateOnlySchema,
  upfrontFeeMinor: nonNegativeMinorSchema,
  interestMinor: nonNegativeMinorSchema,
  totalRepaymentMinor: positiveMinorSchema,
  netProceedsMinor: nonNegativeMinorSchema,
  totalCostMinor: nonNegativeMinorSchema,
  installments: z.array(repaymentScheduleItemSchema),
});
export type FinancingSchedule = z.infer<typeof financingScheduleSchema>;

// ---------------------------------------------------------------------------
// Eligibility & Reasons
// ---------------------------------------------------------------------------

export const ELIGIBILITY_STATUSES = ['eligible', 'ineligible', 'cannot_assess'] as const;
export const eligibilityStatusSchema = z.enum(ELIGIBILITY_STATUSES);
export type EligibilityStatus = (typeof ELIGIBILITY_STATUSES)[number];

export const eligibilityReasonSchema = z.object({
  code: z.string(),
  explanation: z.string(),
});
export type EligibilityReason = z.infer<typeof eligibilityReasonSchema>;

// ---------------------------------------------------------------------------
// Scoring & Ranking
// ---------------------------------------------------------------------------

export const scoringBreakdownSchema = z.object({
  gapCoverage: z.number().min(0).max(1),
  timeliness: z.number().min(0).max(1),
  repaymentResilience: z.number().min(0).max(1),
  costEfficiency: z.number().min(0).max(1),
  totalScore: z.number().min(0).max(1),
});
export type FinancingScoringBreakdown = z.infer<typeof scoringBreakdownSchema>;

export const financingImpactSchema = z.object({
  minCashMinor: z.number().int(),
  firstBelowFloorDate: dateOnlySchema.nullable(),
  firstNegativeDate: dateOnlySchema.nullable(),
  anyNegativeCash: z.boolean(),
  cashAtDay21Minor: z.number().int(),
  cashAtBreachDateMinor: z.number().int(),
});
export type FinancingImpact = z.infer<typeof financingImpactSchema>;

export const rankedFinancingOfferSchema = z.object({
  offer: financingOfferSchema,
  suggestedPrincipalMinor: positiveMinorSchema,
  schedule: financingScheduleSchema,
  impact: financingImpactSchema,
  score: z.number().min(0).max(1),
  scoringBreakdown: scoringBreakdownSchema,
  warnings: z.array(z.string()),
});
export type RankedFinancingOffer = z.infer<typeof rankedFinancingOfferSchema>;

// ---------------------------------------------------------------------------
// Match Request / Response Schemas
// ---------------------------------------------------------------------------

export const financingMatchQuerySchema = z.object({
  desiredAmountMinor: positiveMinorSchema.optional(),
  purpose: financingPurposeSchema,
});
export type FinancingMatchInput = z.infer<typeof financingMatchQuerySchema>;

export const excludedOfferSchema = z.object({
  offer: financingOfferSchema,
  reasons: z.array(eligibilityReasonSchema),
});
export type ExcludedOffer = z.infer<typeof excludedOfferSchema>;

export const cannotAssessOfferSchema = z.object({
  offer: financingOfferSchema,
  missing: z.array(z.string()),
});
export type CannotAssessOffer = z.infer<typeof cannotAssessOfferSchema>;

export const financingMatchResponseSchema = z.object({
  requiredGapMinor: nonNegativeMinorSchema,
  breachDate: dateOnlySchema.nullable(),
  eligible: z.array(rankedFinancingOfferSchema),
  excluded: z.array(excludedOfferSchema),
  cannotAssess: z.array(cannotAssessOfferSchema),
  reason: z.literal('NO_GAP').optional(),
});
export type FinancingMatchResponse = z.infer<typeof financingMatchResponseSchema>;
