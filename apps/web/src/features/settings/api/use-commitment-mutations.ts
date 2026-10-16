'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api/client';
import { queryKeys } from '@/lib/query/keys';
import type {
  CommitmentDto,
  CreateCommitmentInput,
  UpdateCommitmentInput,
} from '@harbor/contracts';

/**
 * Mutation hooks for Commitment CRUD.
 * Invalidates commitments, forecast, and alerts cache on change.
 */
export function useCreateCommitment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: CreateCommitmentInput) =>
      apiFetch<CommitmentDto>('/commitments', {
        method: 'POST',
        body: JSON.stringify(body),
        headers: { 'Content-Type': 'application/json' },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.commitments.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.forecast.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.alerts.all });
    },
  });
}

export function useUpdateCommitment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateCommitmentInput }) =>
      apiFetch<CommitmentDto>(`/commitments/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
        headers: { 'Content-Type': 'application/json' },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.commitments.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.forecast.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.alerts.all });
    },
  });
}

export function useDeleteCommitment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      apiFetch<void>(`/commitments/${id}`, {
        method: 'DELETE',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.commitments.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.forecast.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.alerts.all });
    },
  });
}
