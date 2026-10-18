import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { SidebarNav } from '../sidebar-nav';
import * as useSessionModule from '@/features/auth';
import type { Role } from '@harbor/contracts';

vi.mock('next/navigation', () => ({
  usePathname: () => '/dashboard',
}));

describe('SidebarNav', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  function mockRole(role: Role) {
    vi.spyOn(useSessionModule, 'useSession').mockReturnValue({
      user: { id: 'usr_1', email: 'test@harbor.local', name: 'Test User' },
      session: { id: 'sess_1', activeOrganizationId: 'org_1' },
      activeCompanyId: 'org_1',
      role,
      isPending: false,
      refetch: vi.fn(),
    } as never);
  }

  it('filters navigation items for reviewer role (read-only)', () => {
    mockRole('reviewer');
    render(<SidebarNav />);

    // Read items should be visible
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Forecast')).toBeInTheDocument();
    expect(screen.getByText('Alerts')).toBeInTheDocument();
    expect(screen.getByText('Financing')).toBeInTheDocument();

    // Restricted items should be hidden
    expect(screen.queryByText('Imports')).not.toBeInTheDocument();
    expect(screen.queryByText('Scenarios')).not.toBeInTheDocument();
    expect(screen.queryByText('Actions')).not.toBeInTheDocument();
    expect(screen.queryByText('Agent')).not.toBeInTheDocument();
    expect(screen.queryByText('Proof & Audit')).not.toBeInTheDocument();
    expect(screen.queryByText('Settings')).not.toBeInTheDocument();
  });

  it('shows all navigation items for employee role matching owner', () => {
    mockRole('employee');
    render(<SidebarNav />);

    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Imports')).toBeInTheDocument();
    expect(screen.getByText('Forecast')).toBeInTheDocument();
    expect(screen.getByText('Alerts')).toBeInTheDocument();
    expect(screen.getByText('Financing')).toBeInTheDocument();
    expect(screen.getByText('Scenarios')).toBeInTheDocument();
    expect(screen.getByText('Actions')).toBeInTheDocument();
    expect(screen.getByText('Agent')).toBeInTheDocument();
    expect(screen.getByText('Proof & Audit')).toBeInTheDocument();
    expect(screen.getByText('Settings')).toBeInTheDocument();
  });

  it('shows all navigation items for owner role', () => {
    mockRole('owner');
    render(<SidebarNav />);

    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Imports')).toBeInTheDocument();
    expect(screen.getByText('Forecast')).toBeInTheDocument();
    expect(screen.getByText('Alerts')).toBeInTheDocument();
    expect(screen.getByText('Financing')).toBeInTheDocument();
    expect(screen.getByText('Scenarios')).toBeInTheDocument();
    expect(screen.getByText('Actions')).toBeInTheDocument();
    expect(screen.getByText('Agent')).toBeInTheDocument();
    expect(screen.getByText('Proof & Audit')).toBeInTheDocument();
    expect(screen.getByText('Settings')).toBeInTheDocument();
  });
});
