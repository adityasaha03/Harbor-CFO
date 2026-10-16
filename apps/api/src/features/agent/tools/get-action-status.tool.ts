import {
  getActionStatusInputSchema,
  getActionStatusOutputSchema,
  formatMinor,
  type GetActionStatusInput,
  type GetActionStatusOutput,
} from "@harbor/contracts";
import type { Tool } from "./tool.types";
import { actionsRepository } from "../../actions/actions.repository";
import { NotFoundError } from "../../../core/http/app-error";

export const getActionStatusTool: Tool<
  GetActionStatusInput,
  GetActionStatusOutput
> = {
  name: "getActionStatus",
  description:
    "Check current lifecycle and execution status of an action proposal",
  permission: "finance:read",
  costClass: "low",
  inputSchema: getActionStatusInputSchema,
  outputSchema: getActionStatusOutputSchema,
  async execute(actor, args) {
    const proposal = await actionsRepository.findProposalById(
      actor.tenantId,
      args.proposalId,
    );

    if (!proposal) {
      throw new NotFoundError("Action proposal not found");
    }

    return {
      proposalId: proposal.id,
      status: proposal.status,
      offerCode: proposal.canonicalPayload.offerCode,
      principalMinor: proposal.canonicalPayload.principalMinor,
      principalFormatted: formatMinor(proposal.canonicalPayload.principalMinor),
      payloadHash: proposal.payloadHash,
      expiresAt: proposal.expiresAt,
      operationId: proposal.operationId ?? null,
      evidenceRefs: [`proposal:${proposal.id}`],
    };
  },
};
