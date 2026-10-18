'use client';

import * as React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatMinor, type CreateScenarioResponse, type ScenarioChange } from '@harbor/contracts';
import { Sparkles, CheckCircle2, AlertTriangle, FileText, ArrowRight } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';

export interface ScenarioSummaryCardProps {
  scenario: CreateScenarioResponse;
  floorMinor?: number;
}

function formatChangeDescription(c: ScenarioChange): string {
  switch (c.type) {
    case 'add_financing':
      return `Draw down ${formatMinor(c.principalMinor)} from ${c.offerCode.replace(/[-_]/g, ' ')} facility`;
    case 'defer_payment':
      return `Postpone payable invoice ${c.invoiceExternalId} to ${c.newExpectedSettlementOn}`;
    case 'move_receipt':
      return `Advance customer receivable invoice ${c.invoiceExternalId} to ${c.newExpectedSettlementOn}`;
    case 'add_recurring':
      return `Add ${c.direction} commitment '${c.label}' of ${formatMinor(c.amountMinor)} (${c.frequency})`;
    case 'delay_customer_receipts':
      return `Model a ${c.days}-day delay in payments from customer ${c.counterpartyExternalId}`;
    default:
      return 'Custom cash flow modification';
  }
}

export function ScenarioSummaryCard({ scenario, floorMinor = 3_000_000 }: ScenarioSummaryCardProps) {
  const [openModal, setOpenModal] = React.useState(false);
  const { baselineSummary, scenarioSummary, deltas, financing, scenario: dto } = scenario;

  const baselineMin = baselineSummary.minCashMinor;
  const scenarioMin = scenarioSummary.minCashMinor;
  const isFloorBreachedBefore = baselineMin < floorMinor;
  const isFloorProtectedAfter = scenarioMin >= floorMinor;
  const isCrisisAverted = baselineMin < 0 && scenarioMin >= 0;
  const isGapResolved = scenarioSummary.liquidityGapMinor === 0;

  const changesList = dto.changes || [];

  return (
    <>
      <Card className="border-primary/30 bg-gradient-to-br from-primary/5 via-card to-background shadow-xs overflow-hidden">
        <CardContent className="p-4 sm:p-5 space-y-3.5">
          {/* Header Row */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-border/50">
            <div className="flex items-center gap-2">
              <div className="rounded-lg bg-primary/10 p-1.5 text-primary shrink-0">
                <Sparkles className="h-4 w-4" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-foreground">
                  Scenario Impact Summary: {dto.name}
                </h4>
                <p className="text-[11px] text-muted-foreground">
                  Executive summary of how this what-if scenario impacts company cash
                </p>
              </div>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setOpenModal(true)}
              className="h-7 text-xs gap-1.5 self-start sm:self-auto border-primary/30 hover:bg-primary/10 hover:text-primary"
              data-testid="view-scenario-summary-btn"
            >
              <FileText className="h-3 w-3 text-primary" />
              <span>View Full 3-Step Breakdown</span>
            </Button>
          </div>

          {/* Quick 3-Pillar Summary Row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
            {/* 1. Baseline */}
            <div className="p-3 rounded-lg bg-muted/40 border border-border/60 space-y-1">
              <span className="font-semibold text-muted-foreground uppercase text-[10px] tracking-wider block">
                1. Current Baseline State
              </span>
              <p className="font-mono text-sm font-bold text-foreground">
                {formatMinor(baselineMin)}
              </p>
              <p className="text-[11px] text-muted-foreground leading-snug">
                {isFloorBreachedBefore
                  ? `Breached safety floor${baselineSummary.firstBelowFloorDate ? ` on ${baselineSummary.firstBelowFloorDate}` : ''} (gap: ${formatMinor(baselineSummary.liquidityGapMinor)}).`
                  : 'Operating above safety target.'}
              </p>
            </div>

            {/* 2. The Plan */}
            <div className="p-3 rounded-lg bg-primary/5 border border-primary/20 space-y-1">
              <span className="font-semibold text-primary uppercase text-[10px] tracking-wider block">
                2. What You Tested ({changesList.length} change{changesList.length === 1 ? '' : 's'})
              </span>
              <p className="text-xs font-medium text-foreground line-clamp-1">
                {changesList.length > 0 ? formatChangeDescription(changesList[0]!) : 'Modified scenario'}
              </p>
              <p className="text-[11px] text-muted-foreground leading-snug">
                {financing.principalMinor > 0
                  ? `Borrowing ${formatMinor(financing.principalMinor)} (cost: ${formatMinor(financing.totalCostMinor)}).`
                  : `${changesList.length} operational cash flow adjustments.`}
              </p>
            </div>

            {/* 3. Result */}
            <div className="p-3 rounded-lg bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/60 space-y-1">
              <span className="font-semibold text-emerald-800 dark:text-emerald-300 uppercase text-[10px] tracking-wider block">
                3. Resulting State
              </span>
              <p className="font-mono text-sm font-bold text-emerald-700 dark:text-emerald-300">
                {formatMinor(scenarioMin)}{' '}
                <span className="text-[11px] font-normal font-mono">
                  ({deltas.minCashMinor >= 0 ? '+' : ''}{formatMinor(deltas.minCashMinor)})
                </span>
              </p>
              <p className="text-[11px] text-emerald-800/90 dark:text-emerald-300/90 leading-snug">
                {isGapResolved ? 'Shortfall fully resolved! Buffer preserved.' : isCrisisAverted ? 'Cash remains positive above zero.' : 'Improves cash balance.'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Detailed Modal Breakdown */}
      <Dialog open={openModal} onOpenChange={setOpenModal}>
        <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader className="pb-2 border-b border-border/60">
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" />
              Scenario Analysis: {dto.name}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Clear 3-step comparison between your baseline forecast and this simulated scenario
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3.5 py-2 text-xs">
            <div className="rounded-xl border border-border/70 bg-muted/30 p-3.5 space-y-1.5">
              <span className="font-semibold text-foreground uppercase text-[10px] tracking-wider text-muted-foreground flex items-center gap-1.5">
                <span className="flex h-4 w-4 items-center justify-center rounded-full bg-primary/10 text-primary text-[9px] font-bold">1</span>
                Baseline Position (Before Scenario)
              </span>
              <p className="text-muted-foreground leading-relaxed">
                Without any interventions, your cash was projected to fall to a minimum of{' '}
                <strong className="text-foreground font-mono">{formatMinor(baselineMin)}</strong>
                {baselineSummary.firstBelowFloorDate && ` on ${baselineSummary.firstBelowFloorDate}`}, leaving an unfinanced liquidity gap of{' '}
                <strong className="text-destructive font-mono">{formatMinor(baselineSummary.liquidityGapMinor)}</strong> below your {formatMinor(floorMinor)} safety floor.
              </p>
            </div>

            <div className="rounded-xl border border-primary/20 bg-primary/5 p-3.5 space-y-1.5">
              <span className="font-semibold text-primary uppercase text-[10px] tracking-wider flex items-center gap-1.5">
                <span className="flex h-4 w-4 items-center justify-center rounded-full bg-primary text-primary-foreground text-[9px] font-bold">2</span>
                The Scenario Plan (Applied Changes)
              </span>
              <ul className="space-y-1 pl-4 list-disc text-muted-foreground">
                {changesList.map((ch, idx) => (
                  <li key={idx} className="leading-snug">
                    <strong className="text-foreground">{formatChangeDescription(ch)}</strong>
                  </li>
                ))}
              </ul>
              {financing.principalMinor > 0 && (
                <p className="text-[11px] text-muted-foreground pt-1 border-t border-primary/10">
                  Total financing cost: <strong className="text-foreground font-mono">{formatMinor(financing.totalCostMinor)}</strong> | Repayments total: <strong className="text-foreground font-mono">{formatMinor(financing.repaymentsTotalMinor)}</strong>
                </p>
              )}
            </div>

            <div className="rounded-xl border border-emerald-200 dark:border-emerald-800/60 bg-emerald-50/50 dark:bg-emerald-950/20 p-3.5 space-y-1.5">
              <span className="font-semibold text-emerald-800 dark:text-emerald-300 uppercase text-[10px] tracking-wider flex items-center gap-1.5">
                <span className="flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[9px] font-bold">3</span>
                Future State (After Executing Scenario)
              </span>
              <p className="text-emerald-900/90 dark:text-emerald-200/90 leading-relaxed">
                Your lowest cash increases by{' '}
                <strong className="font-mono">{deltas.minCashMinor >= 0 ? '+' : ''}{formatMinor(deltas.minCashMinor)}</strong> to{' '}
                <strong className="font-mono">{formatMinor(scenarioMin)}</strong>.
                {isFloorProtectedAfter ? (
                  ' Your emergency floor is fully secured, completely preventing the cash breach.'
                ) : isCrisisAverted ? (
                  ' Cash avoids turning negative, ensuring operations continue without missed payroll.'
                ) : (
                  ' Cash balance is significantly bolstered.'
                )}
              </p>
            </div>
          </div>

          <DialogFooter className="pt-2 border-t border-border/60">
            <Button
              type="button"
              variant="default"
              size="sm"
              onClick={() => setOpenModal(false)}
              className="text-xs"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

