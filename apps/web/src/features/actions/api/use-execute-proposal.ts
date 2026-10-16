'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api/client';
import { queryKeys } from '@/lib/query/keys';
import type { ExecuteActionProposalResponse } from '@harbor/contracts';

interface ExecuteProposalArgs {
  proposalId: string;
  idempotencyKey: string;
}

/**
 * Mutation hook to atomically execute an approved action proposal via POST /action-proposals/:id/execute.
 * Reuses the provided Idempotency-Key across retries.
 * Invalidates forecast, alerts, ledger, and proposals caches on success.
 */
export function useExecuteProposal() {
  const queryClient = useQueryClient();

  return useMutation<ExecuteActionProposalResponse, Error, ExecuteProposalArgs>({
    mutationFn: async ({ proposalId, idempotencyKey }) => {
      return apiFetch<ExecuteActionProposalResponse>(
        `/action-proposals/${proposalId}/execute`,
        {
          method: 'POST',
          idempotencyKey,
        },
      );
    },
    onSuccess: (data) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.proposals.all });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.proposals.detail(data.proposal.id),
      });
      void queryClient.invalidateQueries({ queryKey: queryKeys.forecast.all });
      void queryClient.invalidateQueries({ queryKey: queryKeys.alerts.all });
      void queryClient.invalidateQueries({ queryKey: queryKeys.ledger.all });
    },
  });
}
