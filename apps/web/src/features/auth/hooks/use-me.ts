'use client';

import * as React from 'react';
import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api/client';
import { queryKeys } from '@/lib/query/keys';
import { useSession } from './use-session';
import type { Role, Permission } from '@harbor/contracts';

export interface MeResponse {
  userId: string;
  tenantId: string;
  role: Role;
  permissions: Permission[];
}

/**
 * Queries GET /me from the Express API as the authoritative server truth.
 * Warns in development if the server role disagrees with the client Better Auth role.
 */
export function useMe(): UseQueryResult<MeResponse, Error> {
  const { role: clientRole, activeCompanyId } = useSession();

  const query = useQuery<MeResponse, Error>({
    queryKey: queryKeys.me,
    queryFn: () => apiFetch<MeResponse>('/me'),
    enabled: !!activeCompanyId,
  });

  React.useEffect(() => {
    if (
      process.env.NODE_ENV === 'development' &&
      query.data &&
      clientRole &&
      query.data.role !== clientRole
    ) {
      // Development-only warning for role synchronization mismatch
      // eslint-disable-next-line no-console
      console.warn(
        `[HarborCFO] Role mismatch detected: client has "${clientRole}", server /me reports "${query.data.role}".`
      );
    }
  }, [query.data, clientRole]);

  return query;
}
