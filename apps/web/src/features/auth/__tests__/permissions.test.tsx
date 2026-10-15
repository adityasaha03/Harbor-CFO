import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { renderHook } from '@testing-library/react';
import React from 'react';
import { usePermission } from '../hooks/use-permission';
import { Can } from '../components/can';
import { ForbiddenState } from '../components/forbidden-state';
import * as useSessionModule from '../hooks/use-session';
import type { Role } from '@harbor/contracts';

describe('permissions layer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  function mockActiveRole(role: Role | null) {
    vi.spyOn(useSessionModule, 'useSession').mockReturnValue({
      user: { id: 'usr_1', email: 'test@harbor.local', name: 'Test User' },
      session: { id: 'sess_1', activeOrganizationId: 'org_1' },
      activeCompanyId: 'org_1',
      role,
      isPending: false,
      refetch: vi.fn(),
    } as never);
  }

  describe('usePermission', () => {
    it('returns false when no active role is assigned', () => {
      mockActiveRole(null);
      const { result } = renderHook(() => usePermission('finance:read'));
      expect(result.current).toBe(false);
    });

    it('correctly evaluates permissions for reviewer role', () => {
      mockActiveRole('reviewer');

      const { result: r1 } = renderHook(() => usePermission('finance:read'));
      expect(r1.current).toBe(true);

      const { result: r2 } = renderHook(() => usePermission('imports:write'));
      expect(r2.current).toBe(false);

      const { result: r3 } = renderHook(() => usePermission('actions:approve'));
      expect(r3.current).toBe(false);
    });

    it('correctly evaluates permissions for employee role', () => {
      mockActiveRole('employee');

      const { result: r1 } = renderHook(() => usePermission('finance:read'));
      expect(r1.current).toBe(true);

      const { result: r2 } = renderHook(() => usePermission('imports:write'));
      expect(r2.current).toBe(true);

      const { result: r3 } = renderHook(() => usePermission('actions:propose'));
      expect(r3.current).toBe(true);

      const { result: r4 } = renderHook(() => usePermission('actions:approve'));
      expect(r4.current).toBe(false);

      const { result: r5 } = renderHook(() => usePermission('settings:manage'));
      expect(r5.current).toBe(false);
    });

    it('correctly evaluates permissions for owner role', () => {
      mockActiveRole('owner');

      const { result: r1 } = renderHook(() => usePermission('finance:read'));
      expect(r1.current).toBe(true);

      const { result: r2 } = renderHook(() => usePermission('actions:approve'));
      expect(r2.current).toBe(true);

      const { result: r3 } = renderHook(() => usePermission('audit:export'));
      expect(r3.current).toBe(true);

      const { result: r4 } = renderHook(() => usePermission('settings:manage'));
      expect(r4.current).toBe(true);
    });
  });

  describe('<Can>', () => {
    it('renders children when user role has permission', () => {
      mockActiveRole('owner');
      render(
        <Can permission="actions:approve" fallback={<span>Denied</span>}>
          <span>Execute Funding</span>
        </Can>
      );
      expect(screen.getByText('Execute Funding')).toBeInTheDocument();
      expect(screen.queryByText('Denied')).not.toBeInTheDocument();
    });

    it('renders fallback when user role lacks permission', () => {
      mockActiveRole('reviewer');
      render(
        <Can permission="imports:write" fallback={<span>Upload Disabled</span>}>
          <span>Upload CSV</span>
        </Can>
      );
      expect(screen.getByText('Upload Disabled')).toBeInTheDocument();
      expect(screen.queryByText('Upload CSV')).not.toBeInTheDocument();
    });
  });

  describe('<ForbiddenState>', () => {
    it('renders access restricted message and return action', () => {
      render(
        <ForbiddenState
          title="Access Restricted"
          message="Custom role restriction message"
        />
      );
      expect(screen.getByText('Access Restricted')).toBeInTheDocument();
      expect(screen.getByText('Custom role restriction message')).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /return to dashboard/i })).toHaveAttribute(
        'href',
        '/dashboard'
      );
    });
  });
});
