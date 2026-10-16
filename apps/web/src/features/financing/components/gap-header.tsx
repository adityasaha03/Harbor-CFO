'use client';

import { ShieldCheck, AlertTriangle, Calendar, DollarSign, Wallet } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatMinor } from '@harbor/contracts';

interface GapHeaderProps {
  requiredGapMinor: number;
  breachDate: string | null;
  floorMinor: number;
  openingCashMinor?: number;
}

export function GapHeader({
  requiredGapMinor,
  breachDate,
  floorMinor,
  openingCashMinor,
}: GapHeaderProps) {
  const hasGap = requiredGapMinor > 0;

  if (!hasGap) {
    return (
      <Card className="border-emerald-500/30 bg-emerald-50/50 dark:bg-emerald-950/20 backdrop-blur-sm shadow-sm transition-all">
        <CardContent className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-semibold text-emerald-900 dark:text-emerald-100">
                  No Cash Gap to Cover
                </h3>
                <Badge variant="outline" className="border-emerald-500/30 text-emerald-700 dark:text-emerald-300">
                  Healthy Liquidity
                </Badge>
              </div>
              <p className="text-sm text-emerald-700/80 dark:text-emerald-300/80 mt-0.5">
                Current projected cash balance stays above the operating floor ({formatMinor(floorMinor)}) throughout the entire 91-day horizon.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-6 text-sm text-muted-foreground shrink-0 border-t sm:border-t-0 sm:border-l sm:pl-6 pt-3 sm:pt-0 w-full sm:w-auto">
            {openingCashMinor !== undefined && (
              <div>
                <span className="text-xs uppercase tracking-wider block text-muted-foreground/70">Current Cash</span>
                <span className="font-semibold text-foreground">{formatMinor(openingCashMinor)}</span>
              </div>
            )}
            <div>
              <span className="text-xs uppercase tracking-wider block text-muted-foreground/70">Floor Target</span>
              <span className="font-semibold text-foreground">{formatMinor(floorMinor)}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {/* Required Liquidity Gap */}
      <Card className="border-amber-500/20 bg-gradient-to-br from-amber-50/40 via-background to-background dark:from-amber-950/20 shadow-sm">
        <CardContent className="p-5 flex items-center justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-amber-700 dark:text-amber-400">
              <AlertTriangle className="h-3.5 w-3.5" />
              Required Liquidity Gap
            </div>
            <div className="text-2xl font-bold tracking-tight text-foreground">
              {formatMinor(requiredGapMinor)}
            </div>
            <p className="text-xs text-muted-foreground">
              Deficit to restore floor reserve
            </p>
          </div>
          <div className="h-10 w-10 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0">
            <DollarSign className="h-5 w-5" />
          </div>
        </CardContent>
      </Card>

      {/* Earliest Breach Date */}
      <Card className="border-rose-500/20 bg-gradient-to-br from-rose-50/40 via-background to-background dark:from-rose-950/20 shadow-sm">
        <CardContent className="p-5 flex items-center justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-rose-700 dark:text-rose-400">
              <Calendar className="h-3.5 w-3.5" />
              Projected Breach Date
            </div>
            <div className="text-2xl font-bold tracking-tight text-foreground">
              {breachDate ?? 'None in horizon'}
            </div>
            <p className="text-xs text-muted-foreground">
              Date closing cash crosses floor
            </p>
          </div>
          <div className="h-10 w-10 rounded-full bg-rose-500/10 flex items-center justify-center text-rose-600 dark:text-rose-400 shrink-0">
            <Calendar className="h-5 w-5" />
          </div>
        </CardContent>
      </Card>

      {/* Operating Floor Target */}
      <Card className="border-border bg-gradient-to-br from-muted/30 via-background to-background shadow-sm">
        <CardContent className="p-5 flex items-center justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              <Wallet className="h-3.5 w-3.5" />
              Operating Cash Floor
            </div>
            <div className="text-2xl font-bold tracking-tight text-foreground">
              {formatMinor(floorMinor)}
            </div>
            <p className="text-xs text-muted-foreground">
              Configured minimum reserve
            </p>
          </div>
          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
            <Wallet className="h-5 w-5" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
