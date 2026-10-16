import { z } from "zod";
import { dateOnlySchema } from "./common/dates";
import {
  minorSchema,
  positiveMinorSchema,
  nonNegativeMinorSchema,
} from "./common/money";
import { scenarioChangeSchema } from "./scenarios";
import { canonicalPayloadSchema, proposalStatusSchema } from "./actions";

// -----------------------------------------------------------------------------
// Tool Names & Constrained Registry
// -----------------------------------------------------------------------------
export const AGENT_TOOL_NAMES = [
  "getCashPosition",
  "getForecast",
  "getKpis",
  "listOverdueInvoices",
  "matchFinancing",
  "simulateScenario",
  "createActionProposal",
  "getActionStatus",
] as const;

export type AgentToolName = (typeof AGENT_TOOL_NAMES)[number];
export const agentToolNameSchema = z.enum(AGENT_TOOL_NAMES);

// -----------------------------------------------------------------------------
// 1. getCashPosition
// -----------------------------------------------------------------------------
export const getCashPositionInputSchema = z.object({}).strict();
export type GetCashPositionInput = z.infer<typeof getCashPositionInputSchema>;

export const cashAccountItemSchema = z.object({
  code: z.string(),
  maskedName: z.string(),
  balanceMinor: minorSchema,
  balanceFormatted: z.string(),
});
export type CashAccountItem = z.infer<typeof cashAccountItemSchema>;

export const getCashPositionOutputSchema = z.object({
  asOf: dateOnlySchema,
  totalCashMinor: minorSchema,
  totalCashFormatted: z.string(),
  accounts: z.array(cashAccountItemSchema),
  evidenceRefs: z.array(z.string()),
});
export type GetCashPositionOutput = z.infer<typeof getCashPositionOutputSchema>;

// -----------------------------------------------------------------------------
// 2. getForecast
// -----------------------------------------------------------------------------
export const getForecastInputSchema = z
  .object({
    scenarioId: z.string().optional(),
  })
  .strict();
export type GetForecastInput = z.infer<typeof getForecastInputSchema>;

export const getForecastOutputSchema = z.object({
  asOfDate: dateOnlySchema,
  horizonDays: z.number().int(),
  minCashMinor: minorSchema,
  minCashFormatted: z.string(),
  minCashDate: dateOnlySchema,
  liquidityGapMinor: nonNegativeMinorSchema,
  liquidityGapFormatted: z.string(),
  firstBelowFloorDate: dateOnlySchema.nullable(),
  firstNegativeDate: dateOnlySchema.nullable(),
  floorMinor: minorSchema,
  floorFormatted: z.string(),
  scenarioId: z.string().optional(),
  evidenceRefs: z.array(z.string()),
});
export type GetForecastOutput = z.infer<typeof getForecastOutputSchema>;

// -----------------------------------------------------------------------------
// 3. getKpis
// -----------------------------------------------------------------------------
export const getKpisInputSchema = z.object({}).strict();
export type GetKpisInput = z.infer<typeof getKpisInputSchema>;

export const getKpisOutputSchema = z.object({
  asOf: dateOnlySchema,
  currentCashMinor: minorSchema,
  currentCashFormatted: z.string(),
  floorMinor: minorSchema,
  floorFormatted: z.string(),
  arOutstandingMinor: nonNegativeMinorSchema,
  arOutstandingFormatted: z.string(),
  arOverdueMinor: nonNegativeMinorSchema,
  arOverdueFormatted: z.string(),
  apOutstandingMinor: nonNegativeMinorSchema,
  apOutstandingFormatted: z.string(),
  apOverdueMinor: nonNegativeMinorSchema,
  apOverdueFormatted: z.string(),
  monthlyBurnMinor: nonNegativeMinorSchema.nullable(),
  monthlyBurnFormatted: z.string().nullable(),
  roughRunwayMonths: z.number().nullable(),
  collectionOnTimeRatePct: z.number().nullable(),
  evidenceRefs: z.array(z.string()),
});
export type GetKpisOutput = z.infer<typeof getKpisOutputSchema>;

// -----------------------------------------------------------------------------
// 4. listOverdueInvoices
// -----------------------------------------------------------------------------
export const listOverdueInvoicesInputSchema = z
  .object({
    minDays: z.number().int().min(0).optional(),
  })
  .strict();
export type ListOverdueInvoicesInput = z.infer<
  typeof listOverdueInvoicesInputSchema
>;

export const overdueInvoiceItemSchema = z.object({
  externalId: z.string(),
  counterpartyMaskedName: z.string(),
  outstandingMinor: positiveMinorSchema,
  outstandingFormatted: z.string(),
  dueOn: dateOnlySchema,
  daysOverdue: z.number().int().min(0),
  untrustedText: z.string().max(200).optional(),
});
export type OverdueInvoiceItem = z.infer<typeof overdueInvoiceItemSchema>;

export const listOverdueInvoicesOutputSchema = z.object({
  invoices: z.array(overdueInvoiceItemSchema),
  count: z.number().int().min(0),
  totalOverdueMinor: nonNegativeMinorSchema,
  totalOverdueFormatted: z.string(),
  evidenceRefs: z.array(z.string()),
});
export type ListOverdueInvoicesOutput = z.infer<
  typeof listOverdueInvoicesOutputSchema
>;

// -----------------------------------------------------------------------------
// 5. matchFinancing
// -----------------------------------------------------------------------------
export const matchFinancingInputSchema = z
  .object({
    desiredAmountMinor: positiveMinorSchema.optional(),
    purpose: z.string().max(100).optional(),
  })
  .strict();
export type MatchFinancingInput = z.infer<typeof matchFinancingInputSchema>;

export const financingMatchOfferSummarySchema = z.object({
  code: z.string(),
  name: z.string(),
  type: z.string(),
  score: z.number(),
  principalMinor: minorSchema,
  principalFormatted: z.string(),
  totalCostEstimateMinor: minorSchema,
  totalCostFormatted: z.string(),
  cashAtDay21Minor: minorSchema,
  cashAtDay21Formatted: z.string(),
});
export type FinancingMatchOfferSummary = z.infer<
  typeof financingMatchOfferSummarySchema
>;

export const matchFinancingOutputSchema = z.object({
  requiredGapMinor: nonNegativeMinorSchema,
  requiredGapFormatted: z.string(),
  breachDate: dateOnlySchema.nullable(),
  reason: z.string().optional(),
  bestOffer: financingMatchOfferSummarySchema.optional(),
  eligibleOffers: z.array(financingMatchOfferSummarySchema),
  excludedCount: z.number().int().min(0),
  cannotAssessCount: z.number().int().min(0),
  evidenceRefs: z.array(z.string()),
});
export type MatchFinancingOutput = z.infer<typeof matchFinancingOutputSchema>;

// -----------------------------------------------------------------------------
// 6. simulateScenario
// -----------------------------------------------------------------------------
export const simulateScenarioInputSchema = z
  .object({
    changes: z.array(scenarioChangeSchema).min(1).max(20),
  })
  .strict();
export type SimulateScenarioInput = z.infer<typeof simulateScenarioInputSchema>;

export const simulateScenarioOutputSchema = z.object({
  scenarioId: z.string(),
  scenarioHash: z.string(),
  minCashDeltaMinor: minorSchema,
  minCashDeltaFormatted: z.string(),
  solvesGap: z.boolean(),
  baselineMinCashMinor: minorSchema,
  baselineMinCashFormatted: z.string(),
  scenarioMinCashMinor: minorSchema,
  scenarioMinCashFormatted: z.string(),
  evidenceRefs: z.array(z.string()),
});
export type SimulateScenarioOutput = z.infer<
  typeof simulateScenarioOutputSchema
>;

// -----------------------------------------------------------------------------
// 7. createActionProposal
// -----------------------------------------------------------------------------
export const createActionProposalToolInputSchema = z
  .object({
    offerCode: z.string().min(1),
    principalMinor: positiveMinorSchema,
    scenarioId: z.string().optional(),
  })
  .strict();
export type CreateActionProposalToolInput = z.infer<
  typeof createActionProposalToolInputSchema
>;

export const createActionProposalToolOutputSchema = z.object({
  proposalId: z.string(),
  status: proposalStatusSchema,
  payloadHash: z.string(),
  expiresAt: z.string(),
  canonicalPayload: canonicalPayloadSchema,
  principalMinor: minorSchema,
  principalFormatted: z.string(),
  upfrontFeeMinor: minorSchema,
  upfrontFeeFormatted: z.string(),
  evidenceRefs: z.array(z.string()),
});
export type CreateActionProposalToolOutput = z.infer<
  typeof createActionProposalToolOutputSchema
>;

// -----------------------------------------------------------------------------
// 8. getActionStatus
// -----------------------------------------------------------------------------
export const getActionStatusInputSchema = z
  .object({
    proposalId: z.string().min(1),
  })
  .strict();
export type GetActionStatusInput = z.infer<typeof getActionStatusInputSchema>;

export const getActionStatusOutputSchema = z.object({
  proposalId: z.string(),
  status: proposalStatusSchema,
  offerCode: z.string(),
  principalMinor: minorSchema,
  principalFormatted: z.string(),
  payloadHash: z.string(),
  expiresAt: z.string(),
  operationId: z.string().nullable(),
  evidenceRefs: z.array(z.string()),
});
export type GetActionStatusOutput = z.infer<typeof getActionStatusOutputSchema>;

// -----------------------------------------------------------------------------
// Tool Execution & Telemetry Event Shapes
// -----------------------------------------------------------------------------
export const toolStartedEventDataSchema = z.object({
  name: agentToolNameSchema,
  argsSanitized: z.record(z.unknown()),
});
export type ToolStartedEventData = z.infer<typeof toolStartedEventDataSchema>;

export const toolCompletedEventDataSchema = z.object({
  name: agentToolNameSchema,
  durationMs: z.number().int().min(0),
  resultRefs: z.array(z.string()),
});
export type ToolCompletedEventData = z.infer<
  typeof toolCompletedEventDataSchema
>;

export const AGENT_RUN_STATUSES = [
  "running",
  "completed",
  "failed",
  "timeout",
] as const;
export type AgentRunStatus = (typeof AGENT_RUN_STATUSES)[number];
export const agentRunStatusSchema = z.enum(AGENT_RUN_STATUSES);

export const agentToolCallRecordSchema = z.object({
  name: agentToolNameSchema,
  argsSanitized: z.record(z.unknown()),
  status: z.enum(["success", "error"]),
  durationMs: z.number().int().min(0),
  resultRefs: z.array(z.string()),
});
export type AgentToolCallRecord = z.infer<typeof agentToolCallRecordSchema>;

export const agentRunDtoSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  actorId: z.string(),
  mode: z.enum(["live", "replay"]),
  prompt: z.string().max(2000),
  status: agentRunStatusSchema,
  toolCalls: z.array(agentToolCallRecordSchema),
  finalAnswer: z.string().optional(),
  proposalIds: z.array(z.string()).default([]),
  tokenUsage: z
    .object({
      input: z.number().int().min(0),
      output: z.number().int().min(0),
    })
    .optional(),
  fallbackUsed: z.boolean().optional(),
  traceId: z.string(),
  createdAt: z.string(),
  completedAt: z.string().optional(),
});
export type AgentRunDto = z.infer<typeof agentRunDtoSchema>;
