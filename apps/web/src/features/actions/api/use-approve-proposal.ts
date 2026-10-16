'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api/client';
import { queryKeys } from '@/lib/query/keys';
import type { ActionProposalDto, ApproveActionProposalInput } from '@harbor/contracts';

interface ApproveProposalArgs {
  proposalId: string;
  input: ApproveActionProposalInput;
}

/**
 * Mutation hook to approve an action proposal via POST /action-proposals/:id/approve.
 */
export function useApproveProposal() {
  const queryClient = useQueryClient();

  return useMutation<ActionProposalDto, Error, ApproveProposalArgs>({
    mutationFn: async ({ proposalId, input }) => {
      return apiFetch<ActionProposalDto>(`/action-proposals/${proposalId}/approve`, {
        method: 'POST',
        body: input,
      });
    },
    onSuccess: (data) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.proposals.all });
      void queryClient.invalidateQueries({ queryKey: queryKeys.proposals.detail(data.id) });
    },
  });
}
