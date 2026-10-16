'use client';

import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api/client';
import { queryKeys } from '@/lib/query/keys';
import type { ActionProposalDto } from '@harbor/contracts';

interface ProposalsListResponse {
  proposals: ActionProposalDto[];
}

/**
 * Query hook to list all action proposals for the tenant via GET /action-proposals.
 */
export function useProposals(): UseQueryResult<ActionProposalDto[], Error> {
  return useQuery<ActionProposalDto[], Error>({
    queryKey: queryKeys.proposals.list(),
    queryFn: async () => {
      const result = await apiFetch<ProposalsListResponse | ActionProposalDto[]>(
        '/action-proposals',
      );
      if (Array.isArray(result)) return result;
      return result.proposals ?? [];
    },
  });
}
