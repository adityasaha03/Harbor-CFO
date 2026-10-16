'use client';

import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api/client';
import { queryKeys } from '@/lib/query/keys';
import type { ProofCheckId, ProofCheckRunResult } from '@harbor/contracts';

/**
 * Mutation hook to run an adversarial proof check as the currently authenticated user.
 */
export function useRunProofCheck(): UseMutationResult<
  ProofCheckRunResult,
  Error,
  ProofCheckId
> {
  const queryClient = useQueryClient();

  return useMutation<ProofCheckRunResult, Error, ProofCheckId>({
    mutationFn: async (checkId: ProofCheckId) => {
      return apiFetch<ProofCheckRunResult>(`/proof/checks/${checkId}/run`, {
        method: 'POST',
      });
    },
    onSuccess: () => {
      // Invalidate catalog so that latest result is updated
      void queryClient.invalidateQueries({ queryKey: queryKeys.proof.checks() });
    },
  });
}
