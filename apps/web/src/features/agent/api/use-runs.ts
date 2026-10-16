'use client';

import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api/client';
import { queryKeys } from '@/lib/query/keys';
import type { AgentRunDto } from '@harbor/contracts';

export interface UseRunsOptions {
  page?: number;
  pageSize?: number;
  enabled?: boolean;
}

/**
 * Fetches the list of past agent runs for the active tenant.
 */
export function useRuns(
  options: UseRunsOptions = {},
): UseQueryResult<AgentRunDto[], Error> {
  const { page = 1, pageSize = 20, enabled = true } = options;

  return useQuery<AgentRunDto[], Error>({
    queryKey: [...queryKeys.agent.runs(), { page, pageSize }],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
      });
      const data = await apiFetch<AgentRunDto[]>(`/agent/runs?${params.toString()}`);
      return Array.isArray(data) ? data : [];
    },
    enabled,
  });
}
