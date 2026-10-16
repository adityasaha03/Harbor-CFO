import mongoose, { type Model } from "mongoose";
import type {
  ActionType,
  ProposalSource,
  ProposalStatus,
  CommitmentStatus,
  CanonicalPayload,
  FinancingCommitmentScheduleItem,
} from "@harbor/contracts";
import { createSchema } from "../../core/db/base-schema";

// ---------------------------------------------------------------------------
// 1. Action Proposal Model
// ---------------------------------------------------------------------------

export interface ActionProposalDoc {
  id?: string;
  tenantId: string;
  proposerId: string;
  source: ProposalSource;
  actionType: ActionType;
  canonicalPayload: CanonicalPayload;
  payloadHash: string;
  baseInputVersion: number;
  scenarioId?: string | null;
  status: ProposalStatus;
  expiresAt: Date;
  operationId?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const actionProposalSchema = createSchema<ActionProposalDoc>({
  tenantId: { type: String, required: true },
  proposerId: { type: String, required: true },
  source: { type: String, required: true, enum: ["user", "agent"] },
  actionType: {
    type: String,
    required: true,
    enum: ["sandbox_financing_draw"],
  },
  canonicalPayload: { type: mongoose.Schema.Types.Mixed, required: true },
  payloadHash: { type: String, required: true },
  baseInputVersion: { type: Number, required: true },
  scenarioId: { type: String, default: null },
  status: {
    type: String,
    required: true,
    enum: ["pending", "approved", "executed", "expired", "rejected", "conflict"],
    default: "pending",
  },
  expiresAt: { type: Date, required: true },
  operationId: { type: String, default: null },
});

actionProposalSchema.index({ tenantId: 1, status: 1, createdAt: -1 });

export const ActionProposal: Model<ActionProposalDoc> =
  mongoose.models.ActionProposal ||
  mongoose.model<ActionProposalDoc>("ActionProposal", actionProposalSchema, "actionProposals");

// ---------------------------------------------------------------------------
// 2. Approval Model (Single-use)
// ---------------------------------------------------------------------------

export interface ApprovalDoc {
  id?: string;
  tenantId: string;
  proposalId: string;
  approverId: string;
  approverRole: string;
  payloadHash: string;
  expiresAt: Date;
  consumedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const approvalSchema = createSchema<ApprovalDoc>({
  tenantId: { type: String, required: true },
  proposalId: { type: String, required: true },
  approverId: { type: String, required: true },
  approverRole: { type: String, required: true },
  payloadHash: { type: String, required: true },
  expiresAt: { type: Date, required: true },
  consumedAt: { type: Date, default: null },
});

// Single active unconsumed approval per proposal
approvalSchema.index(
  { proposalId: 1 },
  { unique: true, partialFilterExpression: { consumedAt: null } },
);
approvalSchema.index({ tenantId: 1, createdAt: -1 });

export const Approval: Model<ApprovalDoc> =
  mongoose.models.Approval ||
  mongoose.model<ApprovalDoc>("Approval", approvalSchema, "approvals");

// ---------------------------------------------------------------------------
// 3. Sandbox Operation Model (Idempotency + Evidence)
// ---------------------------------------------------------------------------

export interface SandboxOperationDoc {
  id?: string;
  tenantId: string;
  operationId: string;
  proposalId: string;
  approvalId: string;
  idempotencyKey: string;
  payloadHash: string;
  type: ActionType;
  inputVersion: number;
  outputVersion: number;
  ledgerEntryIds: string[];
  commitmentId: string;
  forecastBeforeId?: string | null;
  forecastAfterId?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const sandboxOperationSchema = createSchema<SandboxOperationDoc>({
  tenantId: { type: String, required: true },
  operationId: { type: String, required: true, unique: true },
  proposalId: { type: String, required: true },
  approvalId: { type: String, required: true },
  idempotencyKey: { type: String, required: true },
  payloadHash: { type: String, required: true },
  type: {
    type: String,
    required: true,
    enum: ["sandbox_financing_draw"],
  },
  inputVersion: { type: Number, required: true },
  outputVersion: { type: Number, required: true },
  ledgerEntryIds: { type: [String], required: true },
  commitmentId: { type: String, required: true },
  forecastBeforeId: { type: String, default: null },
  forecastAfterId: { type: String, default: null },
});

sandboxOperationSchema.index({ tenantId: 1, idempotencyKey: 1 }, { unique: true });

export const SandboxOperation: Model<SandboxOperationDoc> =
  mongoose.models.SandboxOperation ||
  mongoose.model<SandboxOperationDoc>(
    "SandboxOperation",
    sandboxOperationSchema,
    "sandboxOperations",
  );

// ---------------------------------------------------------------------------
// 4. Financing Commitment Model (Future Obligations)
// ---------------------------------------------------------------------------

export interface FinancingCommitmentDoc {
  id?: string;
  tenantId: string;
  operationId: string;
  offerCode: string;
  offerVersion: number;
  principalMinor: number;
  upfrontFeeMinor: number;
  interestMinor: number;
  fundedOn: string;
  schedule: FinancingCommitmentScheduleItem[];
  status: CommitmentStatus;
  createdAt: Date;
  updatedAt: Date;
}

const commitmentScheduleItemSchema = new mongoose.Schema(
  {
    dueOn: { type: String, required: true },
    amountMinor: { type: Number, required: true },
    paidOn: { type: String, default: null },
  },
  { _id: false },
);

const financingCommitmentSchema = createSchema<FinancingCommitmentDoc>({
  tenantId: { type: String, required: true },
  operationId: { type: String, required: true },
  offerCode: { type: String, required: true },
  offerVersion: { type: Number, required: true },
  principalMinor: { type: Number, required: true },
  upfrontFeeMinor: { type: Number, required: true },
  interestMinor: { type: Number, required: true },
  fundedOn: { type: String, required: true },
  schedule: { type: [commitmentScheduleItemSchema], required: true },
  status: {
    type: String,
    required: true,
    enum: ["active", "closed"],
    default: "active",
  },
});

financingCommitmentSchema.index({ tenantId: 1, status: 1 });

export const FinancingCommitment: Model<FinancingCommitmentDoc> =
  mongoose.models.FinancingCommitment ||
  mongoose.model<FinancingCommitmentDoc>(
    "FinancingCommitment",
    financingCommitmentSchema,
    "financingCommitments",
  );
