import { z } from 'zod';
import { dateOnlySchema } from './common/dates';
import { minorSchema } from './common/money';

// ---------------------------------------------------------------------------
// Flow source — provenance for a single cash flow
// ---------------------------------------------------------------------------

export const FLOW_SOURCE_TYPES = ['invoice', 'commitment', 'financing', 'ledger'] as const;
export const flowSourceTypeSchema = z.enum(FLOW_SOURCE_TYPES);
export type FlowSourceType = z.infer<typeof flowSourceTypeSchema>;

export const flowSourceSchema = z.object({
  type: flowSourceTypeSchema,
  id: z.string().min(1),
  label: z.string(),
  amountMinor: minorSchema,
});

export type FlowSource = z.infer<typeof flowSourceSchema>;

// ---------------------------------------------------------------------------
// Forecast point — one day in the forecast
// ---------------------------------------------------------------------------

export const forecastPointSchema = z.object({
  date: dateOnlySchema,
  closingMinor: minorSchema,
  receiptsMinor: minorSchema,
  paymentsMinor: minorSchema,
  financingMinor: minorSchema,
  feesMinor: minorSchema,
  repaymentsMinor: minorSchema,
  sources: z.array(flowSourceSchema),
});

export type ForecastPoint = z.infer<typeof forecastPointSchema>;

// ---------------------------------------------------------------------------
// Forecast summary — key metrics derived from the points
// ---------------------------------------------------------------------------

export const forecastSummarySchema = z.object({
  minCashMinor: minorSchema,
  minCashDate: dateOnlySchema,
  firstBelowFloorDate: dateOnlySchema.nullable(),
  firstNegativeDate: dateOnlySchema.nullable(),
  liquidityGapMinor: minorSchema,
});

export type ForecastSummary = z.infer<typeof forecastSummarySchema>;

// ---------------------------------------------------------------------------
// Weekly bucket — 7-day aggregation
// ---------------------------------------------------------------------------

export const weeklyBucketSchema = z.object({
  startDate: dateOnlySchema,
  endDate: dateOnlySchema,
  closingMinor: minorSchema,
  minMinor: minorSchema,
  receiptsMinor: minorSchema,
  paymentsMinor: minorSchema,
  financingMinor: minorSchema,
  feesMinor: minorSchema,
  repaymentsMinor: minorSchema,
});

export type WeeklyBucket = z.infer<typeof weeklyBucketSchema>;

// ---------------------------------------------------------------------------
// Forecast input — everything the engine needs
// ---------------------------------------------------------------------------

export const forecastInvoiceSchema = z.object({
  externalId: z.string().min(1),
  direction: z.enum(['AR', 'AP']),
  outstandingMinor: minorSchema,
  dueOn: dateOnlySchema,
  expectedSettlementOn: dateOnlySchema,
  counterpartyExternalId: z.string().min(1),
});

export type ForecastInvoice = z.infer<typeof forecastInvoiceSchema>;

export const COMMITMENT_FREQUENCIES = ['once', 'weekly', 'biweekly', 'monthly'] as const;
export const commitmentFrequencySchema = z.enum(COMMITMENT_FREQUENCIES);
export type CommitmentFrequency = z.infer<typeof commitmentFrequencySchema>;

export const forecastCommitmentSchema = z.object({
  id: z.string().min(1),
  label: z.string(),
  direction: z.enum(['inflow', 'outflow']),
  amountMinor: z.number().int().positive(),
  frequency: commitmentFrequencySchema,
  anchorOn: dateOnlySchema,
  endOn: dateOnlySchema.optional(),
});

export type ForecastCommitment = z.infer<typeof forecastCommitmentSchema>;

export const forecastFinancingFlowSchema = z.object({
  on: dateOnlySchema,
  amountMinor: z.number().int().positive(),
  kind: z.enum(['draw', 'fee', 'repayment']),
});

export type ForecastFinancingFlow = z.infer<typeof forecastFinancingFlowSchema>;

export const forecastFinancingSchema = z.object({
  id: z.string().min(1),
  label: z.string(),
  flows: z.array(forecastFinancingFlowSchema),
});

export type ForecastFinancing = z.infer<typeof forecastFinancingSchema>;

export const forecastScheduledLedgerSchema = z.object({
  id: z.string().min(1),
  label: z.string(),
  on: dateOnlySchema,
  amountMinor: minorSchema,
});

export type ForecastScheduledLedger = z.infer<typeof forecastScheduledLedgerSchema>;

export const forecastInputSchema = z.object({
  asOfDate: dateOnlySchema,
  openingCashMinor: minorSchema,
  floorMinor: minorSchema,
  horizonDays: z.number().int().positive(),
  invoices: z.array(forecastInvoiceSchema),
  commitments: z.array(forecastCommitmentSchema),
  financing: z.array(forecastFinancingSchema),
  scheduledLedger: z.array(forecastScheduledLedgerSchema),
});

export type ForecastInput = z.infer<typeof forecastInputSchema>;

// ---------------------------------------------------------------------------
// Forecast result — full output of the engine
// ---------------------------------------------------------------------------

export const forecastResultSchema = z.object({
  points: z.array(forecastPointSchema),
  summary: forecastSummarySchema,
});

export type ForecastResult = z.infer<typeof forecastResultSchema>;

// ---------------------------------------------------------------------------
// Forecast run DTO and API schemas
// ---------------------------------------------------------------------------

export const forecastSummaryWithConservativeSchema = forecastSummarySchema.extend({
  conservativeMinCashMinor: minorSchema.optional(),
});

export type ForecastSummaryWithConservative = z.infer<
  typeof forecastSummaryWithConservativeSchema
>;

export const forecastRunDtoSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  inputVersion: z.number().int(),
  algorithmVersion: z.string(),
  scenarioHash: z.string(),
  scenarioId: z.string().optional(),
  asOfDate: dateOnlySchema,
  horizonDays: z.number().int(),
  floorMinor: minorSchema,
  openingCashMinor: minorSchema,
  points: z.array(forecastPointSchema),
  summary: forecastSummaryWithConservativeSchema,
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type ForecastRunDto = z.infer<typeof forecastRunDtoSchema>;

export const latestForecastResponseSchema = z.object({
  run: forecastRunDtoSchema,
  weeklyBuckets: z.array(weeklyBucketSchema),
  asOfDate: dateOnlySchema,
  horizonDays: z.number().int(),
  assumptions: z.array(z.string()),
  inputVersion: z.number().int(),
  isStale: z.boolean(),
});

export type LatestForecastResponse = z.infer<typeof latestForecastResponseSchema>;

export const forecastDayDrilldownResponseSchema = z.object({
  date: dateOnlySchema,
  closingMinor: minorSchema,
  receiptsMinor: minorSchema,
  paymentsMinor: minorSchema,
  financingMinor: minorSchema,
  feesMinor: minorSchema,
  repaymentsMinor: minorSchema,
  sources: z.array(flowSourceSchema),
  invoices: z.array(z.record(z.unknown())),
  commitments: z.array(z.record(z.unknown())),
});

export type ForecastDayDrilldownResponse = z.infer<
  typeof forecastDayDrilldownResponseSchema
>;

export const forecastIdParamSchema = z.object({
  id: z.string().min(1),
});

export type ForecastIdParam = z.infer<typeof forecastIdParamSchema>;

export const forecastDayParamSchema = z.object({
  date: dateOnlySchema,
});

export type ForecastDayParam = z.infer<typeof forecastDayParamSchema>;

