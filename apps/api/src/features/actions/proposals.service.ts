import type { ClientSession } from "mongoose";
import type {
  ActionProposalDto,
  CreateActionProposalInput,
  ProposalSource,
} from "@harbor/contracts";
import type { ActorContext } from "../auth/auth.types";
import {
  NotFoundError,
  ValidationError,
  ConflictError,
} from "../../core/http/app-error";
import { actionsRepository } from "./actions.repository";
import {
  resolveCanonicalPayload,
  computePayloadHash,
} from "./payload";
import {
  PROPOSAL_EXPIRY_MINUTES,
  AUDIT_ACTIONS,
  AUDIT_REASONS,
  EVENT_KINDS,
} from "./actions.constants";
import { getOfferByCode, evaluateEligibility } from "../financing";
import { scenariosRepository } from "../scenarios";
import { tenantsRepository } from "../tenants";
import { forecastService } from "../forecast";
import { invoicesRepository } from "../invoices";
import { eventsService } from "../events";
import { auditService } from "../audit";

export const proposalsService = {
  /**
   * Creates a new sandbox financing draw proposal.
   * Evaluates B12 gates, checks scenario staleness, resolves canonical payload,
   * hashes payload, persists proposal, publishes domain events, and writes audit log.
   */
  async createProposal(
    actor: ActorContext,
    input: CreateActionProposalInput,
    source: ProposalSource = "user",
    session?: ClientSession,
  ): Promise<ActionProposalDto> {
    // 1. Resolve offer from catalog
    const offer = await getOfferByCode(input.offerCode, 1, session);
    if (!offer) {
      throw new NotFoundError(
        `Financing offer "${input.offerCode}" not found in catalog`,
      );
    }

    // 2. Validate principal range
    if (
      input.principalMinor < offer.minAmountMinor ||
      input.principalMinor > offer.maxAmountMinor
    ) {
      throw new ValidationError(
        `Principal amount ${input.principalMinor} fen is outside offer range [${offer.minAmountMinor}, ${offer.maxAmountMinor}]`,
      );
    }

    // 3. Load tenant settings
    const tenantSettings = await tenantsRepository.findByTenantId(
      actor.tenantId,
      session,
    );
    if (!tenantSettings) {
      throw new NotFoundError("Tenant settings not found");
    }

    // 4. If scenarioId provided, verify it exists and is not stale
    if (input.scenarioId) {
      const scenario = await scenariosRepository.findById(
        actor.tenantId,
        input.scenarioId,
        tenantSettings.datasetVersion,
        session,
      );
      if (!scenario) {
        throw new NotFoundError(
          `Referenced scenario "${input.scenarioId}" not found`,
        );
      }
      if (scenario.isStale) {
        throw new ConflictError(
          `Referenced scenario is stale (scenario version ${scenario.baseInputVersion} vs current ${tenantSettings.datasetVersion})`,
        );
      }
    }

    // 5. Re-run B12 eligibility gates
    const baseline = await forecastService.getBaseline(actor.tenantId, session);
    const requiredGapMinor = baseline.run.summary.liquidityGapMinor;
    const breachDate =
      baseline.run.summary.firstBelowFloorDate ??
      baseline.run.summary.firstNegativeDate ??
      null;

    const outstandingInvoices = await invoicesRepository.listOutstanding(
      actor.tenantId,
      session,
    );
    const arInvoices = outstandingInvoices.filter(
      (inv) => inv.direction === "AR",
    );
    const openArMinor = arInvoices.reduce(
      (sum, inv) => sum + inv.outstandingMinor,
      0,
    );
    const hasOpenArInvoice = arInvoices.length > 0;

    const eligibility = evaluateEligibility(offer, {
      currency: tenantSettings.reportingCurrency || "CNY",
      purpose: offer.eligiblePurposes[0] ?? "working_capital",
      desiredAmountMinor: input.principalMinor,
      gapMinor: requiredGapMinor,
      asOfDate: baseline.asOfDate,
      breachDate,
      openArMinor,
      hasOpenArInvoice,
      profile: tenantSettings.profile,
    });

    if (eligibility.status !== "eligible") {
      const reasons =
        eligibility.status === "ineligible"
          ? eligibility.reasons.join("; ")
          : `Missing profile fields: ${(eligibility.missingFields ?? []).join(", ")}`;
      throw new ValidationError(`Financing gate check failed: ${reasons}`);
    }

    // 6. Resolve canonical payload from server catalog (ignore client numbers)
    const canonicalPayload = resolveCanonicalPayload(
      offer,
      input.principalMinor,
      baseline.asOfDate,
    );

    // 7. Calculate expiry and payload hash
    const expiresAt = new Date(
      Date.now() + PROPOSAL_EXPIRY_MINUTES * 60 * 1000,
    );
    const payloadHash = computePayloadHash({
      tenantId: actor.tenantId,
      actionType: input.actionType,
      payload: canonicalPayload,
      baseInputVersion: tenantSettings.datasetVersion,
      offerVersion: offer.version,
      expiresAt,
    });

    // 8. Persist proposal
    const proposal = await actionsRepository.createProposal(
      actor.tenantId,
      {
        proposerId: actor.userId,
        source,
        actionType: input.actionType,
        canonicalPayload,
        payloadHash,
        baseInputVersion: tenantSettings.datasetVersion,
        scenarioId: input.scenarioId ?? null,
        status: "pending",
        expiresAt,
      },
      session,
    );

    // 9. Dispatch events
    await eventsService.publish(
      actor.tenantId,
      {
        kind: EVENT_KINDS.PROPOSAL_CREATED,
        publicSummary: `Sandbox financing proposal created: ${offer.name} (${input.principalMinor / 100} CNY)`,
        resourceRefs: [proposal.id, offer.code],
      },
      session,
    );

    await eventsService.publish(
      actor.tenantId,
      {
        kind: EVENT_KINDS.APPROVAL_REQUIRED,
        publicSummary: `Owner approval required for proposal ${proposal.id}`,
        resourceRefs: [proposal.id],
      },
      session,
    );

    // 10. Audit log
    await auditService.record(
      {
        tenantId: actor.tenantId,
        actorId: actor.userId,
        actorRole: actor.role,
        action: AUDIT_ACTIONS.PROPOSAL_CREATE,
        decision: "allowed",
        reasonCode: AUDIT_REASONS.SUCCESS,
        resourceRefs: [proposal.id, offer.code],
        payloadHash,
        beforeVersion: tenantSettings.datasetVersion,
        afterVersion: tenantSettings.datasetVersion,
        traceId: actor.requestId,
      },
      session,
    );

    return proposal;
  },

  /**
   * Retrieves proposal by ID, lazily marking expired proposals.
   */
  async getProposalById(
    actor: ActorContext,
    id: string,
    session?: ClientSession,
  ): Promise<ActionProposalDto> {
    const proposal = await actionsRepository.findProposalById(
      actor.tenantId,
      id,
      session,
    );
    if (!proposal) {
      throw new NotFoundError(`Action proposal "${id}" not found`);
    }

    if (
      proposal.status === "pending" &&
      new Date(proposal.expiresAt).getTime() <= Date.now()
    ) {
      const updated = await actionsRepository.updateProposalStatus(
        actor.tenantId,
        id,
        "expired",
        null,
        session,
      );
      return updated ?? { ...proposal, status: "expired" };
    }

    return proposal;
  },

  /**
   * Lists proposals for tenant, lazily evaluating expiration.
   */
  async listProposals(
    actor: ActorContext,
    limit = 50,
    session?: ClientSession,
  ): Promise<ActionProposalDto[]> {
    const proposals = await actionsRepository.listProposals(
      actor.tenantId,
      limit,
      session,
    );

    const now = Date.now();
    return Promise.all(
      proposals.map(async (p) => {
        if (p.status === "pending" && new Date(p.expiresAt).getTime() <= now) {
          await actionsRepository.updateProposalStatus(
            actor.tenantId,
            p.id,
            "expired",
            null,
            session,
          );
          return { ...p, status: "expired" };
        }
        return p;
      }),
    );
  },
};
