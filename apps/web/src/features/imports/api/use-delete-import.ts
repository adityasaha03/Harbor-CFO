'use client';

import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api/client';
import { queryKeys } from '@/lib/query/keys';

export interface DeleteImportResponse {
  deleted: boolean;
  importId: string;
}

export function useDeleteImport(): UseMutationResult<DeleteImportResponse, Error, string> {
  const queryClient = useQueryClient();

  return useMutation<DeleteImportResponse, Error, string>({
    mutationFn: async (importId: string) => {
      return apiFetch<DeleteImportResponse>(`/imports/${encodeURIComponent(importId)}`, {
        method: 'DELETE',
      });
    },
    onSuccess: () => {
      // Invalidate all relevant caches when an import is deleted
      void queryClient.invalidateQueries({ queryKey: queryKeys.imports.all });
      void queryClient.invalidateQueries({ queryKey: queryKeys.forecast.all });
      void queryClient.invalidateQueries({ queryKey: queryKeys.ledger.all });
      void queryClient.invalidateQueries({ queryKey: queryKeys.invoices.all });
      void queryClient.invalidateQueries({ queryKey: queryKeys.alerts.all });
      void queryClient.invalidateQueries({ queryKey: queryKeys.analytics.all });
    },
  });
}

