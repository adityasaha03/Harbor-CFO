'use client';

import * as React from 'react';
import { formatMinor } from '@harbor/contracts';
import { useScenario } from '@/features/scenarios';
import { useLatestForecast } from '@/features/forecast';
import { Card, CardContent } from '@/components/ui/card';
import { AlertTriangle, TrendingUp } from 'lucide-react';

interface ForecastImpactProps {
  scenarioId?: string | null;
}

export function ForecastImpact({ scenarioId }: ForecastImpactProps) {
  const { data: scenario, isLoading: isScenarioLoading } = useScenario(scenarioId ?? null);
  const { data: baselineForecast, isLoading: isForecastLoading } = useLatestForecast();

  if (isScenarioLoading || (scenarioId && !scenario && isForecastLoading)) {
    return (
      <div className="p-3 text-xs text-muted-foreground text-center">
        Loading forecast consequences…
      </div>
    );
  }

  // If linked scenario exists, use its comparison
  if (scenario?.comparison) {
    const { baselineSummary, scenarioSummary, financing } = scenario.comparison;
    const minCashDelta = scenarioSummary.minCashMinor - baselineSummary.minCashMinor;

    return (
      <Card data-testid="forecast-impact">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
            <TrendingUp className="h-4 w-4 text-primary" />
            <span>Projected Liquidity Impact</span>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs font-mono">
            <div>
              <span className="text-muted-foreground block text-[11px] font-sans">
                Lowest Cash (Before)
              </span>
              <span className="text-foreground">
                {formatMinor(baselineSummary.minCashMinor)}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground block text-[11px] font-sans">
                Lowest Cash (After)
              </span>
              <span
                className={`font-semibold ${
                  minCashDelta >= 0
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-rose-600 dark:text-rose-400'
                }`}
                data-testid="impact-after-min-cash"
              >
                {formatMinor(scenarioSummary.minCashMinor)}
              </span>
            </div>

            <div>
              <span className="text-muted-foreground block text-[11px] font-sans">
                First Below Floor (Before)
              </span>
              <span className="font-sans text-muted-foreground">
                {baselineSummary.firstBelowFloorDate ?? 'None'}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground block text-[11px] font-sans">
                First Below Floor (After)
              </span>
              <span className="font-sans font-medium text-foreground">
                {scenarioSummary.firstBelowFloorDate ?? 'Remedied / None'}
              </span>
            </div>
          </div>

          {/* Repayment Warning if any shortfall occurs later */}
          {financing.repaymentWarnings.length > 0 && (
            <div
              role="alert"
              className="flex items-start gap-2 p-2.5 rounded-lg border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 text-xs"
              data-testid="impact-repayment-warning"
            >
              <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
              <div className="space-y-0.5">
                <span className="font-semibold block">Future Repayment Obligation:</span>
                <span>{financing.repaymentWarnings[0]!.message}</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  // Fallback when no scenario was linked directly: show baseline overview
  if (baselineForecast) {
    return (
      <Card data-testid="forecast-impact">
        <CardContent className="p-4 space-y-2 text-xs">
          <span className="font-medium text-foreground block">Current Baseline Baseline</span>
          <div className="grid grid-cols-2 gap-2 text-muted-foreground font-mono">
            <div>
              <span className="text-[11px] block font-sans">Current Floor Breach</span>
              <span>{baselineForecast.summary.firstBelowFloorDate ?? 'None'}</span>
            </div>
            <div>
              <span className="text-[11px] block font-sans">Current Lowest Cash</span>
              <span>{formatMinor(baselineForecast.summary.minCashMinor)}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return null;
}
