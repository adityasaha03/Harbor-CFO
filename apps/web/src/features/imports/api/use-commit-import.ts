'use client';

import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api/client';
import { queryKeys } from '@/lib/query/keys';
import type { ImportDto } from '@harbor/contracts';

export function useCommitImport(): UseMutationResult<ImportDto, Error, string> {
  const queryClient = useQueryClient();

  return useMutation<ImportDto, Error, string>({
    mutationFn: async (importId: string) => {
      return apiFetch<ImportDto>(`/imports/${encodeURIComponent(importId)}/commit`, {
        method: 'POST',
      });
    },
    onSuccess: () => {
      // Invalidate relevant caches when an import commits
      void queryClient.invalidateQueries({ queryKey: queryKeys.imports.all });
      void queryClient.invalidateQueries({ queryKey: queryKeys.forecast.all });
      void queryClient.invalidateQueries({ queryKey: queryKeys.ledger.all });
      void queryClient.invalidateQueries({ queryKey: queryKeys.invoices.all });
      void queryClient.invalidateQueries({ queryKey: queryKeys.alerts.all });
      void queryClient.invalidateQueries({ queryKey: queryKeys.analytics.all });
    },
  });
}
