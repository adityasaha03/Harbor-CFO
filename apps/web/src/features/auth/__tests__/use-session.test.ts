import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useSession } from '../hooks/use-session';
import { authClient } from '../lib/auth-client';

vi.mock('../lib/auth-client', () => ({
  authClient: {
    useSession: vi.fn(),
    useActiveMemberRole: vi.fn(),
  },
}));

describe('useSession', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns nulls and isPending true when loading', () => {
    vi.mocked(authClient.useSession).mockReturnValue({
      data: null,
      isPending: true,
      refetch: vi.fn(),
    } as never);
    vi.mocked(authClient.useActiveMemberRole).mockReturnValue({
      data: null,
      isPending: false,
    } as never);

    const { result } = renderHook(() => useSession());

    expect(result.current.isPending).toBe(true);
    expect(result.current.user).toBeNull();
    expect(result.current.session).toBeNull();
    expect(result.current.activeCompanyId).toBeNull();
    expect(result.current.role).toBeNull();
  });

  it('exposes user, activeCompanyId, and role when authenticated', () => {
    vi.mocked(authClient.useSession).mockReturnValue({
      data: {
        user: { id: 'usr_1', email: 'owner@harbor.local', name: 'Owner' },
        session: { id: 'sess_1', activeOrganizationId: 'org_123' },
      },
      isPending: false,
      refetch: vi.fn(),
    } as never);
    vi.mocked(authClient.useActiveMemberRole).mockReturnValue({
      data: { role: 'owner' },
      isPending: false,
    } as never);

    const { result } = renderHook(() => useSession());

    expect(result.current.isPending).toBe(false);
    expect(result.current.user?.email).toBe('owner@harbor.local');
    expect(result.current.activeCompanyId).toBe('org_123');
    expect(result.current.role).toBe('owner');
  });
});
