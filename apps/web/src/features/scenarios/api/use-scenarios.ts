'use client';

import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api/client';
import { queryKeys } from '@/lib/query/keys';
import type { ScenarioDto } from '@harbor/contracts';

interface ScenariosListResponse {
  scenarios: ScenarioDto[];
}

/**
 * Query hook to list all scenarios for the current tenant via GET /scenarios.
 */
export function useScenarios(): UseQueryResult<ScenarioDto[], Error> {
  return useQuery<ScenarioDto[], Error>({
    queryKey: queryKeys.scenarios.list(),
    queryFn: async () => {
      const result = await apiFetch<ScenariosListResponse | ScenarioDto[]>('/scenarios');
      if (Array.isArray(result)) return result;
      return result.scenarios ?? [];
    },
  });
}
