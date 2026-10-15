'use client';

import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api/client';
import { queryKeys } from '@/lib/query/keys';
import type { ForecastSummary, WeeklyBucket, ForecastPoint } from '@harbor/contracts';

export interface LatestForecastResponse {
  asOfDate: string;
  openingCashMinor: number;
  floorMinor: number;
  summary: ForecastSummary;
  weeklyBuckets: WeeklyBucket[];
  points: ForecastPoint[];
  isStale: boolean;
}

/**
 * Anchor fixture data representing "Harbor Wholesale" baseline scenario:
 * Day 0 (2026-10-20) opening cash: 80,000 CNY
 * Floor: 30,000 CNY
 * Day 21 (2026-11-10) minimum cash: -20,000 CNY (Gap: 50,000 CNY)
 */
export const ANCHOR_FORECAST_MOCK: LatestForecastResponse = {
  asOfDate: '2026-10-20',
  openingCashMinor: 8000000,
  floorMinor: 3000000,
  summary: {
    minCashMinor: -2000000,
    minCashDate: '2026-11-10',
    firstBelowFloorDate: '2026-10-29',
    firstNegativeDate: '2026-11-06',
    liquidityGapMinor: 5000000,
  },
  weeklyBuckets: [
    {
      startDate: '2026-10-20',
      endDate: '2026-10-26',
      closingMinor: 7500000,
      minMinor: 7500000,
      receiptsMinor: 500000,
      paymentsMinor: 1000000,
      financingMinor: 0,
      feesMinor: 0,
      repaymentsMinor: 0,
    },
    {
      startDate: '2026-10-27',
      endDate: '2026-11-02',
      closingMinor: 2500000,
      minMinor: 2500000,
      receiptsMinor: 1000000,
      paymentsMinor: 6000000,
      financingMinor: 0,
      feesMinor: 0,
      repaymentsMinor: 0,
    },
    {
      startDate: '2026-11-03',
      endDate: '2026-11-09',
      closingMinor: 500000,
      minMinor: 500000,
      receiptsMinor: 1000000,
      paymentsMinor: 3000000,
      financingMinor: 0,
      feesMinor: 0,
      repaymentsMinor: 0,
    },
    {
      startDate: '2026-11-10',
      endDate: '2026-11-16',
      closingMinor: -2000000,
      minMinor: -2000000,
      receiptsMinor: 0,
      paymentsMinor: 2500000,
      financingMinor: 0,
      feesMinor: 0,
      repaymentsMinor: 0,
    },
    {
      startDate: '2026-11-17',
      endDate: '2026-11-23',
      closingMinor: 1500000,
      minMinor: -1500000,
      receiptsMinor: 4000000,
      paymentsMinor: 500000,
      financingMinor: 0,
      feesMinor: 0,
      repaymentsMinor: 0,
    },
    {
      startDate: '2026-11-24',
      endDate: '2026-11-30',
      closingMinor: 1800000,
      minMinor: 1500000,
      receiptsMinor: 800000,
      paymentsMinor: 500000,
      financingMinor: 0,
      feesMinor: 0,
      repaymentsMinor: 0,
    },
    {
      startDate: '2026-12-01',
      endDate: '2026-12-07',
      closingMinor: 2200000,
      minMinor: 1800000,
      receiptsMinor: 900000,
      paymentsMinor: 500000,
      financingMinor: 0,
      feesMinor: 0,
      repaymentsMinor: 0,
    },
    {
      startDate: '2026-12-08',
      endDate: '2026-12-14',
      closingMinor: 2500000,
      minMinor: 2200000,
      receiptsMinor: 800000,
      paymentsMinor: 500000,
      financingMinor: 0,
      feesMinor: 0,
      repaymentsMinor: 0,
    },
  ],
  points: [
    {
      date: '2026-10-20',
      closingMinor: 8000000,
      receiptsMinor: 0,
      paymentsMinor: 0,
      financingMinor: 0,
      feesMinor: 0,
      repaymentsMinor: 0,
      sources: [],
    },
    {
      date: '2026-11-10',
      closingMinor: -2000000,
      receiptsMinor: 0,
      paymentsMinor: 2500000,
      financingMinor: 0,
      feesMinor: 0,
      repaymentsMinor: 0,
      sources: [
        {
          type: 'commitment',
          id: 'comm_payroll',
          label: 'Payroll',
          amountMinor: -4500000,
        },
      ],
    },
  ],
  isStale: false,
};

export function useLatestForecast(): UseQueryResult<LatestForecastResponse, Error> {
  return useQuery<LatestForecastResponse, Error>({
    queryKey: queryKeys.forecast.latest(),
    queryFn: async () => {
      try {
        return await apiFetch<LatestForecastResponse>('/forecasts/latest');
      } catch {
        // Fallback stub while backend B09 is in development
        return ANCHOR_FORECAST_MOCK;
      }
    },
  });
}
