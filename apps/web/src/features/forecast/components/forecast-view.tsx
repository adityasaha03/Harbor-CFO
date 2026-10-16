'use client';

import * as React from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/feedback/error-state';
import { Badge } from '@/components/ui/badge';
import { useLatestForecast } from '../api/use-latest-forecast';
import { ForecastChart } from './forecast-chart';
import { BreachSummary } from './breach-summary';
import { AssumptionsPanel } from './assumptions-panel';
import { WeeklyTable } from './weekly-table';
import { DayDrilldownDrawer } from './day-drilldown-drawer';

export function ForecastView() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const forecastQuery = useLatestForecast();
  const dateParam = searchParams.get('date');

  const [selectedDate, setSelectedDate] = React.useState<string | null>(dateParam);

  // Sync state if URL search param changes
  React.useEffect(() => {
    setSelectedDate(dateParam);
  }, [dateParam]);

  const handleSelectDate = (date: string) => {
    setSelectedDate(date);
    const params = new URLSearchParams(searchParams.toString());
    params.set('date', date);
    router.push(`${pathname}?${params.toString()}`);
  };

  const handleCloseDrawer = () => {
    setSelectedDate(null);
    const params = new URLSearchParams(searchParams.toString());
    params.delete('date');
    const newUrl = params.toString() ? `${pathname}?${params.toString()}` : pathname;
    router.push(newUrl);
  };

  if (forecastQuery.isLoading) {
    return (
      <div className="space-y-6" data-testid="forecast-loading">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-6 w-28" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-28 w-full" />
        </div>
        <Skeleton className="h-80 w-full" />
        <Skeleton className="h-44 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (forecastQuery.isError || !forecastQuery.data) {
    return (
      <ErrorState
        title="Failed to load cash forecast"
        message={
          forecastQuery.error instanceof Error
            ? forecastQuery.error.message
            : 'An unexpected error occurred while fetching the latest cash forecast.'
        }
        onRetry={() => {
          void forecastQuery.refetch();
        }}
      />
    );
  }

  const forecast = forecastQuery.data;

  return (
    <div className="space-y-6" data-testid="forecast-view">
      {/* Forecast Page Subheader / Meta Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-1 border-b border-border/60">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Cash Runway & Trajectory
          </h1>
          <p className="text-xs text-muted-foreground">
            91-day deterministic cash flow projection with verified event provenance
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-[11px] font-mono text-muted-foreground">
            Synthetic Demo Data
          </Badge>
        </div>
      </div>

      {/* 1. Breach Summary */}
      <BreachSummary forecast={forecast} onSelectDate={handleSelectDate} />

      {/* 2. Interactive Chart */}
      <ForecastChart
        forecast={forecast}
        onSelectDate={handleSelectDate}
        selectedDate={selectedDate}
      />

      {/* 3. Methodology & Assumptions Panel */}
      <AssumptionsPanel forecast={forecast} />

      {/* 4. Accessible Weekly Schedule Table */}
      <WeeklyTable forecast={forecast} onSelectDate={handleSelectDate} />

      {/* 5. Provenance Drilldown Drawer */}
      <DayDrilldownDrawer
        date={selectedDate}
        isOpen={Boolean(selectedDate)}
        onClose={handleCloseDrawer}
      />
    </div>
  );
}
