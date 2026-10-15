import { describe, it, expect } from 'vitest';
import { ROLES, ROLE_PERMISSIONS } from '@harbor/contracts';
import {
  roles,
  ownerRole,
  employeeRole,
  reviewerRole,
  statement,
  validateContractRoles,
} from '../server/access-control';


describe('Better Auth access-control & roles', () => {
  it('defines the three required roles matching @harbor/contracts ROLES', () => {
    const definedRoleKeys = Object.keys(roles);
    expect(definedRoleKeys).toEqual(expect.arrayContaining([...ROLES]));
    expect(definedRoleKeys).toHaveLength(ROLES.length);

    const validated = validateContractRoles();
    expect(validated).toEqual(expect.arrayContaining([...ROLES]));
  });

  it('contains statements covering all contracts permissions and organization resources', () => {
    expect(statement).toHaveProperty('organization');
    expect(statement).toHaveProperty('member');
    expect(statement).toHaveProperty('invitation');
    expect(statement).toHaveProperty('team');
    expect(statement).toHaveProperty('ac');

    expect(statement).toHaveProperty('finance');
    expect(statement).toHaveProperty('imports');
    expect(statement).toHaveProperty('scenarios');
    expect(statement).toHaveProperty('agent');
    expect(statement).toHaveProperty('actions');
    expect(statement).toHaveProperty('audit');
    expect(statement).toHaveProperty('settings');
  });

  it('ownerRole possesses full organization and domain permissions', () => {
    expect(roles.owner).toBe(ownerRole);
    expect(ownerRole.statements).toHaveProperty('actions');
    expect(ownerRole.statements.actions).toContain('approve');
    expect(ownerRole.statements.actions).toContain('propose');
    expect(ownerRole.statements.finance).toContain('read');
    expect(ownerRole.statements.imports).toContain('write');
    expect(ownerRole.statements.scenarios).toContain('write');
    expect(ownerRole.statements.agent).toContain('use');
    expect(ownerRole.statements.audit).toContain('export');
    expect(ownerRole.statements.settings).toContain('manage');
    expect(ownerRole.statements.organization).toContain('delete');
  });

  it('employeeRole is restricted from administrative actions', () => {
    expect(roles.employee).toBe(employeeRole);
    expect(employeeRole.statements.finance).toContain('read');
    expect(employeeRole.statements.imports).toContain('write');
    expect(employeeRole.statements.scenarios).toContain('write');
    expect(employeeRole.statements.agent).toContain('use');
    expect(employeeRole.statements.actions).toContain('propose');

    // Must NOT have approval, audit export, or settings management
    expect(employeeRole.statements.actions).not.toContain('approve');
    expect(employeeRole.statements.audit).toHaveLength(0);
    expect(employeeRole.statements.settings).toHaveLength(0);
    expect(employeeRole.statements.organization).toHaveLength(0);
  });

  it('reviewerRole is strictly read-only', () => {
    expect(roles.reviewer).toBe(reviewerRole);
    expect(reviewerRole.statements.finance).toContain('read');

    expect(reviewerRole.statements.imports).toHaveLength(0);
    expect(reviewerRole.statements.scenarios).toHaveLength(0);
    expect(reviewerRole.statements.agent).toHaveLength(0);
    expect(reviewerRole.statements.actions).toHaveLength(0);
    expect(reviewerRole.statements.audit).toHaveLength(0);
    expect(reviewerRole.statements.settings).toHaveLength(0);
    expect(reviewerRole.statements.organization).toHaveLength(0);
  });

  it('contract ROLE_PERMISSIONS maps consistently to role definitions', () => {
    for (const role of ROLES) {
      const allowed = ROLE_PERMISSIONS[role];
      const roleDef = roles[role];
      expect(roleDef).toBeDefined();

      if (allowed.includes('actions:approve')) {
        expect(roleDef.statements.actions).toContain('approve');
      } else {
        expect(roleDef.statements.actions).not.toContain('approve');
      }

      if (allowed.includes('settings:manage')) {
        expect(roleDef.statements.settings).toContain('manage');
      } else {
        expect(roleDef.statements.settings).not.toContain('manage');
      }
    }
  });
});
