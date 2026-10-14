import { describe, expect, it } from 'vitest';
import { ROLES, roleSchema } from '../auth/roles';
import {
  PERMISSIONS,
  ROLE_PERMISSIONS,
  hasPermission,
  permissionSchema,
} from '../auth/permissions';
import { DEMO_EMAILS, DEMO_TENANTS } from '../auth/demo-accounts';

describe('Auth Roles and Permissions', () => {
  it('validates roles and roleSchema', () => {
    expect(ROLES).toEqual(['owner', 'employee', 'reviewer']);
    expect(roleSchema.parse('owner')).toBe('owner');
    expect(roleSchema.parse('employee')).toBe('employee');
    expect(roleSchema.parse('reviewer')).toBe('reviewer');
    expect(() => roleSchema.parse('admin')).toThrow();
  });

  it('validates permissions and permissionSchema', () => {
    expect(PERMISSIONS).toEqual([
      'finance:read',
      'imports:write',
      'scenarios:write',
      'agent:use',
      'actions:propose',
      'actions:approve',
      'audit:export',
      'settings:manage',
    ]);
    for (const perm of PERMISSIONS) {
      expect(permissionSchema.parse(perm)).toBe(perm);
    }
    expect(() => permissionSchema.parse('invalid:perm')).toThrow();
  });

  it('matches the exact permission matrix from PRODUCT_BRIEF.md', () => {
    const matrixExpected: Record<
      (typeof ROLES)[number],
      Record<(typeof PERMISSIONS)[number], boolean>
    > = {
      owner: {
        'finance:read': true,
        'imports:write': true,
        'scenarios:write': true,
        'agent:use': true,
        'actions:propose': true,
        'actions:approve': true,
        'audit:export': true,
        'settings:manage': true,
      },
      employee: {
        'finance:read': true,
        'imports:write': true,
        'scenarios:write': true,
        'agent:use': true,
        'actions:propose': true,
        'actions:approve': false,
        'audit:export': false,
        'settings:manage': false,
      },
      reviewer: {
        'finance:read': true,
        'imports:write': false,
        'scenarios:write': false,
        'agent:use': false,
        'actions:propose': false,
        'actions:approve': false,
        'audit:export': false,
        'settings:manage': false,
      },
    };

    for (const role of ROLES) {
      for (const perm of PERMISSIONS) {
        const expected = matrixExpected[role][perm];
        const actualFromMatrix = ROLE_PERMISSIONS[role].includes(perm);
        const actualFromHelper = hasPermission(role, perm);

        expect(actualFromMatrix).toBe(expected);
        expect(actualFromHelper).toBe(expected);
      }
    }
  });

  it('has valid demo account constants', () => {
    expect(DEMO_TENANTS.HARBOR_WHOLESALE).toBe('harbor-wholesale');
    expect(DEMO_TENANTS.PEARL_BAKERY).toBe('pearl-bakery');

    expect(DEMO_EMAILS.HARBOR_OWNER).toBe('owner@harbor.demo');
    expect(DEMO_EMAILS.HARBOR_EMPLOYEE).toBe('employee@harbor.demo');
    expect(DEMO_EMAILS.HARBOR_REVIEWER).toBe('reviewer@harbor.demo');
    expect(DEMO_EMAILS.PEARL_OWNER).toBe('owner@pearl.demo');
  });
});
