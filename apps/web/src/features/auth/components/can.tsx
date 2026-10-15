'use client';

import * as React from 'react';
import { usePermission } from '../hooks/use-permission';
import type { Permission } from '@harbor/contracts';

export interface CanProps {
  permission: Permission;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

/**
 * Conditionally renders children if the active member role holds the required permission.
 * UI convenience wrapper only — actions and data access are strictly enforced by the Express API.
 */
export function Can({ permission, children, fallback = null }: CanProps) {
  const allowed = usePermission(permission);
  if (!allowed) {
    return <>{fallback}</>;
  }
  return <>{children}</>;
}
