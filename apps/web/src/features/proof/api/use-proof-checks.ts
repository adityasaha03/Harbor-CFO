'use client';

import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api/client';
import { queryKeys } from '@/lib/query/keys';
import type { ProofCheckCatalog } from '@harbor/contracts';

/**
 * Queries the proof checks catalog and last execution results from GET /proof/checks.
 */
export function useProofChecks(): UseQueryResult<ProofCheckCatalog, Error> {
  return useQuery<ProofCheckCatalog, Error>({
    queryKey: queryKeys.proof.checks(),
    queryFn: async () => {
      const data = await apiFetch<ProofCheckCatalog>('/proof/checks');
      return data;
    },
  });
}
