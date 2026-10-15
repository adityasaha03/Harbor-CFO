import { createAccessControl } from 'better-auth/plugins/access';
import { ROLES, type Role } from '@harbor/contracts';


/**
 * Access control statements uniting Better Auth organization management
 * and HarborCFO finance copilot domain permissions.
 */
export const statement = {
  // Better Auth organization management statements
  organization: ['update', 'delete'],
  member: ['create', 'update', 'delete'],
  invitation: ['create', 'cancel'],
  team: ['create', 'update', 'delete'],
  ac: ['create', 'read', 'update', 'delete'],

  // HarborCFO domain resource permissions
  finance: ['read'],
  imports: ['write'],
  scenarios: ['write'],
  agent: ['use'],
  actions: ['propose', 'approve'],
  audit: ['export'],
  settings: ['manage'],
} as const;

export const ac = createAccessControl(statement);

/**
 * Owner: Full organization administrative authority + all domain permissions.
 */
export const ownerRole = ac.newRole({
  organization: ['update', 'delete'],
  member: ['create', 'update', 'delete'],
  invitation: ['create', 'cancel'],
  team: ['create', 'update', 'delete'],
  ac: ['create', 'read', 'update', 'delete'],
  finance: ['read'],
  imports: ['write'],
  scenarios: ['write'],
  agent: ['use'],
  actions: ['propose', 'approve'],
  audit: ['export'],
  settings: ['manage'],
});

/**
 * Employee: Operational access to import, analyze, run scenarios, interact with agent, and propose actions.
 */
export const employeeRole = ac.newRole({
  organization: [],
  member: [],
  invitation: [],
  team: [],
  ac: ['read'],
  finance: ['read'],
  imports: ['write'],
  scenarios: ['write'],
  agent: ['use'],
  actions: ['propose'],
  audit: [],
  settings: [],
});

/**
 * Reviewer: Read-only visibility into financial dashboard and reports.
 */
export const reviewerRole = ac.newRole({
  organization: [],
  member: [],
  invitation: [],
  team: [],
  ac: ['read'],
  finance: ['read'],
  imports: [],
  scenarios: [],
  agent: [],
  actions: [],
  audit: [],
  settings: [],
});

/**
 * Custom role map passed to Better Auth's organization plugin.
 * Strictly guarantees that member.role stores 'owner' | 'employee' | 'reviewer'.
 */
export const roles = {
  owner: ownerRole,
  employee: employeeRole,
  reviewer: reviewerRole,
} as const;

export type HarborRole = keyof typeof roles;

/**
 * Asserts role equality and maps HarborCFO contracts roles to Better Auth roles.
 */
export function validateContractRoles(): readonly Role[] {
  const roleKeys = Object.keys(roles) as Role[];
  for (const role of ROLES) {
    if (!(role in roles)) {
      throw new Error(`Role "${role}" from contracts is missing in Better Auth roles configuration.`);
    }
  }
  return roleKeys;
}
