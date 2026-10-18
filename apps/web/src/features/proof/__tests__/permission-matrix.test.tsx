import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import * as React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PermissionMatrix } from '../components/permission-matrix';
import * as authFeature from '@/features/auth';
import { PERMISSIONS } from '@harbor/contracts';

function renderWithClient(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

describe('F13 Permission Matrix Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders all permissions from contracts and highlights Owner column when active', () => {
    vi.spyOn(authFeature, 'useMe').mockReturnValue({
      data: {
        userId: 'usr_owner_01',
        tenantId: 'tenant_harbor_01',
        role: 'owner',
        permissions: [
          'finance:read',
          'imports:write',
          'scenarios:write',
          'agent:use',
          'actions:propose',
          'actions:approve',
          'audit:export',
          'settings:manage',
        ],
      },
      isLoading: false,
      error: null,
    } as unknown as ReturnType<typeof authFeature.useMe>);

    renderWithClient(<PermissionMatrix />);

    expect(screen.getByText('Role-Based Access Control (RBAC) Matrix')).toBeInTheDocument();

    // Verify all 8 permission keys exist in the document
    for (const perm of PERMISSIONS) {
      expect(screen.getByText(perm)).toBeInTheDocument();
    }

    // Current badge is displayed on Owner column
    expect(screen.getByText('Current')).toBeInTheDocument();

    // Owner has checkmarks for all permissions
    expect(screen.getByLabelText('owner has actions:approve')).toBeInTheDocument();
    expect(screen.getByLabelText('owner has audit:export')).toBeInTheDocument();

    // Reviewer column is not present
    expect(screen.queryByText('reviewer')).not.toBeInTheDocument();
  });

  it('highlights Employee column when active role is employee', () => {
    vi.spyOn(authFeature, 'useMe').mockReturnValue({
      data: {
        userId: 'usr_emp_01',
        tenantId: 'tenant_harbor_01',
        role: 'employee',
        permissions: ['finance:read', 'imports:write', 'scenarios:write', 'agent:use', 'actions:propose'],
      },
      isLoading: false,
      error: null,
    } as unknown as ReturnType<typeof authFeature.useMe>);

    renderWithClient(<PermissionMatrix />);

    // Employee should have check for actions:propose and cross for actions:approve
    expect(screen.getByLabelText('employee has actions:propose')).toBeInTheDocument();
    expect(screen.getByLabelText('employee lacks actions:approve')).toBeInTheDocument();
    expect(screen.getByLabelText('employee lacks audit:export')).toBeInTheDocument();
  });
});
