'use client';

import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api/client';
import { queryKeys } from '@/lib/query/keys';
import type { AuditEventDto, AuditQuery } from '@harbor/contracts';

interface UseAuditEventsOptions {
  page?: number;
  pageSize?: number;
  enabled?: boolean;
}

/**
 * Queries the tamper-evident audit log via GET /audit-events.
 * Requires audit:export permission (Owner role only).
 */
export function useAuditEvents(
  options: UseAuditEventsOptions = {},
): UseQueryResult<AuditEventDto[], Error> {
  const { page = 1, pageSize = 20, enabled = true } = options;

  const query: AuditQuery = { page, pageSize };
  const searchParams = new URLSearchParams();
  if (page) searchParams.set('page', String(page));
  if (pageSize) searchParams.set('pageSize', String(pageSize));

  const qs = searchParams.toString();
  const path = qs ? `/audit-events?${qs}` : '/audit-events';

  return useQuery<AuditEventDto[], Error>({
    queryKey: queryKeys.audit.list(query),
    queryFn: async () => {
      const result = await apiFetch<AuditEventDto[]>(path);
      return Array.isArray(result) ? result : [];
    },
    enabled,
  });
}
