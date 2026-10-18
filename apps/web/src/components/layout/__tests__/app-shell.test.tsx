import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import * as React from 'react';
import { AppShell } from '../app-shell';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }),
  usePathname: () => '/dashboard',
  useSearchParams: () => ({ get: vi.fn() }),
}));

vi.mock('next-themes', () => ({
  useTheme: () => ({ theme: 'light', setTheme: vi.fn() }),
}));

vi.mock('@/features/auth', () => ({
  UserMenu: () => <div data-testid="user-menu">UserMenu</div>,
  usePermission: () => true,
  useSession: () => ({ role: 'owner', user: { name: 'Owner' } }),
}));

vi.mock('@/features/tenants', () => ({
  CompanySwitcher: () => <div data-testid="company-switcher">CompanySwitcher</div>,
  useActiveCompany: () => ({
    activeCompany: { id: 'org_1', name: 'Global Logistics Corp', slug: 'global-logistics' },
    companies: [],
    role: 'owner',
    isLoading: false,
    setActiveCompany: vi.fn(),
    refetch: vi.fn(),
  }),
}));

describe('AppShell', () => {
  it('renders "Workspace" and the dynamic active organization name in the bottom left sidebar', () => {
    render(
      <AppShell>
        <div>Content</div>
      </AppShell>,
    );

    // Expect "Workspace" label and ensure "Demo Workspace" is not rendered
    expect(screen.getByText('Workspace')).toBeInTheDocument();
    expect(screen.queryByText('Demo Workspace')).not.toBeInTheDocument();

    // Expect dynamic organization name
    expect(screen.getByText('Global Logistics Corp')).toBeInTheDocument();
  });
});

