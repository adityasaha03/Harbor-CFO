'use client';

import { useMutation, type UseMutationResult } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api/client';
import type { TransformImportInput, TransformImportResponse } from '@harbor/contracts';

/**
 * Mutation hook calling POST /api/v1/imports/transform.
 * Uses AI to standardize arbitrary/messy business data into canonical CSV format.
 */
export function useTransformImport(): UseMutationResult<
  TransformImportResponse,
  Error,
  TransformImportInput
> {
  return useMutation<TransformImportResponse, Error, TransformImportInput>({
    mutationFn: async (input: TransformImportInput) => {
      return apiFetch<TransformImportResponse>('/imports/transform', {
        method: 'POST',
        body: input,
      });
    },
  });
}
