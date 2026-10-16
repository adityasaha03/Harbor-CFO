'use client';

import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api/client';
import { queryKeys } from '@/lib/query/keys';
import type { Alert } from '@harbor/contracts';

export function useAlert(id: string): UseQueryResult<Alert, Error> {
  return useQuery<Alert, Error>({
    queryKey: queryKeys.alerts.detail(id),
    queryFn: async () => {
      return await apiFetch<Alert>(`/alerts/${encodeURIComponent(id)}`);
    },
    enabled: Boolean(id),
  });
}
