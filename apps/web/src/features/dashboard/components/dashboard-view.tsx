'use client';

import * as React from 'react';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/feedback/error-state';
import { ForbiddenState } from '@/features/auth';
import { ApiError } from '@/lib/api/errors';
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
import { DemoGuide } from './demo-guide';
import { WelcomeBanner } from './welcome-banner';
import { PlainLanguageProvider } from './plain-language-context';
import { PlainLanguageToggle } from './plain-language-toggle';

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
    const isForbidden =
      (ApiError.isApiError(error) && (error.status === 403 || error.code === 'FORBIDDEN')) ||
      (typeof error === 'object' &&
        error !== null &&
        'status' in error &&
        (error as { status?: number }).status === 403) ||
      (error instanceof Error &&
        (error.message.toLowerCase().includes('forbidden') ||
          error.message.includes('403') ||
          error.message.toLowerCase().includes('insufficient permissions')));

    if (isForbidden) {
      return (
        <ForbiddenState
          message={
            error instanceof Error
              ? error.message
              : 'Your current role does not have permission to view dashboard financials.'
          }
        />
      );
    }

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
    <PlainLanguageProvider>
      <div className="space-y-6" data-testid="dashboard-view">
        {/* Dashboard Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-border/60">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Your Business Dashboard
            </h1>
            <p className="text-xs text-muted-foreground">
              See how your business is doing at a glance — cash position, upcoming payments, and alerts
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <PlainLanguageToggle />
            <Badge variant="outline" className="text-[11px] font-mono text-muted-foreground">
              Synthetic Demo Data
            </Badge>
          </div>
        </div>

        {/* Welcome Banner */}
        <WelcomeBanner />

        {/* Competition Reviewer & Demo Guide */}
        <DemoGuide />

        {/* Top Alert Banner */}
        <TopAlertBanner alerts={alertsQuery.data} />

        {/* Your Key Numbers */}
        <CashSummaryCards forecast={forecast} />

        {/* Your Cash Flow Over Time */}
        <CashCurveChart forecast={forecast} />

        {/* What You Should Know */}
        <InsightsList forecast={forecast} analytics={analytics} />

        {/* Detailed Breakdown */}
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
    </PlainLanguageProvider>
  );
}
