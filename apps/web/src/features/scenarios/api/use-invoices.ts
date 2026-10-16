'use client';

import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api/client';
import { queryKeys } from '@/lib/query/keys';
import type { InvoiceDto } from '@harbor/contracts';

interface InvoicesListResponse {
  invoices: InvoiceDto[];
}

/**
 * Query hook to fetch invoices filtered by direction and status.
 * Used by scenario forms to populate AR/AP invoice selectors.
 */
export function useInvoices(
  filters: { direction?: string; status?: string } = {},
): UseQueryResult<InvoiceDto[], Error> {
  return useQuery<InvoiceDto[], Error>({
    queryKey: queryKeys.invoices.list(filters),
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.direction) params.set('direction', filters.direction);
      if (filters.status) params.set('status', filters.status);
      const query = params.toString();
      const path = query ? `/invoices?${query}` : '/invoices';
      const result = await apiFetch<InvoicesListResponse | InvoiceDto[]>(path);
      if (Array.isArray(result)) return result;
      return result.invoices ?? [];
    },
  });
}
