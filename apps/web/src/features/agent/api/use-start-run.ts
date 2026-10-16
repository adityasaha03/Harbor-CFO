'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api/client';
import { queryKeys } from '@/lib/query/keys';
import type { AgentStyle } from '@harbor/contracts';

export interface StartRunInput {
  prompt: string;
  style?: AgentStyle;
}

export interface StartRunResult {
  runId: string;
}

/**
 * Mutation to trigger a new Finance Copilot agent run.
 * Calls POST /api/v1/agent/runs and returns { runId }.
 */
export function useStartRun() {
  const queryClient = useQueryClient();

  return useMutation<StartRunResult, Error, StartRunInput>({
    mutationFn: async (input: StartRunInput) => {
      const response = await apiFetch<StartRunResult>('/agent/runs', {
        method: 'POST',
        body: {
          prompt: input.prompt.trim(),
          style: input.style ?? 'standard',
        },
      });
      return response;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.agent.runs() });
    },
  });
}
