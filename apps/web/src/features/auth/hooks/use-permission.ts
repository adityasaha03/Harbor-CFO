'use client';

import { useSession } from './use-session';
import { hasPermission, type Permission } from '@harbor/contracts';

/**
 * Returns whether the active member role has the specified permission.
 * UI convenience check only — Express API remains the authoritative boundary.
 */
export function usePermission(permission: Permission): boolean {
  const { role } = useSession();
  if (!role) return false;
  return hasPermission(role, permission);
}
