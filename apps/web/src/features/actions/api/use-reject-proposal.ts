'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api/client';
import { queryKeys } from '@/lib/query/keys';
import type { ActionProposalDto, RejectActionProposalInput } from '@harbor/contracts';

interface RejectProposalArgs {
  proposalId: string;
  input?: RejectActionProposalInput;
}

/**
 * Mutation hook to reject an action proposal via POST /action-proposals/:id/reject.
 */
export function useRejectProposal() {
  const queryClient = useQueryClient();

  return useMutation<ActionProposalDto, Error, RejectProposalArgs>({
    mutationFn: async ({ proposalId, input }) => {
      return apiFetch<ActionProposalDto>(`/action-proposals/${proposalId}/reject`, {
        method: 'POST',
        body: input ?? {},
      });
    },
    onSuccess: (data) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.proposals.all });
      void queryClient.invalidateQueries({ queryKey: queryKeys.proposals.detail(data.id) });
    },
  });
}
