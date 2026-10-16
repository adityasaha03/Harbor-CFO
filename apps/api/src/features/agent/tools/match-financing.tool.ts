import {
  type FinancingPurpose,
  matchFinancingInputSchema,
  matchFinancingOutputSchema,
  formatMinor,
  type MatchFinancingInput,
  type MatchFinancingOutput,
  type FinancingMatchOfferSummary,
} from "@harbor/contracts";
import type { Tool } from "./tool.types";
import { financingService } from "../../financing";

export const matchFinancingTool: Tool<
  MatchFinancingInput,
  MatchFinancingOutput
> = {
  name: "matchFinancing",
  description:
    "Evaluate synthetic financing catalog against tenant gap and profile, ranking eligible remedies",
  permission: "finance:read",
  costClass: "medium",
  inputSchema: matchFinancingInputSchema,
  outputSchema: matchFinancingOutputSchema,
  async execute(actor, args) {
    const match = await financingService.matchFinancing(actor, {
      desiredAmountMinor: args.desiredAmountMinor,
      purpose: (args.purpose as FinancingPurpose) || "working_capital",
    });

    const eligibleOffers: FinancingMatchOfferSummary[] = match.eligible.map(
      (c) => ({
        code: c.offer.code,
        name: c.offer.name,
        type: c.offer.type,
        score: c.score,
        principalMinor: c.schedule.principalMinor,
        principalFormatted: formatMinor(c.schedule.principalMinor),
        totalCostEstimateMinor: c.schedule.totalCostMinor,
        totalCostFormatted: formatMinor(c.schedule.totalCostMinor),
        cashAtDay21Minor: c.impact.cashAtDay21Minor,
        cashAtDay21Formatted: formatMinor(c.impact.cashAtDay21Minor),
      }),
    );

    const bestOffer = eligibleOffers[0];

    return {
      requiredGapMinor: match.requiredGapMinor,
      requiredGapFormatted: formatMinor(match.requiredGapMinor),
      breachDate: match.breachDate,
      reason: match.reason,
      bestOffer,
      eligibleOffers,
      excludedCount: match.excluded.length,
      cannotAssessCount: match.cannotAssess.length,
      evidenceRefs: match.eligible.map((c) => `offer:${c.offer.code}`),
    };
  },
};
