import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import * as React from 'react';
import { CurrentRoleCard } from '../components/current-role-card';
import * as authFeature from '@/features/auth';
import * as tenantsFeature from '@/features/tenants';

describe('CurrentRoleCard', () => {
  it('renders dynamic organization name instead of hardcoded Harbor Wholesale Ltd', () => {
    vi.spyOn(authFeature, 'useMe').mockReturnValue({
      data: {
        userId: 'usr_owner_01',
        tenantId: 'tenant_abc_01',
        role: 'owner',
        permissions: ['finance:read'],
      },
      isLoading: false,
      error: null,
    } as unknown as ReturnType<typeof authFeature.useMe>);

    vi.spyOn(authFeature, 'useSession').mockReturnValue({
      user: { name: 'Owner Person', email: 'owner@apex.test' },
      session: null,
      activeCompanyId: 'tenant_abc_01',
      role: 'owner',
      isPending: false,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof authFeature.useSession>);

    vi.spyOn(tenantsFeature, 'useActiveCompany').mockReturnValue({
      activeCompany: { id: 'tenant_abc_01', name: 'Apex Industrial Supply', slug: 'apex-industrial' },
      companies: [],
      role: 'owner',
      isLoading: false,
      setActiveCompany: vi.fn(),
      refetch: vi.fn(),
    });

    render(<CurrentRoleCard />);

    expect(screen.getByText('Apex Industrial Supply')).toBeInTheDocument();
    expect(screen.queryByText('Harbor Wholesale Ltd')).not.toBeInTheDocument();
  });
});

