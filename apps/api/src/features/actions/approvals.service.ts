import { randomUUID } from "node:crypto";
import type { ClientSession } from "mongoose";
import type {
  ApprovalDto,
  ActionProposalDto,
  ApproveActionProposalInput,
  RejectActionProposalInput,
} from "@harbor/contracts";
import type { ActorContext } from "../auth/auth.types";
import {
  NotFoundError,
  ForbiddenError,
  ConflictError,
} from "../../core/http/app-error";
import { actionsRepository } from "./actions.repository";
import {
  APPROVAL_EXPIRY_MINUTES,
  AUDIT_ACTIONS,
  AUDIT_REASONS,
} from "./actions.constants";
import { FinancingOfferModel } from "../financing";
import { tenantsRepository } from "../tenants";
import { auditService } from "../audit";

export const approvalsService = {
  /**
   * Approves a pending proposal.
   * Enforces role=owner, verifies payloadHash, current datasetVersion, and catalog offerVersion.
   */
  async approveProposal(
    actor: ActorContext,
    id: string,
    input: ApproveActionProposalInput,
    session?: ClientSession,
  ): Promise<{ approval: ApprovalDto; proposal: ActionProposalDto }> {
    // 1. Role verification
    if (actor.role !== "owner") {
      await auditService.record(
        {
          tenantId: actor.tenantId,
          actorId: actor.userId,
          actorRole: actor.role,
          action: AUDIT_ACTIONS.FINANCING_APPROVE,
          decision: "denied",
          reasonCode: AUDIT_REASONS.NOT_APPROVER,
          resourceRefs: [id],
          traceId: actor.requestId || randomUUID(),
        },
        session,
      );
      throw new ForbiddenError("Only owners can approve action proposals");
    }

    // 2. Fetch proposal
    const proposal = await actionsRepository.findProposalById(
      actor.tenantId,
      id,
      session,
    );
    if (!proposal) {
      throw new NotFoundError(`Action proposal "${id}" not found`);
    }

    // 3. Expiry check
    if (new Date(proposal.expiresAt).getTime() <= Date.now()) {
      await actionsRepository.updateProposalStatus(
        actor.tenantId,
        id,
        "expired",
        null,
        session,
      );
      await auditService.record(
        {
          tenantId: actor.tenantId,
          actorId: actor.userId,
          actorRole: actor.role,
          action: AUDIT_ACTIONS.FINANCING_APPROVE,
          decision: "denied",
          reasonCode: AUDIT_REASONS.EXPIRED,
          resourceRefs: [id],
          payloadHash: proposal.payloadHash,
          traceId: actor.requestId || randomUUID(),
        },
        session,
      );
      throw new ConflictError("Action proposal has expired");
    }

    // 4. Status must be pending
    if (proposal.status !== "pending") {
      throw new ConflictError(
        `Action proposal is not pending approval (status: ${proposal.status})`,
      );
    }

    // 5. Check dataset version staleness
    const tenantSettings = await tenantsRepository.findByTenantId(
      actor.tenantId,
      session,
    );
    if (!tenantSettings) {
      throw new NotFoundError("Tenant settings not found");
    }
    if (proposal.baseInputVersion !== tenantSettings.datasetVersion) {
      await auditService.record(
        {
          tenantId: actor.tenantId,
          actorId: actor.userId,
          actorRole: actor.role,
          action: AUDIT_ACTIONS.FINANCING_APPROVE,
          decision: "denied",
          reasonCode: AUDIT_REASONS.STALE_VERSION,
          resourceRefs: [id],
          payloadHash: proposal.payloadHash,
          beforeVersion: proposal.baseInputVersion,
          afterVersion: tenantSettings.datasetVersion,
          traceId: actor.requestId || randomUUID(),
        },
        session,
      );
      throw new ConflictError(
        `Action proposal is based on stale dataset version ${proposal.baseInputVersion} (current: ${tenantSettings.datasetVersion})`,
      );
    }

    // 6. Check offer version in catalog
    const latestOffer = await FinancingOfferModel.findOne({
      code: proposal.canonicalPayload.offerCode,
    })
      .sort({ version: -1 })
      .session(session ?? null)
      .lean();

    const currentVersion = latestOffer ? latestOffer.version : 1;
    if (currentVersion !== proposal.canonicalPayload.offerVersion) {
      await auditService.record(
        {
          tenantId: actor.tenantId,
          actorId: actor.userId,
          actorRole: actor.role,
          action: AUDIT_ACTIONS.FINANCING_APPROVE,
          decision: "denied",
          reasonCode: AUDIT_REASONS.STALE_VERSION,
          resourceRefs: [id, proposal.canonicalPayload.offerCode],
          payloadHash: proposal.payloadHash,
          traceId: actor.requestId || randomUUID(),
        },
        session,
      );
      throw new ConflictError(
        "Financing offer terms have been updated or offer is no longer valid",
      );
    }

    // 7. Hash comparison
    if (input.payloadHash !== proposal.payloadHash) {
      await auditService.record(
        {
          tenantId: actor.tenantId,
          actorId: actor.userId,
          actorRole: actor.role,
          action: AUDIT_ACTIONS.FINANCING_APPROVE,
          decision: "denied",
          reasonCode: AUDIT_REASONS.HASH_MISMATCH,
          resourceRefs: [id],
          payloadHash: input.payloadHash,
          traceId: actor.requestId || randomUUID(),
        },
        session,
      );
      throw new ConflictError(
        `Payload hash mismatch. Expected ${proposal.payloadHash}, received ${input.payloadHash}`,
      );
    }

    // 8. Create approval record (5 min expiry)
    const expiresAt = new Date(
      Date.now() + APPROVAL_EXPIRY_MINUTES * 60 * 1000,
    );
    const approval = await actionsRepository.createApproval(
      actor.tenantId,
      {
        proposalId: proposal.id,
        approverId: actor.userId,
        approverRole: actor.role,
        payloadHash: proposal.payloadHash,
        expiresAt,
      },
      session,
    );

    // 9. Update proposal status to approved
    const updatedProposal = await actionsRepository.updateProposalStatus(
      actor.tenantId,
      id,
      "approved",
      null,
      session,
    );

    // 10. Audit log
    await auditService.record(
      {
        tenantId: actor.tenantId,
        actorId: actor.userId,
        actorRole: actor.role,
        action: AUDIT_ACTIONS.FINANCING_APPROVE,
        decision: "allowed",
        reasonCode: AUDIT_REASONS.SUCCESS,
        resourceRefs: [id, approval.id],
        payloadHash: proposal.payloadHash,
        beforeVersion: tenantSettings.datasetVersion,
        afterVersion: tenantSettings.datasetVersion,
        traceId: actor.requestId || randomUUID(),
      },
      session,
    );

    return {
      approval,
      proposal: updatedProposal ?? { ...proposal, status: "approved" },
    };
  },

  /**
   * Rejects a proposal.
   */
  async rejectProposal(
    actor: ActorContext,
    id: string,
    _input: RejectActionProposalInput,
    session?: ClientSession,
  ): Promise<ActionProposalDto> {
    if (actor.role !== "owner") {
      throw new ForbiddenError("Only owners can reject action proposals");
    }

    const proposal = await actionsRepository.findProposalById(
      actor.tenantId,
      id,
      session,
    );
    if (!proposal) {
      throw new NotFoundError(`Action proposal "${id}" not found`);
    }

    if (proposal.status !== "pending" && proposal.status !== "approved") {
      throw new ConflictError(
        `Cannot reject proposal with status "${proposal.status}"`,
      );
    }

    const updated = await actionsRepository.updateProposalStatus(
      actor.tenantId,
      id,
      "rejected",
      null,
      session,
    );

    await auditService.record(
      {
        tenantId: actor.tenantId,
        actorId: actor.userId,
        actorRole: actor.role,
        action: AUDIT_ACTIONS.FINANCING_REJECT,
        decision: "allowed",
        reasonCode: AUDIT_REASONS.SUCCESS,
        resourceRefs: [id],
        payloadHash: proposal.payloadHash,
        traceId: actor.requestId || randomUUID(),
      },
      session,
    );

    return updated ?? { ...proposal, status: "rejected" };
  },
};
