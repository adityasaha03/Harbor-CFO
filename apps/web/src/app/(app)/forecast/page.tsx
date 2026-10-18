import * as React from 'react';
import { ForecastView } from '@/features/forecast';
import { Skeleton } from '@/components/ui/skeleton';
import { PageIntro } from '@/components/layout/page-intro';
import { TrendingUp } from 'lucide-react';

export const metadata = {
  title: 'Cash Forecast | HarborCFO',
  description: 'See exactly how much cash your business will have over the next 3 months.',
};

export default function ForecastPage() {
  return (
    <div className="space-y-6">
      <PageIntro
        storageKey="harbor_intro_forecast"
        icon={TrendingUp}
        title="What is the Cash Forecast?"
        description="This page shows you exactly how much money your business will have each day for the next 3 months. It uses your real bank transactions and invoices to calculate this — no guessing involved."
        tips={[
          'Click any day on the chart to see exactly which payments come in or go out',
          'Red zones mean your cash drops below your safety target — time to take action!',
          'Use the Weekly Table view for a simpler week-by-week breakdown',
        ]}
      />
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
    </div>
  );
}
