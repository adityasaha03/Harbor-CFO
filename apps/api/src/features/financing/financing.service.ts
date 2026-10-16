import type { ClientSession } from 'mongoose';
import type {
  FinancingMatchInput,
  FinancingMatchResponse,
  FinancingOffer,
  FinancingImpact,
  ExcludedOffer,
  CannotAssessOffer,
  ForecastFinancing,
  ForecastInput,
} from '@harbor/contracts';
import type { ActorContext } from '../auth/auth.types';
import { invoicesRepository } from '../invoices';
import {
  forecastService,
  loadForecastInput,
  runForecast,
  summarize,
} from '../forecast';
import { financingRepository } from './financing.repository';
import {
  evaluateEligibility,
  computeCandidateScores,
  type CandidateEvaluation,
  type EligibilityContext,
} from './engine';

export const financingService = {
  /**
   * Lists all available financing offers from the catalog.
   */
  async listOffers(session?: ClientSession): Promise<FinancingOffer[]> {
    return financingRepository.listCatalog(session);
  },

  /**
   * Retrieves an offer by code and version.
   */
  async getOfferByCode(
    code: string,
    version = 1,
    session?: ClientSession,
  ): Promise<FinancingOffer | null> {
    return financingRepository.findByCode(code, version, session);
  },

  /**
   * Matches financing offers against the tenant's current liquidity gap and profile.
   * Read-only evaluation (reviewer-accessible).
   */
  async matchFinancing(
    actor: ActorContext,
    query: FinancingMatchInput,
    session?: ClientSession,
  ): Promise<FinancingMatchResponse> {
    // 1. Load baseline forecast
    const baseline = await forecastService.getBaseline(actor.tenantId, session);
    const requiredGapMinor = baseline.run.summary.liquidityGapMinor;
    const breachDate =
      baseline.run.summary.firstBelowFloorDate ??
      baseline.run.summary.firstNegativeDate ??
      null;

    // If no liquidity gap exists, return empty candidate lists with NO_GAP
    if (requiredGapMinor <= 0) {
      return {
        requiredGapMinor: 0,
        breachDate,
        eligible: [],
        excluded: [],
        cannotAssess: [],
        reason: 'NO_GAP',
      };
    }

    // 2. Load live tenant forecast inputs & profile
    const { input: baseInput, tenantSettings } = await loadForecastInput(
      actor.tenantId,
      session,
    );

    // 3. Fetch outstanding AR invoices
    const outstandingInvoices = await invoicesRepository.listOutstanding(
      actor.tenantId,
      session,
    );
    const arInvoices = outstandingInvoices.filter((inv) => inv.direction === 'AR');
    const openArMinor = arInvoices.reduce((sum, inv) => sum + inv.outstandingMinor, 0);
    const hasOpenArInvoice = arInvoices.length > 0;

    // 4. Load catalog
    const catalog = await financingRepository.listCatalog(session);

    const eligibleCandidates: CandidateEvaluation[] = [];
    const excluded: ExcludedOffer[] = [];
    const cannotAssess: CannotAssessOffer[] = [];

    // 5. Evaluate each offer
    for (const offer of catalog) {
      const ctx: EligibilityContext = {
        currency: tenantSettings.reportingCurrency || 'CNY',
        purpose: query.purpose,
        desiredAmountMinor: query.desiredAmountMinor,
        gapMinor: requiredGapMinor,
        asOfDate: baseline.asOfDate,
        breachDate,
        openArMinor,
        hasOpenArInvoice,
        profile: tenantSettings.profile,
      };

      const evaluated = evaluateEligibility(offer, ctx);

      if (evaluated.status === 'cannot_assess') {
        cannotAssess.push({
          offer,
          missing: evaluated.missingFields ?? [],
        });
      } else if (evaluated.status === 'ineligible') {
        excluded.push({
          offer,
          reasons: evaluated.reasons,
        });
      } else if (evaluated.status === 'eligible' && evaluated.schedule) {
        // 6. Simulate hypothetical financing flows on the forecast input
        const schedule = evaluated.schedule;
        const simFinancing: ForecastFinancing = {
          id: `hypothetical-${offer.code}`,
          label: offer.name,
          flows: [
            {
              on: schedule.fundingOn,
              amountMinor: schedule.principalMinor,
              kind: 'draw',
            },
            ...(schedule.upfrontFeeMinor > 0
              ? [
                  {
                    on: schedule.fundingOn,
                    amountMinor: schedule.upfrontFeeMinor,
                    kind: 'fee' as const,
                  },
                ]
              : []),
            ...schedule.installments.map((inst) => ({
              on: inst.dueOn,
              amountMinor: inst.amountMinor,
              kind: 'repayment' as const,
            })),
          ],
        };

        const simInput: ForecastInput = {
          ...baseInput,
          financing: [...baseInput.financing, simFinancing],
        };

        const simPoints = runForecast(simInput);
        const simSummary = summarize(simPoints, simInput.floorMinor);

        const anyNegativeCash = simPoints.some((p) => p.closingMinor < 0);
        const cashAtDay21Minor =
          simPoints[21]?.closingMinor ??
          (simPoints[simPoints.length - 1]?.closingMinor ?? 0);
        const cashAtBreachDateMinor = breachDate
          ? (simPoints.find((p) => p.date === breachDate)?.closingMinor ?? 0)
          : (simPoints[0]?.closingMinor ?? 0);

        const impact: FinancingImpact = {
          minCashMinor: simSummary.minCashMinor,
          firstBelowFloorDate: simSummary.firstBelowFloorDate,
          firstNegativeDate: simSummary.firstNegativeDate,
          anyNegativeCash,
          cashAtDay21Minor,
          cashAtBreachDateMinor,
        };

        const daysAtOrAboveFloor = simPoints.filter(
          (p) => p.closingMinor >= simInput.floorMinor,
        ).length;

        eligibleCandidates.push({
          evaluated,
          impact,
          daysAtOrAboveFloor,
          horizonDays: simPoints.length,
        });
      }
    }

    // 7. Rank eligible candidates
    const eligible = computeCandidateScores(
      eligibleCandidates,
      requiredGapMinor,
      baseline.asOfDate,
      breachDate,
    );

    return {
      requiredGapMinor,
      breachDate,
      eligible,
      excluded,
      cannotAssess,
    };
  },
};
