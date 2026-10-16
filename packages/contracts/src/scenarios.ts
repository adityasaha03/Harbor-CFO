import { z } from 'zod';
import { dateOnlySchema } from './common/dates';
import { minorSchema } from './common/money';
import { commitmentFrequencySchema, forecastSummaryWithConservativeSchema } from './forecast';

// ---------------------------------------------------------------------------
// Typed Scenario Changes (Discriminated Union on `type`)
// ---------------------------------------------------------------------------

export const moveReceiptChangeSchema = z.object({
  type: z.literal('move_receipt'),
  invoiceExternalId: z.string().min(1),
  newExpectedSettlementOn: dateOnlySchema,
});
export type MoveReceiptChange = z.infer<typeof moveReceiptChangeSchema>;

export const addFinancingChangeSchema = z.object({
  type: z.literal('add_financing'),
  offerCode: z.string().min(1),
  principalMinor: z.number().int().positive(),
  fundingOn: dateOnlySchema.optional(),
});
export type AddFinancingChange = z.infer<typeof addFinancingChangeSchema>;

export const addRecurringChangeSchema = z.object({
  type: z.literal('add_recurring'),
  label: z.string().min(1),
  direction: z.enum(['inflow', 'outflow']),
  amountMinor: z.number().int().positive(),
  frequency: commitmentFrequencySchema,
  startOn: dateOnlySchema,
});
export type AddRecurringChange = z.infer<typeof addRecurringChangeSchema>;

export const deferPaymentChangeSchema = z.object({
  type: z.literal('defer_payment'),
  invoiceExternalId: z.string().min(1),
  newExpectedSettlementOn: dateOnlySchema,
  assumption: z.string().min(1).max(300),
});
export type DeferPaymentChange = z.infer<typeof deferPaymentChangeSchema>;

export const delayCustomerReceiptsChangeSchema = z.object({
  type: z.literal('delay_customer_receipts'),
  counterpartyExternalId: z.string().min(1),
  days: z.number().int().positive(),
});
export type DelayCustomerReceiptsChange = z.infer<typeof delayCustomerReceiptsChangeSchema>;

export const scenarioChangeSchema = z.discriminatedUnion('type', [
  moveReceiptChangeSchema,
  addFinancingChangeSchema,
  addRecurringChangeSchema,
  deferPaymentChangeSchema,
  delayCustomerReceiptsChangeSchema,
]);
export type ScenarioChange = z.infer<typeof scenarioChangeSchema>;

// ---------------------------------------------------------------------------
// Inputs
// ---------------------------------------------------------------------------

export const createScenarioInputSchema = z.object({
  name: z.string().min(1).max(100),
  changes: z.array(scenarioChangeSchema).min(1),
});
export type CreateScenarioInput = z.infer<typeof createScenarioInputSchema>;

export const scenarioIdParamSchema = z.object({
  id: z.string().min(1),
});
export type ScenarioIdParam = z.infer<typeof scenarioIdParamSchema>;

// ---------------------------------------------------------------------------
// Comparison DTO Components
// ---------------------------------------------------------------------------

export const repaymentWarningSchema = z.object({
  date: dateOnlySchema,
  type: z.enum(['floor_breach', 'negative_cash']),
  closingMinor: minorSchema,
  message: z.string(),
});
export type RepaymentWarning = z.infer<typeof repaymentWarningSchema>;

export const scenarioFinancingComparisonSchema = z.object({
  principalMinor: minorSchema,
  principal: minorSchema.optional(),
  netProceedsMinor: minorSchema,
  netProceeds: minorSchema.optional(),
  totalCostMinor: minorSchema,
  totalCost: minorSchema.optional(),
  repaymentsTotalMinor: minorSchema,
  repaymentsTotal: minorSchema.optional(),
  repaymentWarnings: z.array(repaymentWarningSchema),
});
export type ScenarioFinancingComparison = z.infer<typeof scenarioFinancingComparisonSchema>;

export const scenarioCashAtDaySchema = z.object({
  day: z.number().int(),
  date: dateOnlySchema,
  baselineClosingMinor: minorSchema,
  scenarioClosingMinor: minorSchema,
  deltaMinor: minorSchema,
});
export type ScenarioCashAtDay = z.infer<typeof scenarioCashAtDaySchema>;

export const scenarioDeltasSchema = z.object({
  minCashMinor: minorSchema,
  day21CashMinor: minorSchema,
  liquidityGapMinor: minorSchema,
  gapMinor: minorSchema.optional(),
});
export type ScenarioDeltas = z.infer<typeof scenarioDeltasSchema>;

export const scenarioChangedDatesSchema = z.object({
  firstBelowFloorDate: dateOnlySchema.nullable(),
  firstNegativeDate: dateOnlySchema.nullable(),
  minCashDate: dateOnlySchema,
  firstBelowFloorChanged: z.boolean(),
  firstNegativeChanged: z.boolean(),
  minCashDateChanged: z.boolean(),
});
export type ScenarioChangedDates = z.infer<typeof scenarioChangedDatesSchema>;

export const scenarioChartPointSchema = z.object({
  date: dateOnlySchema,
  dayIndex: z.number().int(),
  baselineClosingMinor: minorSchema,
  scenarioClosingMinor: minorSchema,
  floorMinor: minorSchema,
});
export type ScenarioChartPoint = z.infer<typeof scenarioChartPointSchema>;

export const scenarioComparisonSchema = z.object({
  baselineSummary: forecastSummaryWithConservativeSchema,
  scenarioSummary: forecastSummaryWithConservativeSchema,
  cashAtDays: z.array(scenarioCashAtDaySchema),
  deltas: scenarioDeltasSchema,
  changedDates: scenarioChangedDatesSchema,
  financing: scenarioFinancingComparisonSchema,
  anyNegativeCash: z.boolean(),
  points: z.array(scenarioChartPointSchema),
});
export type ScenarioComparison = z.infer<typeof scenarioComparisonSchema>;

// ---------------------------------------------------------------------------
// Scenario DTO & Responses
// ---------------------------------------------------------------------------

export const scenarioDtoSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  name: z.string(),
  baseInputVersion: z.number().int(),
  changes: z.array(scenarioChangeSchema),
  scenarioHash: z.string(),
  forecastRunId: z.string().nullable().optional(),
  comparison: scenarioComparisonSchema,
  isStale: z.boolean(),
  createdBy: z.string(),
  expiresAt: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type ScenarioDto = z.infer<typeof scenarioDtoSchema>;

export const createScenarioResponseSchema = scenarioComparisonSchema.extend({
  scenario: scenarioDtoSchema,
  scenarioId: z.string(),
  isStale: z.boolean(),
});
export type CreateScenarioResponse = z.infer<typeof createScenarioResponseSchema>;
