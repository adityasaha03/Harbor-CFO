'use client';

import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api/client';
import { queryKeys } from '@/lib/query/keys';
import type { CommitmentDto } from '@harbor/contracts';

/**
 * Fetch all recurring commitments for the active tenant.
 */
export function useCommitments(): UseQueryResult<CommitmentDto[], Error> {
  return useQuery({
    queryKey: queryKeys.commitments.list(),
    queryFn: () => apiFetch<CommitmentDto[]>('/commitments'),
  });
}
