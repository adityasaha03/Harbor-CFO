'use client';

import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api/client';
import { queryKeys } from '@/lib/query/keys';
import type {
  ForecastSummaryWithConservative,
  WeeklyBucket,
  ForecastPoint,
  ForecastRunDto,
} from '@harbor/contracts';
import { buildAnchorFixture, ANCHOR_ASSUMPTIONS } from '../lib/anchor-fixture';

export interface LatestForecastResponse {
  asOfDate: string;
  openingCashMinor: number;
  floorMinor: number;
  summary: ForecastSummaryWithConservative;
  weeklyBuckets: WeeklyBucket[];
  points: ForecastPoint[];
  conservativePoints?: ForecastPoint[];
  assumptions: string[];
  inputVersion?: number;
  isStale: boolean;
  run?: ForecastRunDto;
}

const fixture = buildAnchorFixture();

/**
 * Full 91-day anchor fixture representing "Harbor Wholesale" baseline scenario:
 * Day 0 (2026-10-20) opening cash: 80,000 CNY (8,000,000 fen)
 * Floor: 30,000 CNY (3,000,000 fen)
 * First below floor: 2026-10-29
 * First negative: 2026-11-03
 * Minimum cash: -20,000 CNY (-2,000,000 fen) first on 2026-11-07
 * Day 21 (2026-11-10) closing: -20,000 CNY (-2,000,000 fen)
 * Liquidity gap: 50,000 CNY (5,000,000 fen)
 */
export const ANCHOR_FORECAST_MOCK: LatestForecastResponse = {
  asOfDate: fixture.asOfDate,
  openingCashMinor: fixture.openingCashMinor,
  floorMinor: fixture.floorMinor,
  summary: {
    minCashMinor: -2_000_000,
    minCashDate: '2026-11-10',
    firstBelowFloorDate: '2026-10-29',
    firstNegativeDate: '2026-11-03',
    liquidityGapMinor: 5_000_000,
    conservativeMinCashMinor: -2_000_000,
  },
  weeklyBuckets: fixture.weeklyBuckets,
  points: fixture.points,
  conservativePoints: fixture.conservativePoints,
  assumptions: fixture.assumptions,
  inputVersion: 1,
  isStale: false,
};

interface ApiForecastLatestEnvelope {
  run: ForecastRunDto;
  weeklyBuckets: WeeklyBucket[];
  asOfDate: string;
  horizonDays: number;
  assumptions: string[];
  inputVersion: number;
  isStale: boolean;
}

export function useLatestForecast(): UseQueryResult<LatestForecastResponse, Error> {
  return useQuery<LatestForecastResponse, Error>({
    queryKey: queryKeys.forecast.latest(),
    queryFn: async () => {
      try {
        const envelope = await apiFetch<ApiForecastLatestEnvelope | LatestForecastResponse>(
          '/forecasts/latest',
        );

        if ('run' in envelope && envelope.run) {
          return {
            asOfDate: envelope.asOfDate ?? envelope.run.asOfDate,
            openingCashMinor: envelope.run.openingCashMinor,
            floorMinor: envelope.run.floorMinor,
            summary: envelope.run.summary,
            weeklyBuckets: envelope.weeklyBuckets ?? [],
            points: envelope.run.points ?? [],
            conservativePoints: fixture.conservativePoints,
            assumptions: envelope.assumptions ?? ANCHOR_ASSUMPTIONS,
            inputVersion: envelope.inputVersion ?? envelope.run.inputVersion,
            isStale: Boolean(envelope.isStale),
            run: envelope.run,
          };
        }

        return envelope as LatestForecastResponse;
      } catch {
        // Fallback stub while backend B09 is in development or unreachable
        return ANCHOR_FORECAST_MOCK;
      }
    },
  });
}
