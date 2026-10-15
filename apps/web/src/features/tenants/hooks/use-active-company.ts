'use client';

import * as React from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { authClient } from '@/features/auth';
import type { Role } from '@harbor/contracts';

export interface Company {
  id: string;
  name: string;
  slug: string;
  logo?: string | null;
}

export interface UseActiveCompanyReturn {
  activeCompany: Company | null;
  companies: Company[];
  role: Role | null;
  isLoading: boolean;
  setActiveCompany: (organizationId: string) => Promise<void>;
  refetch: () => Promise<void>;
}

export function useActiveCompany(): UseActiveCompanyReturn {
  const queryClient = useQueryClient();
  const { data: activeOrg, isPending: isActivePending } = authClient.useActiveOrganization();
  const { data: orgList, isPending: isListPending } = authClient.useListOrganizations();
  const { data: memberRole, isPending: isRolePending } = authClient.useActiveMemberRole();

  const companies: Company[] = React.useMemo(() => {
    if (!orgList || !Array.isArray(orgList)) return [];
    return orgList.map((org) => ({
      id: org.id,
      name: org.name,
      slug: org.slug,
      logo: org.logo ?? null,
    }));
  }, [orgList]);

  const activeCompany: Company | null = React.useMemo(() => {
    if (!activeOrg) return null;
    return {
      id: activeOrg.id,
      name: activeOrg.name,
      slug: activeOrg.slug,
      logo: activeOrg.logo ?? null,
    };
  }, [activeOrg]);

  const role = (memberRole?.role as Role) ?? null;

  const setActiveCompany = React.useCallback(
    async (organizationId: string) => {
      await authClient.organization.setActive({
        organizationId,
      });
      // Clear TanStack query cache on tenant change to isolate cross-tenant data
      queryClient.clear();
    },
    [queryClient]
  );

  const refetch = React.useCallback(async () => {
    // Better Auth signals reactively revalidate active organization
    await authClient.organization.list();
  }, []);

  return {
    activeCompany,
    companies,
    role,
    isLoading: isActivePending || isListPending || isRolePending,
    setActiveCompany,
    refetch,
  };
}
