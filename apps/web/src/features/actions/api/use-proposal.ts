'use client';

import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api/client';
import { queryKeys } from '@/lib/query/keys';
import type { ActionProposalDto } from '@harbor/contracts';

/**
 * Query hook to fetch a single action proposal by ID via GET /action-proposals/:id.
 */
export function useProposal(id: string | null): UseQueryResult<ActionProposalDto, Error> {
  return useQuery<ActionProposalDto, Error>({
    queryKey: queryKeys.proposals.detail(id ?? ''),
    queryFn: async () => {
      return apiFetch<ActionProposalDto>(`/action-proposals/${id}`);
    },
    enabled: Boolean(id),
  });
}
