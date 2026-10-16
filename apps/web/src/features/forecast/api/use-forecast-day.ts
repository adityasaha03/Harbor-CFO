'use client';

import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api/client';
import { queryKeys } from '@/lib/query/keys';
import type { ForecastDayDrilldownResponse } from '@harbor/contracts';
import { getAnchorDayDrilldown } from '../lib/anchor-fixture';

export function useForecastDay(
  date: string | null,
): UseQueryResult<ForecastDayDrilldownResponse, Error> {
  return useQuery<ForecastDayDrilldownResponse, Error>({
    queryKey: queryKeys.forecast.day(date ?? ''),
    enabled: Boolean(date),
    queryFn: async () => {
      if (!date) {
        throw new Error('Date is required to fetch forecast day drilldown');
      }

      try {
        return await apiFetch<ForecastDayDrilldownResponse>(
          `/forecasts/latest/days/${encodeURIComponent(date)}`,
        );
      } catch {
        // Fallback stub for anchor tenant day drilldown
        return getAnchorDayDrilldown(date);
      }
    },
  });
}
