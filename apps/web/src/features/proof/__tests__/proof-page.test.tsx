import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import * as React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ProofPage from '@/app/(app)/proof/page';
import * as authFeature from '@/features/auth';
import * as proofChecksApi from '../api/use-proof-checks';

function renderWithClient(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

describe('F13 ProofPage Integration & Role-Conditional Rendering', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders complete proof page for Owner with live checks, matrix, audit log, and evidence export', () => {
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

    vi.spyOn(authFeature, 'useSession').mockReturnValue({
      user: { name: 'Harbor Owner', email: 'owner@harbor.test' },
      session: null,
      activeCompanyId: 'tenant_harbor_01',
      role: 'owner',
      isPending: false,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof authFeature.useSession>);

    vi.spyOn(authFeature, 'usePermission').mockReturnValue(true);

    vi.spyOn(proofChecksApi, 'useProofChecks').mockReturnValue({
      data: { checks: [] },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
      isRefetching: false,
    } as unknown as ReturnType<typeof proofChecksApi.useProofChecks>);

    renderWithClient(<ProofPage />);

    expect(screen.getByText('Proof & Security Audit')).toBeInTheDocument();
    expect(screen.getByText('Active Security Context')).toBeInTheDocument();
    expect(screen.getByText('Live Adversarial Invariant Checks')).toBeInTheDocument();
    expect(screen.getByText('Role-Based Access Control (RBAC) Matrix')).toBeInTheDocument();
    expect(screen.getByText('Tamper-Evident Audit Trail')).toBeInTheDocument();
    expect(screen.getByText('Competition Execution Evidence Exporter')).toBeInTheDocument();
    expect(screen.getByText('System Boundaries & Known Limitations')).toBeInTheDocument();
  });

  it('renders proof page for Employee with audit log restricted barrier', () => {
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

    vi.spyOn(authFeature, 'useSession').mockReturnValue({
      user: { name: 'Harbor Employee', email: 'employee@harbor.test' },
      session: null,
      activeCompanyId: 'tenant_harbor_01',
      role: 'employee',
      isPending: false,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof authFeature.useSession>);

    vi.spyOn(authFeature, 'usePermission').mockImplementation((perm) => perm !== 'audit:export');

    vi.spyOn(proofChecksApi, 'useProofChecks').mockReturnValue({
      data: { checks: [] },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
      isRefetching: false,
    } as unknown as ReturnType<typeof proofChecksApi.useProofChecks>);

    renderWithClient(<ProofPage />);

    // Audit Log is restricted
    expect(screen.getByText('Audit Log Access Restricted')).toBeInTheDocument();
  });
});
