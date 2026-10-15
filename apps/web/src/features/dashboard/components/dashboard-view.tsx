'use client';

import * as React from 'react';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/feedback/error-state';
import { useLatestForecast } from '@/features/forecast';
import { useAnalyticsSummary } from '@/features/analytics';
import { useAlerts } from '@/features/alerts';
import { TopAlertBanner } from './top-alert-banner';
import { CashSummaryCards } from './cash-summary-cards';
import { CashCurveChart } from './cash-curve-chart';
import { AgingCard } from './aging-card';
import { ConcentrationCard } from './concentration-card';
import { DataFreshnessCard } from './data-freshness-card';
import { InsightsList } from './insights-list';
import { HealthScoreCard } from './health-score-card';

export function DashboardView() {
  const forecastQuery = useLatestForecast();
  const analyticsQuery = useAnalyticsSummary();
  const alertsQuery = useAlerts();

  const isLoading = forecastQuery.isLoading || analyticsQuery.isLoading;
  const isError = forecastQuery.isError || analyticsQuery.isError;
  const error = forecastQuery.error ?? analyticsQuery.error;

  if (isLoading) {
    return (
      <div className="space-y-6" data-testid="dashboard-loading">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-6 w-28" />
        </div>
        <Skeleton className="h-16 w-full" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-28 w-full" />
        </div>
        <Skeleton className="h-80 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (isError) {
    return (
      <ErrorState
        title="Failed to load dashboard"
        message={error instanceof Error ? error.message : 'An error occurred loading financial data.'}
        onRetry={() => {
          void forecastQuery.refetch();
          void analyticsQuery.refetch();
        }}
      />
    );
  }

  const forecast = forecastQuery.data;
  const analytics = analyticsQuery.data;

  if (!forecast || !analytics) {
    return null;
  }

  return (
    <div className="space-y-6" data-testid="dashboard-view">
      {/* Dashboard Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-border/60">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Financial Cockpit
          </h1>
          <p className="text-xs text-muted-foreground">
            Deterministic cash runway, risk alerts, and liquidity exposure
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-[11px] font-mono text-muted-foreground">
            Synthetic Demo Data
          </Badge>
        </div>
      </div>

      {/* Top Alert Banner */}
      <TopAlertBanner alerts={alertsQuery.data} />

      {/* Key Metric Cards */}
      <CashSummaryCards forecast={forecast} />

      {/* 13-Week Cash Trajectory Chart */}
      <CashCurveChart forecast={forecast} />

      {/* Deterministic Actionable Insights */}
      <InsightsList forecast={forecast} analytics={analytics} />

      {/* Risk, Aging, and Freshness Details Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <AgingCard analytics={analytics} />
        <ConcentrationCard concentration={analytics.concentration} />
        <div className="space-y-6">
          <DataFreshnessCard
            lastImportAt={analytics.lastImportAt}
            isStale={forecast.isStale}
          />
          <HealthScoreCard />
        </div>
      </div>
    </div>
  );
}
