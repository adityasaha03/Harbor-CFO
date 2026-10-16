import * as React from 'react';
import { ForecastView } from '@/features/forecast';
import { Skeleton } from '@/components/ui/skeleton';

export const metadata = {
  title: 'Cash Forecast | HarborCFO',
  description: '91-day deterministic cash trajectory with drill-down cash flow provenance.',
};

export default function ForecastPage() {
  return (
    <React.Suspense
      fallback={
        <div className="space-y-6">
          <Skeleton className="h-10 w-64" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Skeleton className="h-28 w-full" />
            <Skeleton className="h-28 w-full" />
            <Skeleton className="h-28 w-full" />
            <Skeleton className="h-28 w-full" />
          </div>
          <Skeleton className="h-80 w-full" />
        </div>
      }
    >
      <ForecastView />
    </React.Suspense>
  );
}
