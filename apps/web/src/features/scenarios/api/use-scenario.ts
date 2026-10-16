'use client';

import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api/client';
import { queryKeys } from '@/lib/query/keys';
import type { ScenarioDto } from '@harbor/contracts';

/**
 * Query hook to fetch a single scenario by ID via GET /scenarios/:id.
 */
export function useScenario(id: string | null): UseQueryResult<ScenarioDto, Error> {
  return useQuery<ScenarioDto, Error>({
    queryKey: queryKeys.scenarios.detail(id ?? ''),
    queryFn: async () => {
      return apiFetch<ScenarioDto>(`/scenarios/${id}`);
    },
    enabled: Boolean(id),
  });
}
