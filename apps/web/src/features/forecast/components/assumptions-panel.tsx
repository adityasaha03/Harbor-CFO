'use client';

import * as React from 'react';
import { Check, X, AlertTriangle, Info, Calendar } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { LatestForecastResponse } from '../api/use-latest-forecast';

export interface AssumptionsPanelProps {
  forecast: LatestForecastResponse;
}

export function AssumptionsPanel({ forecast }: AssumptionsPanelProps) {
  const { asOfDate, inputVersion, isStale } = forecast;

  return (
    <Card className="border-border/80 shadow-2xs" data-testid="assumptions-panel">
      <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 gap-2">
        <div>
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Info className="h-4 w-4 text-primary" />
            Forecast Assumptions & Model Boundaries
          </CardTitle>
          <CardDescription className="text-xs">
            Deterministic forecasting rules, data freshness, and input coverage
          </CardDescription>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <Badge variant="outline" className="font-mono text-muted-foreground gap-1">
            <Calendar className="h-3 w-3" />
            As of: {asOfDate}
          </Badge>
          <Badge variant="secondary" className="font-mono text-[11px]">
            Data Version: v{inputVersion ?? 1}
          </Badge>
          {isStale ? (
            <Badge
              variant="destructive"
              className="gap-1 animate-pulse"
              data-testid="stale-warning-badge"
            >
              <AlertTriangle className="h-3 w-3" />
              Stale: New data available
            </Badge>
          ) : (
            <Badge variant="outline" className="text-emerald-600 dark:text-emerald-400 border-emerald-500/30">
              Up to date
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4 pt-1">
        {isStale && (
          <div
            className="rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-800 dark:text-amber-200 flex items-start gap-2"
            data-testid="stale-warning-box"
          >
            <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
            <span>
              <strong>Notice:</strong> Recent ledger entries or invoice changes have occurred since this forecast run was generated. A re-forecast is pending event synchronization.
            </span>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          {/* Included factors */}
          <div className="rounded-lg border border-border/60 bg-muted/20 p-3.5 space-y-2">
            <p className="font-semibold text-foreground flex items-center gap-1.5">
              <Check className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              Included in Projection (Deterministic)
            </p>
            <ul className="space-y-1.5 text-muted-foreground pl-1">
              <li className="flex items-start gap-1.5">
                <span className="text-emerald-600 font-bold">•</span>
                <span>Outstanding invoices (AR & AP) mapped to expected settlement dates.</span>
              </li>
              <li className="flex items-start gap-1.5">
                <span className="text-emerald-600 font-bold">•</span>
                <span>Fixed recurring commitments (payroll, rent, scheduled overhead).</span>
              </li>
              <li className="flex items-start gap-1.5">
                <span className="text-emerald-600 font-bold">•</span>
                <span>Approved sandbox financing drawdowns, fees, and installment schedules.</span>
              </li>
              <li className="flex items-start gap-1.5">
                <span className="text-emerald-600 font-bold">•</span>
                <span>Conservative variant: delays overdue receivables by 14 days (assumption scenario, not a statistical confidence band).</span>
              </li>
            </ul>
          </div>

          {/* Excluded factors */}
          <div className="rounded-lg border border-border/60 bg-muted/20 p-3.5 space-y-2">
            <p className="font-semibold text-foreground flex items-center gap-1.5">
              <X className="h-4 w-4 text-rose-600 dark:text-rose-400" />
              Excluded from Projection (Non-Speculative)
            </p>
            <ul className="space-y-1.5 text-muted-foreground pl-1">
              <li className="flex items-start gap-1.5">
                <span className="text-rose-600 font-bold">•</span>
                <span>No unscheduled sales or speculative revenue projections.</span>
              </li>
              <li className="flex items-start gap-1.5">
                <span className="text-rose-600 font-bold">•</span>
                <span>No uncommitted or hypothetical loan offers before sandbox execution.</span>
              </li>
              <li className="flex items-start gap-1.5">
                <span className="text-rose-600 font-bold">•</span>
                <span>No AI hallucination of cash numbers; pure calculation from verified records.</span>
              </li>
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
