'use client';

import * as React from 'react';
import type { CustomerConcentration } from '@harbor/contracts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Money } from '@/components/data/money';
import { JargonTooltip } from '@/components/data/jargon-tooltip';
import { usePlainLanguage } from './plain-language-context';
import { SourceChip } from './source-chip';

export interface ConcentrationCardProps {
  concentration: CustomerConcentration;
}

export function ConcentrationCard({ concentration }: ConcentrationCardProps) {
  const { translate } = usePlainLanguage();
  const {
    topCustomerName,
    topCustomerArMinor,
    totalArMinor,
    shareBps,
    thresholdBps,
    isExceeded,
  } = concentration;

  const sharePercent = (shareBps / 100).toFixed(1);
  const thresholdPercent = (thresholdBps / 100).toFixed(1);

  return (
    <Card className="border-border/80 shadow-xs" data-testid="concentration-card">
      <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
        <div>
          <CardTitle className="text-sm font-semibold">
            <JargonTooltip term="customer-concentration">
              {translate('concentration', 'Customer Concentration')}
            </JargonTooltip>
          </CardTitle>
          <CardDescription className="text-xs">
            Credit risk exposure to top counterparty
          </CardDescription>
        </div>
        <SourceChip formulaKey="concentration" />
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-xs text-muted-foreground">Top Customer</p>
            <p className="text-sm font-semibold text-foreground">{topCustomerName}</p>
          </div>
          <Badge
            variant={isExceeded ? 'destructive' : 'secondary'}
            className="text-[11px] font-semibold"
          >
            {isExceeded ? `Exceeds ${(thresholdBps / 100).toString()}% Threshold` : 'Within Policy'}
          </Badge>
        </div>

        <div className="space-y-1.5">
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-bold font-mono text-foreground">
              {sharePercent}%
            </span>
            <span className="text-xs text-muted-foreground font-mono">
              Policy Limit: {thresholdPercent}%
            </span>
          </div>

          {/* Concentration visual bar */}
          <div className="h-2 w-full rounded-full bg-muted overflow-hidden relative">
            <div
              className={`h-full rounded-full transition-all ${
                isExceeded ? 'bg-red-500' : 'bg-primary'
              }`}
              style={{ width: `${Math.min(Number(sharePercent), 100)}%` }}
            />
          </div>
        </div>

        <div className="rounded-md bg-muted/50 p-2.5 border border-border/60 text-xs space-y-1">
          <div className="flex items-center justify-between text-muted-foreground">
            <span>Numerator (Top Customer AR):</span>
            <span className="font-mono text-foreground font-medium">
              <Money minor={topCustomerArMinor} />
            </span>
          </div>
          <div className="flex items-center justify-between text-muted-foreground">
            <span>Denominator (Total AR):</span>
            <span className="font-mono text-foreground font-medium">
              <Money minor={totalArMinor} />
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
