import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import * as React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuditLogTable } from '../components/audit-log-table';
import * as authFeature from '@/features/auth';
import * as auditApi from '../api/use-audit-events';
import type { AuditEventDto } from '@harbor/contracts';

function renderWithClient(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

const mockAuditEvents: AuditEventDto[] = [
  {
    id: 'aud_01',
    tenantId: 'tenant_harbor_01',
    actorId: 'usr_owner_01',
    actorRole: 'owner',
    action: 'action.execute',
    decision: 'allowed',
    reasonCode: 'OWNER_EXECUTE',
    resourceRefs: ['proposal:prop_01'],
    traceId: 'trace-exec-01',
    createdAt: '2026-10-16T14:30:00Z',
  },
  {
    id: 'aud_02',
    tenantId: 'tenant_harbor_01',
    actorId: 'usr_emp_01',
    actorRole: 'employee',
    action: 'action.execute',
    decision: 'denied',
    reasonCode: 'FORBIDDEN_ROLE',
    resourceRefs: ['proposal:prop_01'],
    traceId: 'trace-exec-denied',
    createdAt: '2026-10-16T14:35:00Z',
  },
];

describe('F13 Audit Log Table Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders restricted access notice when caller lacks audit:export permission (Employee/Reviewer)', () => {
    vi.spyOn(authFeature, 'usePermission').mockImplementation((perm) => {
      return perm !== 'audit:export';
    });
    vi.spyOn(authFeature, 'useMe').mockReturnValue({
      data: { role: 'employee' },
      isLoading: false,
    } as unknown as ReturnType<typeof authFeature.useMe>);

    renderWithClient(<AuditLogTable />);

    expect(screen.getByText('Audit Log Access Restricted')).toBeInTheDocument();
    expect(screen.getByText(/requires the/i)).toBeInTheDocument();
    expect(screen.getByText('audit:export')).toBeInTheDocument();
    expect(screen.getByText(/reserved exclusively for the/i)).toBeInTheDocument();
    expect(screen.getByText('employee')).toBeInTheDocument();
  });

  it('renders table with distinct ALLOWED and DENIED badges for Owner', () => {
    vi.spyOn(authFeature, 'usePermission').mockReturnValue(true);
    vi.spyOn(authFeature, 'useMe').mockReturnValue({
      data: { role: 'owner' },
      isLoading: false,
    } as unknown as ReturnType<typeof authFeature.useMe>);

    vi.spyOn(auditApi, 'useAuditEvents').mockReturnValue({
      data: mockAuditEvents,
      isLoading: false,
      error: null,
      isPlaceholderData: false,
    } as unknown as ReturnType<typeof auditApi.useAuditEvents>);

    renderWithClient(<AuditLogTable />);

    expect(screen.getByText('Tamper-Evident Audit Trail')).toBeInTheDocument();
    expect(screen.getByText('ALLOWED')).toBeInTheDocument();
    expect(screen.getByText('DENIED')).toBeInTheDocument();
    expect(screen.getByText('OWNER_EXECUTE')).toBeInTheDocument();
    expect(screen.getByText('FORBIDDEN_ROLE')).toBeInTheDocument();
    expect(screen.getByText('trace-exec-denied')).toBeInTheDocument();
  });
});
