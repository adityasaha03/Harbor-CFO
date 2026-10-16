'use client';

import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api/client';
import { queryKeys } from '@/lib/query/keys';
import type {
  FinancingMatchInput,
  FinancingMatchResponse,
} from '@harbor/contracts';
import { ANCHOR_FINANCING_MATCH } from '../lib/anchor-financing';

export function useMatchFinancing(
  input: FinancingMatchInput,
): UseQueryResult<FinancingMatchResponse, Error> {
  return useQuery<FinancingMatchResponse, Error>({
    queryKey: queryKeys.financing.match(input),
    queryFn: async () => {
      try {
        const result = await apiFetch<FinancingMatchResponse>('/financing/match', {
          method: 'POST',
          body: input,
        });

        if (result && typeof result === 'object' && Array.isArray(result.eligible)) {
          return result;
        }

        return ANCHOR_FINANCING_MATCH;
      } catch {
        // Fallback for offline/demo reliability
        return ANCHOR_FINANCING_MATCH;
      }
    },
  });
}
