'use client';

import { useMutation, type UseMutationResult } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api/client';
import type { ImportKind, ImportPreviewResponse } from '@harbor/contracts';

export interface PreviewImportParams {
  file: File;
  kind: ImportKind;
}

export function usePreviewImport(): UseMutationResult<
  ImportPreviewResponse,
  Error,
  PreviewImportParams
> {
  return useMutation<ImportPreviewResponse, Error, PreviewImportParams>({
    mutationFn: async ({ file, kind }) => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('kind', kind);

      return apiFetch<ImportPreviewResponse>('/imports/preview', {
        method: 'POST',
        body: formData,
      });
    },
  });
}
