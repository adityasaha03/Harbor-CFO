import { randomBytes } from "node:crypto";
import type {
  ExecuteActionProposalResponse,
} from "@harbor/contracts";
import type { ActorContext } from "../auth/auth.types";
import {
  NotFoundError,
  ForbiddenError,
  ConflictError,
} from "../../core/http/app-error";
import { withTransaction } from "../../core/db/with-transaction";
import { actionsRepository } from "./actions.repository";
import {
  AUDIT_ACTIONS,
  AUDIT_REASONS,
  EVENT_KINDS,
} from "./actions.constants";
import { ledgerRepository } from "../ledger";
import { forecastService } from "../forecast";
import { alertsService } from "../alerts";
import { eventsService } from "../events";
import { auditService } from "../audit";

export const executionService = {
  /**
   * Executes an approved sandbox financing action atomically inside a MongoDB transaction.
   * Enforces idempotency, role-owner check in session, CAS dataset version bump,
   * single-use approval consumption, ledger draw/fee entries, commitment schedule,
   * audit logging, and post-commit forecast re-run and repayment pressure check.
   */
  async executeProposal(
    actor: ActorContext,
    id: string,
    idempotencyKey: string,
  ): Promise<ExecuteActionProposalResponse> {
    // 1. Role verification
    if (actor.role !== "owner") {
      await auditService.record({
        tenantId: actor.tenantId,
        actorId: actor.userId,
        actorRole: actor.role,
        action: AUDIT_ACTIONS.FINANCING_EXECUTE,
        decision: "denied",
        reasonCode: AUDIT_REASONS.NOT_APPROVER,
        resourceRefs: [id],
        traceId: actor.requestId,
      });
      throw new ForbiddenError("Only owners can execute action proposals");
    }

    // Capture baseline before execution for evidence linkage
    let forecastBeforeId: string | null = null;
    try {
      const beforeForecast = await forecastService.getBaseline(actor.tenantId);
      forecastBeforeId = beforeForecast.run.id;
    } catch {
      // Non-fatal if baseline forecast not yet initialized
    }

    // 2. Atomic transaction execution
    const txResult = await withTransaction(async (session) => {
      // (a) Load proposal
      const proposal = await actionsRepository.findProposalById(
        actor.tenantId,
        id,
        session,
      );
      if (!proposal) {
        throw new NotFoundError(`Action proposal "${id}" not found`);
      }

      // (b) Idempotency check
      const existingOp =
        await actionsRepository.findOperationByIdempotencyKey(
          actor.tenantId,
          idempotencyKey,
          session,
        );

      if (existingOp) {
        if (
          existingOp.proposalId === proposal.id &&
          existingOp.payloadHash === proposal.payloadHash
        ) {
          const commitment = await actionsRepository.findCommitmentById(
            actor.tenantId,
            existingOp.commitmentId,
            session,
          );
          return {
            isIdempotentReplay: true,
            operation: existingOp,
            commitment: commitment!,
            proposal,
          };
        } else {
          throw new ConflictError(
            "Idempotency key was already used with a different payload or proposal",
          );
        }
      }

      if (proposal.status !== "approved") {
        throw new ConflictError(
          `Proposal is not approved for execution (current status: ${proposal.status})`,
        );
      }

      // (c) Find active approval
      const approval = await actionsRepository.findActiveApprovalByProposal(
        actor.tenantId,
        proposal.id,
        proposal.payloadHash,
        actor.userId,
        session,
      );

      if (!approval) {
        await auditService.record(
          {
            tenantId: actor.tenantId,
            actorId: actor.userId,
            actorRole: actor.role,
            action: AUDIT_ACTIONS.FINANCING_EXECUTE,
            decision: "denied",
            reasonCode: AUDIT_REASONS.APPROVAL_CONSUMED,
            resourceRefs: [id],
            payloadHash: proposal.payloadHash,
            traceId: actor.requestId,
          },
          session,
        );
        throw new ConflictError(
          "No valid, unconsumed approval found for this proposal and approver",
        );
      }

      // (d) Re-read membership inside the transaction session
      const currentMembership =
        await actionsRepository.findMembershipInSession(
          actor.userId,
          actor.tenantId,
          session,
        );

      if (!currentMembership || currentMembership.role !== "owner") {
        await auditService.record(
          {
            tenantId: actor.tenantId,
            actorId: actor.userId,
            actorRole: actor.role,
            action: AUDIT_ACTIONS.FINANCING_EXECUTE,
            decision: "denied",
            reasonCode: AUDIT_REASONS.ROLE_REVOKED,
            resourceRefs: [id, approval.id],
            payloadHash: proposal.payloadHash,
            traceId: actor.requestId,
          },
          session,
        );
        throw new ForbiddenError(
          "Caller role was revoked or is no longer an owner in this organization",
        );
      }

      // (e) Compare-and-set dataset version
      const casOk = await actionsRepository.compareAndSetDatasetVersion(
        actor.tenantId,
        proposal.baseInputVersion,
        session,
      );

      if (!casOk) {
        await actionsRepository.updateProposalStatus(
          actor.tenantId,
          id,
          "conflict",
          null,
          session,
        );
        await auditService.record(
          {
            tenantId: actor.tenantId,
            actorId: actor.userId,
            actorRole: actor.role,
            action: AUDIT_ACTIONS.FINANCING_EXECUTE,
            decision: "denied",
            reasonCode: AUDIT_REASONS.STALE_VERSION,
            resourceRefs: [id],
            payloadHash: proposal.payloadHash,
            beforeVersion: proposal.baseInputVersion,
            traceId: actor.requestId,
          },
          session,
        );
        throw new ConflictError(
          "Dataset version changed between approval and execution; execution conflicted",
        );
      }

      // (f) Consume approval conditionally
      const consumed = await actionsRepository.consumeApproval(
        actor.tenantId,
        approval.id,
        session,
      );
      if (!consumed) {
        throw new ConflictError("Approval has already been consumed");
      }

      // (g) Generate operationId
      const operationId = "op_" + randomBytes(8).toString("hex");

      // (h) Insert 2 ledger entries on fundingOn
      const drawExternalId = `LEDGER-DRAW-${operationId}`;
      const feeExternalId = `LEDGER-FEE-${operationId}`;

      await ledgerRepository.bulkUpsert(
        actor.tenantId,
        [
          {
            accountCode: "OPERATING",
            externalId: drawExternalId,
            bookedOn: proposal.canonicalPayload.fundingOn,
            amountMinor: proposal.canonicalPayload.principalMinor,
            category: "loan_draw",
            kind: "sandbox_financing_draw",
            description: `Sandbox financing draw - ${proposal.canonicalPayload.offerCode}`,
            operationId,
          },
          {
            accountCode: "OPERATING",
            externalId: feeExternalId,
            bookedOn: proposal.canonicalPayload.fundingOn,
            amountMinor: -proposal.canonicalPayload.upfrontFeeMinor,
            category: "loan_fee",
            kind: "sandbox_financing_fee",
            description: `Upfront fee - ${proposal.canonicalPayload.offerCode}`,
            operationId,
          },
        ],
        session,
      );

      // (i) Insert financingCommitments
      const commitment = await actionsRepository.createFinancingCommitment(
        actor.tenantId,
        {
          operationId,
          offerCode: proposal.canonicalPayload.offerCode,
          offerVersion: proposal.canonicalPayload.offerVersion,
          principalMinor: proposal.canonicalPayload.principalMinor,
          upfrontFeeMinor: proposal.canonicalPayload.upfrontFeeMinor,
          interestMinor: proposal.canonicalPayload.interestMinor,
          fundedOn: proposal.canonicalPayload.fundingOn,
          schedule: proposal.canonicalPayload.schedule,
          status: "active",
        },
        session,
      );

      // (j) Update proposal to executed
      const updatedProposal = await actionsRepository.updateProposalStatus(
        actor.tenantId,
        id,
        "executed",
        operationId,
        session,
      );

      // (k) Insert sandboxOperations
      const operation = await actionsRepository.createSandboxOperation(
        actor.tenantId,
        {
          operationId,
          proposalId: proposal.id,
          approvalId: approval.id,
          idempotencyKey,
          payloadHash: proposal.payloadHash,
          type: "sandbox_financing_draw",
          inputVersion: proposal.baseInputVersion,
          outputVersion: proposal.baseInputVersion + 1,
          ledgerEntryIds: [drawExternalId, feeExternalId],
          commitmentId: commitment.id,
          forecastBeforeId,
        },
        session,
      );

      // (l) Record audit
      await auditService.record(
        {
          tenantId: actor.tenantId,
          actorId: actor.userId,
          actorRole: actor.role,
          action: AUDIT_ACTIONS.FINANCING_EXECUTE,
          decision: "allowed",
          reasonCode: AUDIT_REASONS.SUCCESS,
          resourceRefs: [id, operationId, commitment.id],
          payloadHash: proposal.payloadHash,
          beforeVersion: proposal.baseInputVersion,
          afterVersion: proposal.baseInputVersion + 1,
          traceId: actor.requestId,
        },
        session,
      );

      // (m) Publish event
      await eventsService.publish(
        actor.tenantId,
        {
          kind: EVENT_KINDS.ACTION_COMMITTED,
          publicSummary: `Sandbox financing executed: ${proposal.canonicalPayload.offerCode} (${proposal.canonicalPayload.principalMinor / 100} CNY)`,
          resourceRefs: [id, operationId, commitment.id],
        },
        session,
      );

      return {
        isIdempotentReplay: false,
        operation,
        commitment,
        proposal: updatedProposal ?? { ...proposal, status: "executed", operationId },
      };
    });

    if (txResult.isIdempotentReplay) {
      return {
        operation: txResult.operation,
        commitment: txResult.commitment,
        proposal: txResult.proposal,
      };
    }

    // 3. Post-commit: refresh baseline forecast and evaluate repayment pressure
    try {
      const postForecast = await forecastService.getBaseline(actor.tenantId);
      const forecastAfterId = postForecast.run.id;

      await actionsRepository.updateOperationForecastRefs(
        actor.tenantId,
        txResult.operation.operationId,
        forecastBeforeId,
        forecastAfterId,
      );

      // Evaluate repayment pressure if floor is breached later in horizon
      if (postForecast.run.summary.firstBelowFloorDate) {
        await alertsService.raiseRepaymentPressure(actor.tenantId, {
          refId: txResult.operation.operationId,
          title: `Repayment Pressure: ${txResult.proposal.canonicalPayload.offerCode}`,
          summary: `Forecast falls below floor on ${postForecast.run.summary.firstBelowFloorDate} following financing draw`,
          evidence: [
            {
              type: "forecast",
              id: postForecast.run.summary.firstBelowFloorDate,
              label: `Floor Breach Date: ${postForecast.run.summary.firstBelowFloorDate}`,
              amountMinor: txResult.proposal.canonicalPayload.principalMinor,
            },
          ],
          inputVersion: postForecast.inputVersion,
        });
      }
    } catch {
      // Post-commit telemetry non-fatal to the committed operation
    }

    return {
      operation: txResult.operation,
      commitment: txResult.commitment,
      proposal: txResult.proposal,
    };
  },
};
