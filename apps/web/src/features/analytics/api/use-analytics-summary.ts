'use client';

import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api/client';
import { queryKeys } from '@/lib/query/keys';
import type { AnalyticsSummary } from '@harbor/contracts';

/**
 * Anchor fixture analytics data for "Harbor Wholesale":
 * - Total AR: 60,000 CNY
 * - Top customer: 40,000 CNY (66.7% concentration, exceeds 40% threshold)
 * - 40,000 CNY in 1-30 days overdue bucket
 */
export const ANCHOR_ANALYTICS_MOCK: AnalyticsSummary = {
  arAging: {
    currentMinor: 2000000,
    days1to30Minor: 4000000,
    days31to60Minor: 0,
    days61to90Minor: 0,
    daysOver90Minor: 0,
    totalMinor: 6000000,
  },
  apAging: {
    currentMinor: 7500000,
    days1to30Minor: 1500000,
    days31to60Minor: 0,
    days61to90Minor: 0,
    daysOver90Minor: 0,
    totalMinor: 9000000,
  },
  concentration: {
    topCustomerExternalId: 'CUST-APEX',
    topCustomerName: 'Apex Distribution Ltd',
    topCustomerArMinor: 4000000,
    totalArMinor: 6000000,
    shareBps: 6670, // 66.7%
    thresholdBps: 4000, // 40.0%
    isExceeded: true,
  },
  monthlyBurnMinor: 12000000,
  runwayDays: 20,
  dsoDays: 45,
  lastImportAt: '2026-10-20T08:30:00Z',
};

export function useAnalyticsSummary(): UseQueryResult<AnalyticsSummary, Error> {
  return useQuery<AnalyticsSummary, Error>({
    queryKey: queryKeys.analytics.summary(),
    queryFn: async () => {
      try {
        return await apiFetch<AnalyticsSummary>('/analytics/summary');
      } catch {
        // Fallback stub while backend B11 is in development
        return ANCHOR_ANALYTICS_MOCK;
      }
    },
  });
}
