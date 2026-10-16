'use client';

import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api/client';
import { queryKeys } from '@/lib/query/keys';
import type { ImportDto, ImportsQuery } from '@harbor/contracts';

export function useImports(
  filters?: ImportsQuery,
): UseQueryResult<ImportDto[], Error> {
  const searchParams = new URLSearchParams();
  if (filters?.page) searchParams.set('page', String(filters.page));
  if (filters?.pageSize) searchParams.set('pageSize', String(filters.pageSize));
  if (filters?.kind) searchParams.set('kind', filters.kind);
  if (filters?.status) searchParams.set('status', filters.status);

  const qs = searchParams.toString();
  const path = qs ? `/imports?${qs}` : '/imports';

  return useQuery<ImportDto[], Error>({
    queryKey: [...queryKeys.imports.list(), filters],
    queryFn: async () => {
      const result = await apiFetch<ImportDto[]>(path);
      return Array.isArray(result) ? result : [];
    },
  });
}
