'use client';

import { useState } from 'react';
import { Sparkles, Layers, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useLatestForecast } from '@/features/forecast';
import type { FinancingMatchInput } from '@harbor/contracts';
import { useMatchFinancing } from '../api/use-match-financing';
import { GapHeader } from './gap-header';
import { MatchControls } from './match-controls';
import { OfferCard } from './offer-card';
import { ExcludedOffers } from './excluded-offers';
import { CannotAssessOffers } from './cannot-assess-offers';
import { FinancingDisclaimer } from './financing-disclaimer';

export function FinancingWorkspace() {
  const [matchInput, setMatchInput] = useState<FinancingMatchInput>({
    purpose: 'working_capital',
    desiredAmountMinor: undefined,
  });

  const { data: forecast, isLoading: isForecastLoading } = useLatestForecast();
  const {
    data: matchData,
    isLoading: isMatchLoading,
    refetch,
    isFetching,
  } = useMatchFinancing(matchInput);

  const floorMinor = forecast?.floorMinor ?? 3_000_000;
  const openingCashMinor = forecast?.openingCashMinor;
  const requiredGapMinor = matchData?.requiredGapMinor ?? forecast?.summary.liquidityGapMinor ?? 0;
  const breachDate = matchData?.breachDate ?? forecast?.summary.firstBelowFloorDate ?? null;

  const eligibleOffers = matchData?.eligible ?? [];
  const excludedOffers = matchData?.excluded ?? [];
  const cannotAssessOffers = matchData?.cannotAssess ?? [];

  return (
    <div className="space-y-6">
      {/* 1. Liquidity Gap & Status Header */}
      {isForecastLoading && !forecast ? (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Skeleton className="h-28 rounded-xl" />
          <Skeleton className="h-28 rounded-xl" />
          <Skeleton className="h-28 rounded-xl" />
        </div>
      ) : (
        <GapHeader
          requiredGapMinor={requiredGapMinor}
          breachDate={breachDate}
          floorMinor={floorMinor}
          openingCashMinor={openingCashMinor}
        />
      )}

      {/* 2. Simulation & Matching Controls */}
      <MatchControls
        value={matchInput}
        onChange={setMatchInput}
        isLoading={isMatchLoading}
      />

      {/* 3. Eligible Facilities Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold tracking-tight text-foreground flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              Eligible Facilities ({eligibleOffers.length})
            </h2>
            <span className="text-xs text-muted-foreground hidden sm:inline">
              Ranked by multi-factor fitness score
            </span>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
            className="h-8 text-xs text-muted-foreground hover:text-foreground"
          >
            <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${isFetching ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {isMatchLoading && eligibleOffers.length === 0 ? (
          <div className="space-y-4">
            <Skeleton className="h-56 rounded-xl" />
            <Skeleton className="h-56 rounded-xl" />
          </div>
        ) : eligibleOffers.length > 0 ? (
          <div className="space-y-4">
            {eligibleOffers.map((ranked, index) => (
              <OfferCard
                key={ranked.offer.code}
                ranked={ranked}
                rankIndex={index}
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center p-8 rounded-xl border border-dashed border-border text-center space-y-2 bg-muted/20">
            <Layers className="h-8 w-8 text-muted-foreground/60" />
            <h4 className="text-sm font-semibold text-foreground">
              No Eligible Facilities for Current Parameters
            </h4>
            <p className="text-xs text-muted-foreground max-w-md">
              Try adjusting the requested purpose or override amount, or review the excluded facilities below.
            </p>
          </div>
        )}
      </div>

      {/* 4. Excluded Facilities Section */}
      <ExcludedOffers excluded={excludedOffers} />

      {/* 5. Cannot Assess Section */}
      <CannotAssessOffers cannotAssess={cannotAssessOffers} />

      {/* 6. Regulatory Disclaimer */}
      <FinancingDisclaimer />
    </div>
  );
}
