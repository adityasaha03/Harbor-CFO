'use client';

import * as React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatMinor, type RankedFinancingOffer } from '@harbor/contracts';
import { Landmark, ArrowRight } from 'lucide-react';
import Link from 'next/link';

export interface FacilitySummaryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ranked: RankedFinancingOffer;
  requiredGapMinor?: number;
  breachDate?: string | null;
  floorMinor?: number;
  openingCashMinor?: number;
}

export function FacilitySummaryDialog({
  open,
  onOpenChange,
  ranked,
  requiredGapMinor = 0,
  breachDate,
  floorMinor = 3_000_000,
  openingCashMinor,
}: FacilitySummaryDialogProps) {
  const { offer, schedule, impact } = ranked;
  const isProtected = impact.minCashMinor >= floorMinor;
  const isPositive = impact.minCashMinor >= 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="space-y-1.5 pb-2 border-b border-border/60">
          <div className="flex items-center gap-2">
            <div className="rounded-lg bg-primary/10 p-2 text-primary shrink-0">
              <Landmark className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-base sm:text-lg font-bold">
                Facility Summary: {offer.name}
              </DialogTitle>
              <DialogDescription className="text-xs">
                Plain-language breakdown of what this financing option means for your company
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-2 text-xs">
          {/* 1. Current State */}
          <div className="rounded-xl border border-border/70 bg-muted/30 p-3.5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-foreground flex items-center gap-1.5 uppercase text-[11px] tracking-wider text-muted-foreground">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-primary text-[10px] font-bold">1</span>
                Where You Stand Right Now (Current State)
              </span>
              {requiredGapMinor > 0 && (
                <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                  Cash Gap Detected
                </Badge>
              )}
            </div>
            <p className="text-muted-foreground leading-relaxed">
              {requiredGapMinor > 0 ? (
                <>
                  Your forecast projects a cash shortfall of{' '}
                  <strong className="text-destructive font-mono">{formatMinor(requiredGapMinor)}</strong>{' '}
                  {breachDate ? `around ${breachDate}` : 'in the coming weeks'}, dipping below your safety floor of{' '}
                  <strong className="font-mono text-foreground">{formatMinor(floorMinor)}</strong>
                  {openingCashMinor !== undefined && ` (current cash is ${formatMinor(openingCashMinor)})`}. Without working capital, the business risks missing scheduled obligations.
                </>
              ) : (
                <>
                  Your company currently maintains positive cash flow with a safety floor of{' '}
                  <strong className="font-mono text-foreground">{formatMinor(floorMinor)}</strong>. Exploring facilities provides a preemptive backup line for growth or unexpected supplier demands.
                </>
              )}
            </p>
          </div>

          {/* 2. The Plan */}
          <div className="rounded-xl border border-primary/20 bg-primary/5 p-3.5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-foreground flex items-center gap-1.5 uppercase text-[11px] tracking-wider text-primary">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground text-[10px] font-bold">2</span>
                The Plan (What This Facility Does)
              </span>
              <Badge variant="outline" className="text-[10px] bg-background">
                {offer.type.replace('_', ' ')}
              </Badge>
            </div>
            <p className="text-muted-foreground leading-relaxed">
              This facility draws down <strong className="text-foreground font-mono">{formatMinor(schedule.principalMinor)}</strong>.
              After an upfront fee of <strong className="font-mono text-foreground">{formatMinor(schedule.upfrontFeeMinor)}</strong>, a net sum of{' '}
              <strong className="text-emerald-600 dark:text-emerald-400 font-mono font-semibold">{formatMinor(schedule.netProceedsMinor)}</strong> will be deposited directly into your operating bank account within{' '}
              <strong>{offer.fundingDelayDays} {offer.fundingDelayDays === 1 ? 'business day' : 'business days'}</strong>.
            </p>
            <div className="pt-1.5 border-t border-primary/10 flex flex-wrap gap-4 text-[11px]">
              <div>
                <span className="text-muted-foreground">Total Borrowing Cost:</span>{' '}
                <strong className="text-foreground font-mono">{formatMinor(schedule.totalCostMinor)}</strong>
              </div>
              <div>
                <span className="text-muted-foreground">Repayment:</span>{' '}
                <strong className="text-foreground">{schedule.installments.length} installment{schedule.installments.length === 1 ? '' : 's'}</strong> ({formatMinor(schedule.totalRepaymentMinor)} total)
              </div>
            </div>
          </div>

          {/* 3. After Execution */}
          <div className="rounded-xl border border-border/70 bg-muted/30 p-3.5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-foreground flex items-center gap-1.5 uppercase text-[11px] tracking-wider text-muted-foreground">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold">3</span>
                After Execution (Your New Position)
              </span>
              {isProtected ? (
                <Badge variant="secondary" className="text-[10px] text-emerald-600 dark:text-emerald-400 bg-emerald-500/10">
                  Floor Protected
                </Badge>
              ) : isPositive ? (
                <Badge variant="secondary" className="text-[10px] text-amber-600 dark:text-amber-400 bg-amber-500/10">
                  Above Zero
                </Badge>
              ) : (
                <Badge variant="destructive" className="text-[10px]">
                  Requires Review
                </Badge>
              )}
            </div>
            <p className="text-muted-foreground leading-relaxed">
              With this facility active, your projected lowest cash balance improves to{' '}
              <strong className={`font-mono font-bold ${isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-destructive'}`}>
                {formatMinor(impact.minCashMinor)}
              </strong>.
              {isProtected ? (
                ' Your safety buffer is completely preserved and your upcoming shortfall is resolved.'
              ) : isPositive ? (
                ' The immediate crisis is solved, keeping cash positive while you collect on customer invoices.'
              ) : (
                ' Caution: repayment timing should be simulated to ensure future installments fit your collections schedule.'
              )}
            </p>
          </div>
        </div>

        <DialogFooter className="pt-2 border-t border-border/60 flex flex-row items-center justify-between sm:justify-between gap-2">
          <Button asChild size="sm" variant="outline" className="text-xs gap-1.5">
            <Link
              href={`/scenarios?preset=offer:${offer.code}&amount=${schedule.principalMinor}`}
              onClick={() => onOpenChange(false)}
            >
              Simulate in Scenarios
              <ArrowRight className="h-3 w-3" />
            </Link>
          </Button>
          <Button
            type="button"
            variant="default"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="text-xs"
          >
            Got It
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

