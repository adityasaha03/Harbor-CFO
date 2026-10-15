'use client';

import * as React from 'react';
import { Wallet, Shield, TrendingDown, AlertCircle, CheckCircle2 } from 'lucide-react';
import type { LatestForecastResponse } from '@/features/forecast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Money } from '@/components/data/money';
import { SourceChip } from './source-chip';

export interface CashSummaryCardsProps {
  forecast: LatestForecastResponse;
}

export function CashSummaryCards({ forecast }: CashSummaryCardsProps) {
  const { openingCashMinor, floorMinor, summary, asOfDate } = forecast;
  const isBreached = summary.liquidityGapMinor > 0 || summary.minCashMinor < floorMinor;

  return (
    <div
      data-testid="cash-summary-cards"
      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
    >
      {/* 1. Current Cash Card */}
      <Card className="relative overflow-hidden border-border/80 shadow-xs">
        <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
          <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Current Cash
          </CardTitle>
          <div className="flex items-center gap-1.5">
            <SourceChip formulaKey="cash" />
            <div className="p-1.5 rounded-md bg-primary/10 text-primary">
              <Wallet className="h-4 w-4" />
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-1">
          <div className="text-2xl font-bold tracking-tight">
            <Money minor={openingCashMinor} />
          </div>
          <p className="text-xs text-muted-foreground">
            As of <span className="font-medium text-foreground">{asOfDate}</span>
          </p>
        </CardContent>
      </Card>

      {/* 2. Liquidity Floor Card */}
      <Card className="relative overflow-hidden border-border/80 shadow-xs">
        <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
          <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Liquidity Floor
          </CardTitle>
          <div className="p-1.5 rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400">
            <Shield className="h-4 w-4" />
          </div>
        </CardHeader>
        <CardContent className="space-y-1">
          <div className="text-2xl font-bold tracking-tight">
            <Money minor={floorMinor} />
          </div>
          <p className="text-xs text-muted-foreground">Company minimum policy threshold</p>
        </CardContent>
      </Card>

      {/* 3. Lowest Projected Cash Card */}
      <Card
        className={`relative overflow-hidden shadow-xs transition-colors ${
          isBreached ? 'border-red-500/30 dark:border-red-900/50' : 'border-border/80'
        }`}
      >
        <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
          <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Lowest Projected Cash
          </CardTitle>
          <div
            className={`p-1.5 rounded-md ${
              isBreached
                ? 'bg-red-500/10 text-red-600 dark:text-red-400'
                : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
            }`}
          >
            <TrendingDown className="h-4 w-4" />
          </div>
        </CardHeader>
        <CardContent className="space-y-1">
          <div className="text-2xl font-bold tracking-tight">
            <Money minor={summary.minCashMinor} />
          </div>
          {isBreached ? (
            <p className="text-xs text-red-600 dark:text-red-400 font-medium flex items-center gap-1">
              <AlertCircle className="h-3.5 w-3.5 inline shrink-0" />
              <span>Projected on {summary.minCashDate}</span>
            </p>
          ) : (
            <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
              <CheckCircle2 className="h-3.5 w-3.5 inline shrink-0" />
              <span>No breach within 91 days</span>
            </p>
          )}
        </CardContent>
      </Card>

      {/* 4. Gap to Floor Card */}
      <Card
        className={`relative overflow-hidden shadow-xs transition-colors ${
          isBreached ? 'border-red-500/30 dark:border-red-900/50' : 'border-border/80'
        }`}
      >
        <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
          <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Gap to Floor
          </CardTitle>
          <div className="flex items-center gap-1.5">
            <SourceChip formulaKey="floorGap" />
            <div
              className={`p-1.5 rounded-md ${
                isBreached
                  ? 'bg-red-500/10 text-red-600 dark:text-red-400'
                  : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
              }`}
            >
              {isBreached ? (
                <AlertCircle className="h-4 w-4" />
              ) : (
                <CheckCircle2 className="h-4 w-4" />
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-1">
          {isBreached ? (
            <>
              <div className="text-2xl font-bold tracking-tight text-red-600 dark:text-red-400">
                <Money minor={summary.liquidityGapMinor} />
              </div>
              <p className="text-xs text-muted-foreground">Required funding to restore floor</p>
            </>
          ) : (
            <>
              <div className="text-lg font-bold tracking-tight text-emerald-600 dark:text-emerald-400 pt-1">
                No breach within 91 days
              </div>
              <p className="text-xs text-muted-foreground">Cash stays above liquidity floor</p>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
