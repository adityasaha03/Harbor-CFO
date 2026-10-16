import type { ClientSession } from "mongoose";
import type {
  ActionProposalDto,
  ApprovalDto,
  SandboxOperationDto,
  FinancingCommitmentDto,
  ProposalStatus,
  CanonicalPayload,
  FinancingCommitmentScheduleItem,
  Role,
} from "@harbor/contracts";
import { roleSchema } from "@harbor/contracts";
import {
  ActionProposal,
  type ActionProposalDoc,
  Approval,
  type ApprovalDoc,
  SandboxOperation,
  type SandboxOperationDoc,
  FinancingCommitment,
  type FinancingCommitmentDoc,
} from "./actions.models";
import { TenantSettingsModel } from "../tenants/tenants.model";
import { getDb } from "../../core/db/mongo";
import { toIdQuery } from "../auth/membership.repository";

function toProposalDto(doc: ActionProposalDoc): ActionProposalDto {
  return {
    id: String(doc.id ?? (doc as { _id?: unknown })._id),
    tenantId: doc.tenantId,
    proposerId: doc.proposerId,
    source: doc.source,
    actionType: doc.actionType,
    canonicalPayload: doc.canonicalPayload,
    payloadHash: doc.payloadHash,
    baseInputVersion: doc.baseInputVersion,
    scenarioId: doc.scenarioId ?? null,
    status: doc.status,
    expiresAt:
      doc.expiresAt instanceof Date
        ? doc.expiresAt.toISOString()
        : String(doc.expiresAt),
    operationId: doc.operationId ?? null,
    createdAt:
      doc.createdAt instanceof Date
        ? doc.createdAt.toISOString()
        : String(doc.createdAt),
    updatedAt:
      doc.updatedAt instanceof Date
        ? doc.updatedAt.toISOString()
        : String(doc.updatedAt),
  };
}

function toApprovalDto(doc: ApprovalDoc): ApprovalDto {
  return {
    id: String(doc.id ?? (doc as { _id?: unknown })._id),
    tenantId: doc.tenantId,
    proposalId: doc.proposalId,
    approverId: doc.approverId,
    approverRole: doc.approverRole,
    payloadHash: doc.payloadHash,
    expiresAt:
      doc.expiresAt instanceof Date
        ? doc.expiresAt.toISOString()
        : String(doc.expiresAt),
    consumedAt: doc.consumedAt
      ? doc.consumedAt instanceof Date
        ? doc.consumedAt.toISOString()
        : String(doc.consumedAt)
      : null,
    createdAt:
      doc.createdAt instanceof Date
        ? doc.createdAt.toISOString()
        : String(doc.createdAt),
    updatedAt:
      doc.updatedAt instanceof Date
        ? doc.updatedAt.toISOString()
        : String(doc.updatedAt),
  };
}

function toOperationDto(doc: SandboxOperationDoc): SandboxOperationDto {
  return {
    id: String(doc.id ?? (doc as { _id?: unknown })._id),
    tenantId: doc.tenantId,
    operationId: doc.operationId,
    proposalId: doc.proposalId,
    approvalId: doc.approvalId,
    idempotencyKey: doc.idempotencyKey,
    payloadHash: doc.payloadHash,
    type: doc.type,
    inputVersion: doc.inputVersion,
    outputVersion: doc.outputVersion,
    ledgerEntryIds: doc.ledgerEntryIds,
    commitmentId: doc.commitmentId,
    forecastBeforeId: doc.forecastBeforeId ?? null,
    forecastAfterId: doc.forecastAfterId ?? null,
    createdAt:
      doc.createdAt instanceof Date
        ? doc.createdAt.toISOString()
        : String(doc.createdAt),
    updatedAt:
      doc.updatedAt instanceof Date
        ? doc.updatedAt.toISOString()
        : String(doc.updatedAt),
  };
}

function toCommitmentDto(doc: FinancingCommitmentDoc): FinancingCommitmentDto {
  return {
    id: String(doc.id ?? (doc as { _id?: unknown })._id),
    tenantId: doc.tenantId,
    operationId: doc.operationId,
    offerCode: doc.offerCode,
    offerVersion: doc.offerVersion,
    principalMinor: doc.principalMinor,
    upfrontFeeMinor: doc.upfrontFeeMinor,
    interestMinor: doc.interestMinor,
    fundedOn: doc.fundedOn,
    schedule: doc.schedule,
    status: doc.status,
    createdAt:
      doc.createdAt instanceof Date
        ? doc.createdAt.toISOString()
        : String(doc.createdAt),
    updatedAt:
      doc.updatedAt instanceof Date
        ? doc.updatedAt.toISOString()
        : String(doc.updatedAt),
  };
}

export const actionsRepository = {
  // -------------------------------------------------------------------------
  // Proposals
  // -------------------------------------------------------------------------
  async createProposal(
    tenantId: string,
    data: {
      proposerId: string;
      source: "user" | "agent";
      actionType: "sandbox_financing_draw";
      canonicalPayload: CanonicalPayload;
      payloadHash: string;
      baseInputVersion: number;
      scenarioId?: string | null;
      status: ProposalStatus;
      expiresAt: Date;
    },
    session?: ClientSession,
  ): Promise<ActionProposalDto> {
    const [doc] = await ActionProposal.create(
      [
        {
          tenantId,
          ...data,
        },
      ],
      { session },
    );
    return toProposalDto(doc as unknown as ActionProposalDoc);
  },

  async findProposalById(
    tenantId: string,
    id: string,
    session?: ClientSession,
  ): Promise<ActionProposalDto | null> {
    const doc = await ActionProposal.findOne({ _id: id, tenantId })
      .session(session ?? null)
      .lean();
    return doc ? toProposalDto(doc as unknown as ActionProposalDoc) : null;
  },

  async listProposals(
    tenantId: string,
    limit = 50,
    session?: ClientSession,
  ): Promise<ActionProposalDto[]> {
    const docs = await ActionProposal.find({ tenantId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .session(session ?? null)
      .lean();
    return docs.map((d) => toProposalDto(d as unknown as ActionProposalDoc));
  },

  async updateProposalStatus(
    tenantId: string,
    id: string,
    status: ProposalStatus,
    operationId?: string | null,
    session?: ClientSession,
  ): Promise<ActionProposalDto | null> {
    const update: Record<string, unknown> = { status };
    if (operationId !== undefined) {
      update.operationId = operationId;
    }

    const doc = await ActionProposal.findOneAndUpdate(
      { _id: id, tenantId },
      { $set: update },
      { new: true, session },
    ).lean();

    return doc ? toProposalDto(doc as unknown as ActionProposalDoc) : null;
  },

  // -------------------------------------------------------------------------
  // Approvals
  // -------------------------------------------------------------------------
  async createApproval(
    tenantId: string,
    data: {
      proposalId: string;
      approverId: string;
      approverRole: string;
      payloadHash: string;
      expiresAt: Date;
    },
    session?: ClientSession,
  ): Promise<ApprovalDto> {
    const [doc] = await Approval.create(
      [
        {
          tenantId,
          ...data,
        },
      ],
      { session },
    );
    return toApprovalDto(doc as unknown as ApprovalDoc);
  },

  async findActiveApprovalByProposal(
    tenantId: string,
    proposalId: string,
    payloadHash: string,
    approverId: string,
    session?: ClientSession,
  ): Promise<ApprovalDto | null> {
    const doc = await Approval.findOne({
      tenantId,
      proposalId,
      payloadHash,
      approverId,
      consumedAt: null,
      expiresAt: { $gt: new Date() },
    })
      .session(session ?? null)
      .lean();
    return doc ? toApprovalDto(doc as unknown as ApprovalDoc) : null;
  },

  async consumeApproval(
    tenantId: string,
    approvalId: string,
    session?: ClientSession,
  ): Promise<boolean> {
    const result = await Approval.updateOne(
      { _id: approvalId, tenantId, consumedAt: null },
      { $set: { consumedAt: new Date() } },
      { session },
    );
    return result.matchedCount > 0;
  },

  // -------------------------------------------------------------------------
  // Operations & CAS
  // -------------------------------------------------------------------------
  async findOperationByIdempotencyKey(
    tenantId: string,
    idempotencyKey: string,
    session?: ClientSession,
  ): Promise<SandboxOperationDto | null> {
    const doc = await SandboxOperation.findOne({ tenantId, idempotencyKey })
      .session(session ?? null)
      .lean();
    return doc ? toOperationDto(doc as unknown as SandboxOperationDoc) : null;
  },

  async compareAndSetDatasetVersion(
    tenantId: string,
    currentVersion: number,
    session: ClientSession,
  ): Promise<boolean> {
    const result = await TenantSettingsModel.updateOne(
      { tenantId, datasetVersion: currentVersion },
      { $inc: { datasetVersion: 1 } },
      { session },
    );
    return result.matchedCount > 0;
  },

  async findMembershipInSession(
    userId: string,
    tenantId: string,
    session?: ClientSession,
  ): Promise<{ role: Role } | null> {
    const db = getDb();
    const member = await db.collection("member").findOne(
      {
        userId: toIdQuery(userId),
        organizationId: toIdQuery(tenantId),
      },
      { session },
    );

    if (!member || typeof member.role !== "string") {
      return null;
    }

    const parsed = roleSchema.safeParse(member.role);
    return parsed.success ? { role: parsed.data } : null;
  },

  async createSandboxOperation(
    tenantId: string,
    data: {
      operationId: string;
      proposalId: string;
      approvalId: string;
      idempotencyKey: string;
      payloadHash: string;
      type: "sandbox_financing_draw";
      inputVersion: number;
      outputVersion: number;
      ledgerEntryIds: string[];
      commitmentId: string;
      forecastBeforeId?: string | null;
      forecastAfterId?: string | null;
    },
    session?: ClientSession,
  ): Promise<SandboxOperationDto> {
    const [doc] = await SandboxOperation.create(
      [
        {
          tenantId,
          ...data,
        },
      ],
      { session },
    );
    return toOperationDto(doc as unknown as SandboxOperationDoc);
  },

  async updateOperationForecastRefs(
    tenantId: string,
    operationId: string,
    forecastBeforeId: string | null,
    forecastAfterId: string | null,
    session?: ClientSession,
  ): Promise<void> {
    await SandboxOperation.updateOne(
      { tenantId, operationId },
      { $set: { forecastBeforeId, forecastAfterId } },
      { session },
    );
  },

  // -------------------------------------------------------------------------
  // Financing Commitments
  // -------------------------------------------------------------------------
  async createFinancingCommitment(
    tenantId: string,
    data: {
      operationId: string;
      offerCode: string;
      offerVersion: number;
      principalMinor: number;
      upfrontFeeMinor: number;
      interestMinor: number;
      fundedOn: string;
      schedule: FinancingCommitmentScheduleItem[];
      status: "active" | "closed";
    },
    session?: ClientSession,
  ): Promise<FinancingCommitmentDto> {
    const [doc] = await FinancingCommitment.create(
      [
        {
          tenantId,
          ...data,
        },
      ],
      { session },
    );
    return toCommitmentDto(doc as unknown as FinancingCommitmentDoc);
  },

  async findCommitmentById(
    tenantId: string,
    id: string,
    session?: ClientSession,
  ): Promise<FinancingCommitmentDto | null> {
    const doc = await FinancingCommitment.findOne({ _id: id, tenantId })
      .session(session ?? null)
      .lean();
    return doc ? toCommitmentDto(doc as unknown as FinancingCommitmentDoc) : null;
  },

  async listActiveCommitmentSchedules(
    tenantId: string,
    session?: ClientSession,
  ): Promise<FinancingCommitmentDto[]> {
    const docs = await FinancingCommitment.find({
      tenantId,
      status: "active",
    })
      .session(session ?? null)
      .lean();
    return docs.map((d) => toCommitmentDto(d as unknown as FinancingCommitmentDoc));
  },
};
