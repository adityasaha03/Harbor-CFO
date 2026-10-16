import { addDays } from '@harbor/contracts';
import type {
  ForecastRunDto,
  ScenarioChange,
  ScenarioComparison,
  ScenarioCashAtDay,
  ScenarioChartPoint,
  FinancingOffer,
  RepaymentWarning,
} from '@harbor/contracts';
import { SYNTHETIC_OFFERS_CATALOG } from '../../financing/catalog/offers';
import { buildSchedule } from '../../financing/engine/schedule';

const MILESTONE_DAYS = [7, 14, 21, 30, 60, 90] as const;

/**
 * Pure comparison engine comparing baseline forecast run against scenario forecast run.
 */
export function compare(
  baselineRun: ForecastRunDto,
  scenarioRun: ForecastRunDto,
  changes: readonly ScenarioChange[] = [],
  offers: readonly FinancingOffer[] = SYNTHETIC_OFFERS_CATALOG,
): ScenarioComparison {
  // 1. Cash at milestone days
  const cashAtDays: ScenarioCashAtDay[] = MILESTONE_DAYS.map((day) => {
    const bPoint = baselineRun.points[day];
    const sPoint = scenarioRun.points[day];
    const baselineClosingMinor = bPoint ? bPoint.closingMinor : 0;
    const scenarioClosingMinor = sPoint ? sPoint.closingMinor : 0;
    const date = (sPoint ?? bPoint)?.date ?? '';

    return {
      day,
      date,
      baselineClosingMinor,
      scenarioClosingMinor,
      deltaMinor: scenarioClosingMinor - baselineClosingMinor,
    };
  });

  // 2. Summary deltas
  const day21Baseline = baselineRun.points[21]?.closingMinor ?? 0;
  const day21Scenario = scenarioRun.points[21]?.closingMinor ?? 0;
  const gapDelta = scenarioRun.summary.liquidityGapMinor - baselineRun.summary.liquidityGapMinor;

  const deltas = {
    minCashMinor: scenarioRun.summary.minCashMinor - baselineRun.summary.minCashMinor,
    day21CashMinor: day21Scenario - day21Baseline,
    liquidityGapMinor: gapDelta,
    gapMinor: gapDelta,
  };

  // 3. Changed dates
  const changedDates = {
    firstBelowFloorDate: scenarioRun.summary.firstBelowFloorDate,
    firstNegativeDate: scenarioRun.summary.firstNegativeDate,
    minCashDate: scenarioRun.summary.minCashDate,
    firstBelowFloorChanged:
      scenarioRun.summary.firstBelowFloorDate !== baselineRun.summary.firstBelowFloorDate,
    firstNegativeChanged:
      scenarioRun.summary.firstNegativeDate !== baselineRun.summary.firstNegativeDate,
    minCashDateChanged: scenarioRun.summary.minCashDate !== baselineRun.summary.minCashDate,
  };

  // 4. Financing breakdown and repayment risk
  let principalMinor = 0;
  let netProceedsMinor = 0;
  let totalCostMinor = 0;
  let repaymentsTotalMinor = 0;
  const repaymentWarnings: RepaymentWarning[] = [];

  const financingChanges = changes.filter(
    (c): c is Extract<ScenarioChange, { type: 'add_financing' }> => c.type === 'add_financing',
  );

  for (const fc of financingChanges) {
    const offer = offers.find((o) => o.code === fc.offerCode);
    if (offer) {
      const fundingOn = fc.fundingOn ?? addDays(scenarioRun.asOfDate, offer.fundingDelayDays);
      const schedule = buildSchedule(offer, fc.principalMinor, fundingOn);
      principalMinor += schedule.principalMinor;
      netProceedsMinor += schedule.netProceedsMinor;
      totalCostMinor += schedule.totalCostMinor;
      repaymentsTotalMinor += schedule.totalRepaymentMinor;
    }
  }

  if (financingChanges.length > 0) {
    // Check if near-term cash improved at day 21, but a later repayment causes a shortfall after day 21
    const nearTermImproved = day21Scenario > day21Baseline;

    if (nearTermImproved) {
      for (let i = 22; i < scenarioRun.points.length; i++) {
        const point = scenarioRun.points[i];
        if (point && point.closingMinor < scenarioRun.floorMinor) {
          repaymentWarnings.push({
            date: point.date,
            type: point.closingMinor < 0 ? 'negative_cash' : 'floor_breach',
            closingMinor: point.closingMinor,
            message: `Near-term cash improves, but repayments cause a shortfall on ${point.date}`,
          });
          break; // First occurrence
        }
      }
    }
  }

  // 5. Check any negative cash in scenario
  const anyNegativeCash = scenarioRun.points.some((p) => p.closingMinor < 0);

  // 6. Chart points
  const pointsLength = Math.max(baselineRun.points.length, scenarioRun.points.length);
  const chartPoints: ScenarioChartPoint[] = [];

  for (let i = 0; i < pointsLength; i++) {
    const bPoint = baselineRun.points[i];
    const sPoint = scenarioRun.points[i];
    const date = (sPoint ?? bPoint)?.date ?? '';

    chartPoints.push({
      date,
      dayIndex: i,
      baselineClosingMinor: bPoint?.closingMinor ?? 0,
      scenarioClosingMinor: sPoint?.closingMinor ?? 0,
      floorMinor: scenarioRun.floorMinor,
    });
  }

  return {
    baselineSummary: baselineRun.summary,
    scenarioSummary: scenarioRun.summary,
    cashAtDays,
    deltas,
    changedDates,
    financing: {
      principalMinor,
      principal: principalMinor,
      netProceedsMinor,
      netProceeds: netProceedsMinor,
      totalCostMinor,
      totalCost: totalCostMinor,
      repaymentsTotalMinor,
      repaymentsTotal: repaymentsTotalMinor,
      repaymentWarnings,
    },
    anyNegativeCash,
    points: chartPoints,
  };
}
