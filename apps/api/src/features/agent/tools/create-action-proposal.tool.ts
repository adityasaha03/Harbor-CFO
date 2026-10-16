import {
  createActionProposalToolInputSchema,
  createActionProposalToolOutputSchema,
  formatMinor,
  type CreateActionProposalToolInput,
  type CreateActionProposalToolOutput,
} from "@harbor/contracts";
import type { Tool } from "./tool.types";
import { proposalsService } from "../../actions/proposals.service";

export const createActionProposalTool: Tool<
  CreateActionProposalToolInput,
  CreateActionProposalToolOutput
> = {
  name: "createActionProposal",
  description:
    "Propose a sandboxed financing draw for Owner approval, resolving canonical terms",
  permission: "actions:propose",
  costClass: "medium",
  inputSchema: createActionProposalToolInputSchema,
  outputSchema: createActionProposalToolOutputSchema,
  async execute(actor, args) {
    const proposal = await proposalsService.createProposal(
      actor,
      {
        actionType: "sandbox_financing_draw",
        offerCode: args.offerCode,
        principalMinor: args.principalMinor,
        scenarioId: args.scenarioId,
      },
      "agent",
    );

    return {
      proposalId: proposal.id,
      status: proposal.status,
      payloadHash: proposal.payloadHash,
      expiresAt: proposal.expiresAt,
      canonicalPayload: proposal.canonicalPayload,
      principalMinor: proposal.canonicalPayload.principalMinor,
      principalFormatted: formatMinor(proposal.canonicalPayload.principalMinor),
      upfrontFeeMinor: proposal.canonicalPayload.upfrontFeeMinor,
      upfrontFeeFormatted: formatMinor(
        proposal.canonicalPayload.upfrontFeeMinor,
      ),
      evidenceRefs: [
        `proposal:${proposal.id}`,
        `offer:${proposal.canonicalPayload.offerCode}`,
      ],
    };
  },
};
