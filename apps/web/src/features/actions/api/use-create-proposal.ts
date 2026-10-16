'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api/client';
import { queryKeys } from '@/lib/query/keys';
import type { CreateActionProposalInput, ActionProposalDto } from '@harbor/contracts';

/**
 * Mutation hook to create an action proposal via POST /action-proposals.
 */
export function useCreateProposal() {
  const queryClient = useQueryClient();

  return useMutation<ActionProposalDto, Error, CreateActionProposalInput>({
    mutationFn: async (input) => {
      return apiFetch<ActionProposalDto>('/action-proposals', {
        method: 'POST',
        body: input,
      });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.proposals.all });
    },
  });
}
