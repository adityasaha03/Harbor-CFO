import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { useActiveCompany } from '../hooks/use-active-company';
import type * as AuthModule from '@/features/auth';
import { authClient } from '@/features/auth';

vi.mock('@/features/auth', async (importOriginal) => {
  const actual = await importOriginal<typeof AuthModule>();
  return {
    ...actual,
    authClient: {
      ...actual.authClient,
      useActiveOrganization: vi.fn(),
      useListOrganizations: vi.fn(),
      useActiveMemberRole: vi.fn(),
      organization: {
        setActive: vi.fn(),
        list: vi.fn(),
      },
    },
  };
});

describe('useActiveCompany', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  it('formats activeCompany, companies list, and role correctly', () => {
    vi.mocked(authClient.useActiveOrganization).mockReturnValue({
      data: { id: 'org_1', name: 'Harbor Wholesale', slug: 'harbor-wholesale' },
      isPending: false,
    } as never);
    vi.mocked(authClient.useListOrganizations).mockReturnValue({
      data: [
        { id: 'org_1', name: 'Harbor Wholesale', slug: 'harbor-wholesale' },
        { id: 'org_2', name: 'Pacific Trade', slug: 'pacific-trade' },
      ],
      isPending: false,
    } as never);
    vi.mocked(authClient.useActiveMemberRole).mockReturnValue({
      data: { role: 'owner' },
      isPending: false,
    } as never);

    const { result } = renderHook(() => useActiveCompany(), { wrapper });

    expect(result.current.activeCompany).toEqual({
      id: 'org_1',
      name: 'Harbor Wholesale',
      slug: 'harbor-wholesale',
      logo: null,
    });
    expect(result.current.companies).toHaveLength(2);
    expect(result.current.role).toBe('owner');
    expect(result.current.isLoading).toBe(false);
  });

  it('sets active organization and clears the QueryClient cache', async () => {
    vi.mocked(authClient.useActiveOrganization).mockReturnValue({
      data: null,
      isPending: false,
    } as never);
    vi.mocked(authClient.useListOrganizations).mockReturnValue({
      data: [],
      isPending: false,
    } as never);
    vi.mocked(authClient.useActiveMemberRole).mockReturnValue({
      data: null,
      isPending: false,
    } as never);
    vi.mocked(authClient.organization.setActive).mockResolvedValueOnce({
      data: { id: 'org_2' },
      error: null,
    } as never);

    const clearSpy = vi.spyOn(queryClient, 'clear');

    const { result } = renderHook(() => useActiveCompany(), { wrapper });

    await act(async () => {
      await result.current.setActiveCompany('org_2');
    });

    expect(authClient.organization.setActive).toHaveBeenCalledWith({
      organizationId: 'org_2',
    });
    expect(clearSpy).toHaveBeenCalled();
  });
});
