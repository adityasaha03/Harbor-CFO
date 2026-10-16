'use client';

import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api/client';
import { queryKeys } from '@/lib/query/keys';
import type { AgentRunDto } from '@harbor/contracts';

export interface UseRunOptions {
  enabled?: boolean;
  pollWhileRunning?: boolean;
}

/**
 * Fetches an individual agent run by ID.
 * Polls every 2000ms as a fallback if the run is currently 'running'.
 */
export function useRun(
  runId: string | null | undefined,
  options: UseRunOptions = {},
): UseQueryResult<AgentRunDto, Error> {
  const { enabled = true, pollWhileRunning = true } = options;

  return useQuery<AgentRunDto, Error>({
    queryKey: queryKeys.agent.run(runId ?? ''),
    queryFn: async () => {
      if (!runId) {
        throw new Error('Run ID is required');
      }
      return await apiFetch<AgentRunDto>(`/agent/runs/${runId}`);
    },
    enabled: Boolean(runId) && enabled,
    refetchInterval: (query) => {
      if (!pollWhileRunning) return false;
      const data = query.state.data;
      if (data && data.status === 'running') {
        return 2000;
      }
      return false;
    },
  });
}
