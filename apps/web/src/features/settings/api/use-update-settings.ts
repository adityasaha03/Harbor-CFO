'use client';

import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api/client';
import { queryKeys } from '@/lib/query/keys';
import type { TenantSettingsDto, UpdateTenantSettingsInput } from '@harbor/contracts';

/**
 * Mutation hook to update tenant settings and business profile.
 * Invalidates tenant settings, forecast queries, and alerts queries on success.
 */
export function useUpdateSettings(): UseMutationResult<
  TenantSettingsDto,
  Error,
  UpdateTenantSettingsInput
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: UpdateTenantSettingsInput) =>
      apiFetch<TenantSettingsDto>('/tenant-settings', {
        method: 'PATCH',
        body: JSON.stringify(body),
        headers: {
          'Content-Type': 'application/json',
        },
      }),
    onSuccess: (updated) => {
      queryClient.setQueryData(queryKeys.settings.tenant(), updated);
      queryClient.invalidateQueries({ queryKey: queryKeys.settings.tenant() });
      queryClient.invalidateQueries({ queryKey: queryKeys.forecast.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.alerts.all });
    },
  });
}
