'use client';

import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api/client';
import { queryKeys } from '@/lib/query/keys';
import type { TenantSettingsDto } from '@harbor/contracts';

/**
 * Fetch the active tenant settings (liquidity floor, alert thresholds, profile).
 */
export function useTenantSettings(): UseQueryResult<TenantSettingsDto, Error> {
  return useQuery({
    queryKey: queryKeys.settings.tenant(),
    queryFn: () => apiFetch<TenantSettingsDto>('/tenant-settings'),
  });
}
