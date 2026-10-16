import { z } from "zod";
import { dateOnlySchema } from "./common/dates";
import { minorSchema } from "./common/money";

// ---------------------------------------------------------------------------
// Enums & Primitive Schemas
// ---------------------------------------------------------------------------

export const actionTypeSchema = z.literal("sandbox_financing_draw");
export type ActionType = z.infer<typeof actionTypeSchema>;

export const proposalSourceSchema = z.enum(["user", "agent"]);
export type ProposalSource = z.infer<typeof proposalSourceSchema>;

export const proposalStatusSchema = z.enum([
  "pending",
  "approved",
  "executed",
  "expired",
  "rejected",
  "conflict",
]);
export type ProposalStatus = z.infer<typeof proposalStatusSchema>;

export const commitmentStatusSchema = z.enum(["active", "closed"]);
export type CommitmentStatus = z.infer<typeof commitmentStatusSchema>;

// ---------------------------------------------------------------------------
// Canonical Payload
// ---------------------------------------------------------------------------

export const canonicalScheduleItemSchema = z.object({
  dueOn: dateOnlySchema,
  amountMinor: minorSchema,
});
export type CanonicalScheduleItem = z.infer<typeof canonicalScheduleItemSchema>;

export const canonicalPayloadSchema = z.object({
  offerCode: z.string().min(1),
  offerVersion: z.number().int().positive(),
  principalMinor: minorSchema,
  fundingOn: dateOnlySchema,
  upfrontFeeMinor: minorSchema,
  interestMinor: minorSchema,
  schedule: z.array(canonicalScheduleItemSchema),
});
export type CanonicalPayload = z.infer<typeof canonicalPayloadSchema>;

// ---------------------------------------------------------------------------
// Request Inputs
// ---------------------------------------------------------------------------

export const createActionProposalInputSchema = z.object({
  actionType: actionTypeSchema,
  offerCode: z.string().min(1),
  principalMinor: z.number().int().positive(),
  scenarioId: z.string().optional(),
});
export type CreateActionProposalInput = z.infer<
  typeof createActionProposalInputSchema
>;

export const approveActionProposalInputSchema = z.object({
  payloadHash: z.string().min(1),
});
export type ApproveActionProposalInput = z.infer<
  typeof approveActionProposalInputSchema
>;

export const rejectActionProposalInputSchema = z.object({
  reason: z.string().max(300).optional(),
});
export type RejectActionProposalInput = z.infer<
  typeof rejectActionProposalInputSchema
>;

export const actionProposalIdParamSchema = z.object({
  id: z.string().min(1),
});
export type ActionProposalIdParam = z.infer<typeof actionProposalIdParamSchema>;

// ---------------------------------------------------------------------------
// DTOs
// ---------------------------------------------------------------------------

export const actionProposalDtoSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  proposerId: z.string(),
  source: proposalSourceSchema,
  actionType: actionTypeSchema,
  canonicalPayload: canonicalPayloadSchema,
  payloadHash: z.string(),
  baseInputVersion: z.number().int(),
  scenarioId: z.string().nullable().optional(),
  status: proposalStatusSchema,
  expiresAt: z.string(),
  operationId: z.string().nullable().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type ActionProposalDto = z.infer<typeof actionProposalDtoSchema>;

export const approvalDtoSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  proposalId: z.string(),
  approverId: z.string(),
  approverRole: z.string(),
  payloadHash: z.string(),
  expiresAt: z.string(),
  consumedAt: z.string().nullable().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type ApprovalDto = z.infer<typeof approvalDtoSchema>;

export const financingCommitmentScheduleItemSchema = z.object({
  dueOn: dateOnlySchema,
  amountMinor: minorSchema,
  paidOn: dateOnlySchema.optional(),
});
export type FinancingCommitmentScheduleItem = z.infer<
  typeof financingCommitmentScheduleItemSchema
>;

export const financingCommitmentDtoSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  operationId: z.string(),
  offerCode: z.string(),
  offerVersion: z.number().int(),
  principalMinor: minorSchema,
  upfrontFeeMinor: minorSchema,
  interestMinor: minorSchema,
  fundedOn: dateOnlySchema,
  schedule: z.array(financingCommitmentScheduleItemSchema),
  status: commitmentStatusSchema,
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type FinancingCommitmentDto = z.infer<
  typeof financingCommitmentDtoSchema
>;

export const sandboxOperationDtoSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  operationId: z.string(),
  proposalId: z.string(),
  approvalId: z.string(),
  idempotencyKey: z.string(),
  payloadHash: z.string(),
  type: actionTypeSchema,
  inputVersion: z.number().int(),
  outputVersion: z.number().int(),
  ledgerEntryIds: z.array(z.string()),
  commitmentId: z.string(),
  forecastBeforeId: z.string().nullable().optional(),
  forecastAfterId: z.string().nullable().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type SandboxOperationDto = z.infer<typeof sandboxOperationDtoSchema>;

export const executeActionProposalResponseSchema = z.object({
  operation: sandboxOperationDtoSchema,
  commitment: financingCommitmentDtoSchema,
  proposal: actionProposalDtoSchema,
});
export type ExecuteActionProposalResponse = z.infer<
  typeof executeActionProposalResponseSchema
>;
