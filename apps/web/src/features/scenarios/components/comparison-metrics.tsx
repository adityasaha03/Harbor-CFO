'use client';

import * as React from 'react';
import { formatMinor } from '@harbor/contracts';
import type { ScenarioComparison } from '@harbor/contracts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface ComparisonMetricsProps {
  comparison: ScenarioComparison;
}

export function ComparisonMetrics({ comparison }: ComparisonMetricsProps) {
  const { baselineSummary, scenarioSummary, deltas, changedDates, financing, cashAtDays } =
    comparison;

  const day21 = cashAtDays.find((d) => d.day === 21);
  const day21Baseline = day21 ? day21.baselineClosingMinor : 0;
  const day21Scenario = day21 ? day21.scenarioClosingMinor : 0;

  return (
    <div className="space-y-4" data-testid="comparison-metrics">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Forecast Metrics Comparison</CardTitle>
          <CardDescription className="text-xs">
            Baseline vs alternative scenario across key liquidity thresholds
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-border/60 text-muted-foreground">
                  <th className="pb-2 font-medium">Metric</th>
                  <th className="pb-2 font-medium">Baseline</th>
                  <th className="pb-2 font-medium">Scenario</th>
                  <th className="pb-2 font-medium text-right">Delta</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40 font-mono">
                {/* Lowest Cash & Date */}
                <tr data-testid="metric-lowest-cash">
                  <td className="py-2 font-sans font-medium text-foreground flex items-center gap-1.5">
                    Lowest Cash
                    {changedDates.minCashDateChanged && (
                      <Badge
                        variant="secondary"
                        className="text-[10px] px-1.5 py-0 bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 font-sans"
                        data-testid="changed-date-badge-min-cash"
                      >
                        Date Shifted
                      </Badge>
                    )}
                  </td>
                  <td className="py-2">
                    {formatMinor(baselineSummary.minCashMinor)}
                    <span className="text-[11px] text-muted-foreground block font-sans">
                      {baselineSummary.minCashDate}
                    </span>
                  </td>
                  <td className="py-2 font-bold text-foreground">
                    {formatMinor(scenarioSummary.minCashMinor)}
                    <span className="text-[11px] text-muted-foreground block font-sans">
                      {scenarioSummary.minCashDate}
                    </span>
                  </td>
                  <td className="py-2 text-right">
                    <span
                      className={
                        deltas.minCashMinor >= 0
                          ? 'text-emerald-600 dark:text-emerald-400 font-semibold'
                          : 'text-rose-600 dark:text-rose-400 font-semibold'
                      }
                    >
                      {deltas.minCashMinor >= 0 ? '+' : ''}
                      {formatMinor(deltas.minCashMinor)}
                    </span>
                  </td>
                </tr>

                {/* Day-21 Cash */}
                <tr data-testid="metric-day21-cash">
                  <td className="py-2 font-sans font-medium text-foreground">
                    Day-21 Cash {day21 ? `(${day21.date})` : ''}
                  </td>
                  <td className="py-2">{formatMinor(day21Baseline)}</td>
                  <td className="py-2 font-bold text-foreground">{formatMinor(day21Scenario)}</td>
                  <td className="py-2 text-right">
                    <span
                      className={
                        deltas.day21CashMinor >= 0
                          ? 'text-emerald-600 dark:text-emerald-400 font-semibold'
                          : 'text-rose-600 dark:text-rose-400 font-semibold'
                      }
                      data-testid="day21-delta"
                    >
                      {deltas.day21CashMinor >= 0 ? '+' : ''}
                      {formatMinor(deltas.day21CashMinor)}
                    </span>
                  </td>
                </tr>

                {/* Liquidity Gap to Floor */}
                <tr data-testid="metric-liquidity-gap">
                  <td className="py-2 font-sans font-medium text-foreground">Gap to Floor</td>
                  <td className="py-2">{formatMinor(baselineSummary.liquidityGapMinor)}</td>
                  <td className="py-2 font-bold text-foreground">
                    {formatMinor(scenarioSummary.liquidityGapMinor)}
                  </td>
                  <td className="py-2 text-right">
                    <span
                      className={
                        deltas.liquidityGapMinor <= 0
                          ? 'text-emerald-600 dark:text-emerald-400 font-semibold'
                          : 'text-rose-600 dark:text-rose-400 font-semibold'
                      }
                    >
                      {deltas.liquidityGapMinor > 0 ? '+' : ''}
                      {formatMinor(deltas.liquidityGapMinor)}
                    </span>
                  </td>
                </tr>

                {/* First Day Below Floor */}
                <tr data-testid="metric-first-below-floor">
                  <td className="py-2 font-sans font-medium text-foreground flex items-center gap-1.5">
                    First Day Below Floor
                    {changedDates.firstBelowFloorChanged && (
                      <Badge
                        variant="secondary"
                        className="text-[10px] px-1.5 py-0 bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 font-sans"
                        data-testid="changed-date-badge-floor"
                      >
                        Changed
                      </Badge>
                    )}
                  </td>
                  <td className="py-2 font-sans">
                    {baselineSummary.firstBelowFloorDate ?? 'None'}
                  </td>
                  <td className="py-2 font-sans font-semibold text-foreground">
                    {scenarioSummary.firstBelowFloorDate ?? 'None'}
                  </td>
                  <td className="py-2 text-right font-sans text-muted-foreground">
                    {changedDates.firstBelowFloorChanged ? 'Remedied / Shifted' : 'Unchanged'}
                  </td>
                </tr>

                {/* Financing Cost Breakdown (if any financing was added) */}
                {financing.totalCostMinor > 0 && (
                  <>
                    <tr data-testid="metric-financing-cost">
                      <td className="py-2 font-sans font-medium text-foreground">
                        Total Financing Cost
                      </td>
                      <td className="py-2">¥0.00</td>
                      <td className="py-2 font-bold text-foreground">
                        {formatMinor(financing.totalCostMinor)}
                      </td>
                      <td className="py-2 text-right text-rose-600 dark:text-rose-400 font-semibold">
                        +{formatMinor(financing.totalCostMinor)}
                      </td>
                    </tr>
                    <tr data-testid="metric-financing-repayment">
                      <td className="py-2 font-sans font-medium text-foreground">
                        Total Scheduled Repayment
                      </td>
                      <td className="py-2">¥0.00</td>
                      <td className="py-2 font-bold text-foreground">
                        {formatMinor(financing.repaymentsTotalMinor)}
                      </td>
                      <td className="py-2 text-right text-muted-foreground">
                        {formatMinor(financing.repaymentsTotalMinor)}
                      </td>
                    </tr>
                  </>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Milestone Breakdown Table */}
      <Card data-testid="milestone-table">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Milestone Cash Trajectory</CardTitle>
          <CardDescription className="text-xs">
            Projected closing cash at standard milestone intervals
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-border/60 text-muted-foreground">
                  <th className="pb-2 font-medium">Day</th>
                  <th className="pb-2 font-medium">Date</th>
                  <th className="pb-2 font-medium">Baseline Cash</th>
                  <th className="pb-2 font-medium">Scenario Cash</th>
                  <th className="pb-2 font-medium text-right">Delta</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40 font-mono">
                {cashAtDays.map((item) => (
                  <tr key={item.day} data-testid={`milestone-row-${item.day}`}>
                    <td className="py-2 font-sans font-medium text-foreground">Day {item.day}</td>
                    <td className="py-2 font-sans text-muted-foreground">{item.date}</td>
                    <td className="py-2">{formatMinor(item.baselineClosingMinor)}</td>
                    <td className="py-2 font-semibold text-foreground">
                      {formatMinor(item.scenarioClosingMinor)}
                    </td>
                    <td className="py-2 text-right">
                      <span
                        className={
                          item.deltaMinor >= 0
                            ? 'text-emerald-600 dark:text-emerald-400 font-semibold'
                            : 'text-rose-600 dark:text-rose-400 font-semibold'
                        }
                      >
                        {item.deltaMinor >= 0 ? '+' : ''}
                        {formatMinor(item.deltaMinor)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
