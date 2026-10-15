import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { useMe } from '../hooks/use-me';
import * as apiModule from '@/lib/api/client';
import * as useSessionModule from '../hooks/use-session';

describe('useMe', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });

    vi.spyOn(useSessionModule, 'useSession').mockReturnValue({
      user: { id: 'usr_1', email: 'owner@harbor.local', name: 'Owner' },
      session: { id: 'sess_1', activeOrganizationId: 'org_1' },
      activeCompanyId: 'org_1',
      role: 'owner',
      isPending: false,
      refetch: vi.fn(),
    } as never);
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  it('queries /me endpoint and returns user permissions and role', async () => {
    vi.spyOn(apiModule, 'apiFetch').mockResolvedValueOnce({
      userId: 'usr_1',
      tenantId: 'org_1',
      role: 'owner',
      permissions: ['finance:read', 'actions:approve'],
    });

    const { result } = renderHook(() => useMe(), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual({
      userId: 'usr_1',
      tenantId: 'org_1',
      role: 'owner',
      permissions: ['finance:read', 'actions:approve'],
    });
    expect(apiModule.apiFetch).toHaveBeenCalledWith('/me');
  });

  it('warns in development environment when server role disagrees with client role', async () => {
    vi.stubEnv('NODE_ENV', 'development');
    const warnSpy = vi.spyOn(console, 'warn').mockReturnValue(undefined);

    vi.spyOn(apiModule, 'apiFetch').mockResolvedValueOnce({
      userId: 'usr_1',
      tenantId: 'org_1',
      role: 'reviewer', // Differs from client role 'owner'
      permissions: ['finance:read'],
    });

    const { result } = renderHook(() => useMe(), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('Role mismatch detected: client has "owner", server /me reports "reviewer"')
    );

    vi.unstubAllEnvs();
  });
});
