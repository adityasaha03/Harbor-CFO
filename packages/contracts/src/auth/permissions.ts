import { z } from 'zod';
import type { Role } from './roles';

export const PERMISSIONS = [
  'finance:read',
  'imports:write',
  'scenarios:write',
  'agent:use',
  'actions:propose',
  'actions:approve',
  'audit:export',
  'settings:manage',
] as const;

export type Permission = (typeof PERMISSIONS)[number];

export const permissionSchema = z.enum(PERMISSIONS);

export const ROLE_PERMISSIONS: Record<Role, readonly Permission[]> = {
  owner: [
    'finance:read',
    'imports:write',
    'scenarios:write',
    'agent:use',
    'actions:propose',
    'actions:approve',
    'audit:export',
    'settings:manage',
  ],
  employee: ['finance:read', 'imports:write', 'scenarios:write', 'agent:use', 'actions:propose'],
  reviewer: ['finance:read'],
};

export function hasPermission(role: Role, permission: Permission): boolean {
  const allowed = ROLE_PERMISSIONS[role];
  return allowed.includes(permission);
}
