'use client';

import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api/client';
import { queryKeys } from '@/lib/query/keys';
import type { FinancingOffer } from '@harbor/contracts';
import { ANCHOR_OFFERS_CATALOG } from '../lib/anchor-financing';

export function useFinancingOffers(): UseQueryResult<FinancingOffer[], Error> {
  return useQuery<FinancingOffer[], Error>({
    queryKey: queryKeys.financing.offers(),
    queryFn: async () => {
      try {
        const offers = await apiFetch<FinancingOffer[]>('/financing/offers');
        if (Array.isArray(offers) && offers.length > 0) {
          return offers;
        }
        return ANCHOR_OFFERS_CATALOG;
      } catch {
        return ANCHOR_OFFERS_CATALOG;
      }
    },
  });
}
