import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { apiFetch, setActiveTenantId } from '../client';
import { ApiError } from '../errors';
import type * as AuthModule from '@/features/auth';
import * as authModule from '@/features/auth';

vi.mock('@/features/auth', async (importOriginal) => {
  const actual = await importOriginal<typeof AuthModule>();
  return {
    ...actual,
    getApiToken: vi.fn().mockResolvedValue('mock-jwt-token'),
    clearApiToken: vi.fn(),
    authClient: {
      ...actual.authClient,
      signOut: vi.fn().mockResolvedValue(undefined),
      getSession: vi.fn().mockResolvedValue({
        data: {
          session: { activeOrganizationId: 'org_auto_123' },
        },
      }),
    },
  };
});

describe('apiFetch', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    setActiveTenantId('org_test_123');
    vi.clearAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('unwraps { data } envelope on successful 200 response', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce(
      new Response(JSON.stringify({ data: { message: 'hello world' } }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    );

    const result = await apiFetch<{ message: string }>('/health/ready');

    expect(result).toEqual({ message: 'hello world' });
    expect(global.fetch).toHaveBeenCalledWith(
      'http://localhost:4000/api/v1/health/ready',
      expect.objectContaining({
        headers: expect.any(Headers),
      })
    );
  });

  it('sends Authorization, X-Tenant-Id, and Idempotency-Key headers', async () => {
    let capturedHeaders: Headers | undefined;
    global.fetch = vi.fn().mockImplementationOnce((_url, init) => {
      capturedHeaders = new Headers(init.headers);
      return Promise.resolve(
        new Response(JSON.stringify({ data: { ok: true } }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      );
    });

    await apiFetch('/action-proposals/1/execute', {
      method: 'POST',
      idempotencyKey: 'idemp-key-xyz',
    });

    expect(capturedHeaders?.get('Authorization')).toBe('Bearer mock-jwt-token');
    expect(capturedHeaders?.get('X-Tenant-Id')).toBe('org_test_123');
    expect(capturedHeaders?.get('Idempotency-Key')).toBe('idemp-key-xyz');
  });

  it('updates X-Tenant-Id when active tenant is changed', async () => {
    let capturedHeaders: Headers | undefined;
    global.fetch = vi.fn().mockImplementation((_url, init) => {
      capturedHeaders = new Headers(init.headers);
      return Promise.resolve(
        new Response(JSON.stringify({ data: { ok: true } }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      );
    });

    setActiveTenantId('org_workspace_A');
    await apiFetch('/health');
    expect(capturedHeaders?.get('X-Tenant-Id')).toBe('org_workspace_A');

    setActiveTenantId('org_workspace_B');
    await apiFetch('/health');
    expect(capturedHeaders?.get('X-Tenant-Id')).toBe('org_workspace_B');
  });

  it('sends FormData without manual Content-Type header', async () => {
    let capturedHeaders: Headers | undefined;
    global.fetch = vi.fn().mockImplementationOnce((_url, init) => {
      capturedHeaders = new Headers(init.headers);
      return Promise.resolve(
        new Response(JSON.stringify({ data: { imported: 10 } }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      );
    });

    const formData = new FormData();
    formData.append('kind', 'ledger');

    await apiFetch('/imports/preview', {
      method: 'POST',
      body: formData,
    });

    expect(capturedHeaders?.has('Content-Type')).toBe(false);
  });

  it('throws ApiError on HTTP error status with envelope details', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          error: {
            code: 'FORBIDDEN',
            message: 'You do not have permission',
            requestId: 'req-403',
          },
        }),
        {
          status: 403,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    );

    await expect(apiFetch('/audit-events')).rejects.toThrow(ApiError);
    try {
      await apiFetch('/audit-events');
    } catch (err) {
      if (err instanceof ApiError) {
        expect(err.code).toBe('FORBIDDEN');
        expect(err.status).toBe(403);
        expect(err.requestId).toBe('req-403');
      }
    }
  });

  it('refreshes token on 401 and succeeds on single retry', async () => {
    global.fetch = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ error: { code: 'UNAUTHENTICATED', message: 'Token expired' } }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        })
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ data: { user: 'refreshed' } }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      );

    const result = await apiFetch<{ user: string }>('/me');

    expect(authModule.getApiToken).toHaveBeenCalledWith({ forceRefresh: true });
    expect(result).toEqual({ user: 'refreshed' });
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  it('signs out and throws ApiError on second consecutive 401 response', async () => {
    global.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ error: { code: 'UNAUTHENTICATED', message: 'Unauthorized' } }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      })
    );

    await expect(apiFetch('/me')).rejects.toThrow('Session expired. Please sign in again.');
    expect(authModule.authClient.signOut).toHaveBeenCalled();
    expect(authModule.clearApiToken).toHaveBeenCalled();
  });

  it('wraps network errors into ApiError with status 0 and code INTERNAL', async () => {
    global.fetch = vi.fn().mockRejectedValueOnce(new TypeError('Failed to fetch'));

    await expect(apiFetch('/forecasts/latest')).rejects.toThrow(ApiError);
    try {
      await apiFetch('/forecasts/latest');
    } catch (err) {
      if (err instanceof ApiError) {
        expect(err.status).toBe(0);
        expect(err.code).toBe('INTERNAL');
        expect(err.message).toContain('Network connection failed');
      }
    }
  });
});
