'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api/client';
import { queryKeys } from '@/lib/query/keys';
import type { CreateScenarioInput, CreateScenarioResponse } from '@harbor/contracts';

/**
 * Mutation hook to create a new scenario via POST /scenarios.
 * Invalidates scenario and forecast caches on success.
 */
export function useCreateScenario() {
  const queryClient = useQueryClient();

  return useMutation<CreateScenarioResponse, Error, CreateScenarioInput>({
    mutationFn: async (input) => {
      return apiFetch<CreateScenarioResponse>('/scenarios', {
        method: 'POST',
        body: input,
      });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.scenarios.all });
      void queryClient.invalidateQueries({ queryKey: queryKeys.forecast.all });
    },
  });
}
