'use client';

import { authClient } from '../lib/auth-client';
import type { Role } from '@harbor/contracts';

export interface UseSessionReturn {
  user: typeof authClient.$Infer.Session.user | null;
  session: typeof authClient.$Infer.Session.session | null;
  activeCompanyId: string | null;
  role: Role | null;
  isPending: boolean;
  refetch: () => Promise<void>;
}

/**
 * Client-side hook for reactive session and active organization context.
 */
export function useSession(): UseSessionReturn {
  const { data: sessionData, isPending: isSessionPending, refetch } = authClient.useSession();
  const { data: roleData, isPending: isRolePending } = authClient.useActiveMemberRole();

  const user = sessionData?.user ?? null;
  const session = sessionData?.session ?? null;
  const activeCompanyId =
    (session as { activeOrganizationId?: string | null })?.activeOrganizationId ?? null;
  const role = (roleData?.role as Role) ?? null;

  return {
    user,
    session,
    activeCompanyId,
    role,
    isPending: isSessionPending || isRolePending,
    refetch: async () => {
      await refetch();
    },
  };
}
