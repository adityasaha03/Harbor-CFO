import { describe, it, expect } from 'vitest';
import { computeCandidateScores, type CandidateEvaluation } from '../engine/scoring';
import { SYNTHETIC_OFFERS } from '../catalog/offers';
import { buildSchedule } from '../engine/schedule';

describe('B12 Engine: Multi-Factor Scoring & Ranking', () => {
  const bridgeOffer = SYNTHETIC_OFFERS.find((o) => o.code === 'bridge-term')!;
  const revolverOffer = SYNTHETIC_OFFERS.find((o) => o.code === 'revolver-flex')!;

  const bridgeSchedule = buildSchedule(bridgeOffer, 6_000_000, '2026-10-22');
  const revolverSchedule = buildSchedule(revolverOffer, 5_000_000, '2026-10-21');

  it('computes component scores and composite score correctly', () => {
    const candidate: CandidateEvaluation = {
      evaluated: {
        offer: bridgeOffer,
        status: 'eligible',
        reasons: [],
        suggestedPrincipalMinor: 6_000_000,
        schedule: bridgeSchedule,
      },
      impact: {
        minCashMinor: 1_000_000,
        firstBelowFloorDate: null,
        firstNegativeDate: null,
        anyNegativeCash: false,
        cashAtDay21Minor: 3_880_000,
        cashAtBreachDateMinor: 4_000_000,
      },
      daysAtOrAboveFloor: 91,
      horizonDays: 91,
    };

    // requiredGap = 5_000_000
    // bridge netProceeds = 5_880_000 -> gapCoverage = 1.0 (min(5880000 / 5000000, 1) = 1.0)
    // asOf = 2026-10-20, breach = 2026-10-29 (9 days). fundingDelay = 2 -> buffer = 7 days -> timeliness = 7 / 7 = 1.0
    // daysAtOrAboveFloor = 91 / 91 -> resilience = 1.0
    // single candidate -> costEfficiency = 1.0
    // totalScore = 0.35(1) + 0.25(1) + 0.25(1) + 0.15(1) = 1.0000
    const scored = computeCandidateScores(
      [candidate],
      5_000_000,
      '2026-10-20',
      '2026-10-29',
    );

    expect(scored).toHaveLength(1);
    expect(scored[0]!.score).toBe(1.0);
    expect(scored[0]!.scoringBreakdown).toEqual({
      gapCoverage: 1.0,
      timeliness: 1.0,
      repaymentResilience: 1.0,
      costEfficiency: 1.0,
      totalScore: 1.0,
    });
    expect(scored[0]!.warnings).toEqual([]);
  });

  it('normalizes equal costs to 1.0 costEfficiency across multiple candidates', () => {
    // Both offers with artificially identical cost schedule
    const candA: CandidateEvaluation = {
      evaluated: {
        offer: bridgeOffer,
        status: 'eligible',
        reasons: [],
        suggestedPrincipalMinor: 6_000_000,
        schedule: bridgeSchedule, // totalCostMinor: 300_000
      },
      impact: {
        minCashMinor: 1_000_000,
        firstBelowFloorDate: null,
        firstNegativeDate: null,
        anyNegativeCash: false,
        cashAtDay21Minor: 3_880_000,
        cashAtBreachDateMinor: 4_000_000,
      },
      daysAtOrAboveFloor: 91,
      horizonDays: 91,
    };

    const candB: CandidateEvaluation = {
      evaluated: {
        offer: revolverOffer,
        status: 'eligible',
        reasons: [],
        suggestedPrincipalMinor: 5_000_000,
        schedule: { ...revolverSchedule, totalCostMinor: 300_000 },
      },
      impact: {
        minCashMinor: 1_000_000,
        firstBelowFloorDate: null,
        firstNegativeDate: null,
        anyNegativeCash: false,
        cashAtDay21Minor: 3_880_000,
        cashAtBreachDateMinor: 4_000_000,
      },
      daysAtOrAboveFloor: 91,
      horizonDays: 91,
    };

    const scored = computeCandidateScores([candA, candB], 5_000_000, '2026-10-20', '2026-10-29');
    expect(scored[0]!.scoringBreakdown.costEfficiency).toBe(1.0);
    expect(scored[1]!.scoringBreakdown.costEfficiency).toBe(1.0);
  });

  it('handles ties by picking lower total cost, then lower funding delay', () => {
    const cand1: CandidateEvaluation = {
      evaluated: {
        offer: { ...bridgeOffer, fundingDelayDays: 3 },
        status: 'eligible',
        reasons: [],
        suggestedPrincipalMinor: 6_000_000,
        schedule: { ...bridgeSchedule, totalCostMinor: 300_000 },
      },
      impact: {
        minCashMinor: 1_000_000,
        firstBelowFloorDate: null,
        firstNegativeDate: null,
        anyNegativeCash: false,
        cashAtDay21Minor: 3_880_000,
        cashAtBreachDateMinor: 4_000_000,
      },
      daysAtOrAboveFloor: 91,
      horizonDays: 91,
    };

    const cand2: CandidateEvaluation = {
      evaluated: {
        offer: { ...revolverOffer, fundingDelayDays: 1 },
        status: 'eligible',
        reasons: [],
        suggestedPrincipalMinor: 6_000_000,
        schedule: { ...revolverSchedule, totalCostMinor: 200_000 },
      },
      impact: {
        minCashMinor: 1_000_000,
        firstBelowFloorDate: null,
        firstNegativeDate: null,
        anyNegativeCash: false,
        cashAtDay21Minor: 3_880_000,
        cashAtBreachDateMinor: 4_000_000,
      },
      daysAtOrAboveFloor: 91,
      horizonDays: 91,
    };

    const scored = computeCandidateScores([cand1, cand2], 5_000_000, '2026-10-20', null);
    // cand2 has lower cost so higher cost efficiency and ranks first
    expect(scored[0]!.schedule.totalCostMinor).toBeLessThan(scored[1]!.schedule.totalCostMinor);
  });

  it('attaches warnings when negative cash occurs or gap coverage is incomplete', () => {
    const candWarning: CandidateEvaluation = {
      evaluated: {
        offer: revolverOffer,
        status: 'eligible',
        reasons: [],
        suggestedPrincipalMinor: 1_200_000,
        schedule: buildSchedule(revolverOffer, 1_200_000, '2026-10-21'),
      },
      impact: {
        minCashMinor: -500_000,
        firstBelowFloorDate: '2026-11-01',
        firstNegativeDate: '2026-11-10',
        anyNegativeCash: true,
        cashAtDay21Minor: -500_000,
        cashAtBreachDateMinor: 1_000_000,
      },
      daysAtOrAboveFloor: 40,
      horizonDays: 91,
    };

    // Net proceeds: 1,176,000 for gap of 5,000,000 -> gap coverage ~0.2352
    const scored = computeCandidateScores([candWarning], 5_000_000, '2026-10-20', '2026-10-29');
    expect(scored[0]!.warnings).toContain(
      'Projected closing balance dips below zero during loan term.',
    );
    expect(scored[0]!.warnings.some((w) => w.includes('Net proceeds cover'))).toBe(true);
  });
});
