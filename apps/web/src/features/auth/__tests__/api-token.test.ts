import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getApiToken, clearApiToken, parseJwtExpiration } from '../lib/api-token';
import { authClient } from '../lib/auth-client';

vi.mock('../lib/auth-client', () => ({
  authClient: {
    token: vi.fn(),
  },
}));

function createMockJwt(expSecondsFromNow: number): string {
  const header = btoa(JSON.stringify({ alg: 'EdDSA', typ: 'JWT' }));
  const exp = Math.floor(Date.now() / 1000) + expSecondsFromNow;
  const payload = btoa(JSON.stringify({ id: 'usr_1', email: 'owner@harbor.local', exp }));
  return `${header}.${payload}.mockSignature`;
}

describe('api-token', () => {
  beforeEach(() => {
    clearApiToken();
    vi.clearAllMocks();
  });

  it('parses expiration from valid JWT', () => {
    const token = createMockJwt(900); // 15 mins
    const expMs = parseJwtExpiration(token);
    expect(expMs).toBeGreaterThan(Date.now());
  });

  it('fetches fresh token and caches it in memory', async () => {
    const mockJwt = createMockJwt(900);
    vi.mocked(authClient.token).mockResolvedValueOnce({
      data: { token: mockJwt },
      error: null,
    } as never);

    const token1 = await getApiToken();
    expect(token1).toBe(mockJwt);
    expect(authClient.token).toHaveBeenCalledTimes(1);

    // Second call should return cached token without calling authClient.token again
    const token2 = await getApiToken();
    expect(token2).toBe(mockJwt);
    expect(authClient.token).toHaveBeenCalledTimes(1);
  });

  it('refreshes token when less than 60 seconds remain', async () => {
    const expiredSoonJwt = createMockJwt(30); // 30s remaining (< 60s buffer)
    const freshJwt = createMockJwt(900);

    vi.mocked(authClient.token)
      .mockResolvedValueOnce({
        data: { token: expiredSoonJwt },
        error: null,
      } as never)
      .mockResolvedValueOnce({
        data: { token: freshJwt },
        error: null,
      } as never);

    const firstToken = await getApiToken();
    expect(firstToken).toBe(expiredSoonJwt);
    expect(authClient.token).toHaveBeenCalledTimes(1);

    // Subsequent call triggers refresh because expires in < 60s
    const secondToken = await getApiToken();
    expect(secondToken).toBe(freshJwt);
    expect(authClient.token).toHaveBeenCalledTimes(2);
  });

  it('coalesces concurrent requests into a single in-flight promise', async () => {
    const mockJwt = createMockJwt(900);
    let resolveToken: (val: unknown) => void;
    const pendingPromise = new Promise((resolve) => {
      resolveToken = resolve;
    });

    vi.mocked(authClient.token).mockReturnValueOnce(pendingPromise as never);

    // Trigger 5 concurrent calls
    const promise1 = getApiToken();
    const promise2 = getApiToken();
    const promise3 = getApiToken();
    const promise4 = getApiToken();
    const promise5 = getApiToken();

    resolveToken!({
      data: { token: mockJwt },
      error: null,
    });

    const [t1, t2, t3, t4, t5] = await Promise.all([
      promise1,
      promise2,
      promise3,
      promise4,
      promise5,
    ]);

    expect(t1).toBe(mockJwt);
    expect(t2).toBe(mockJwt);
    expect(t3).toBe(mockJwt);
    expect(t4).toBe(mockJwt);
    expect(t5).toBe(mockJwt);
    expect(authClient.token).toHaveBeenCalledTimes(1);
  });

  it('clearApiToken clears the cached token forcing a new fetch', async () => {
    const mockJwt1 = createMockJwt(900);
    const mockJwt2 = createMockJwt(900);

    vi.mocked(authClient.token)
      .mockResolvedValueOnce({
        data: { token: mockJwt1 },
        error: null,
      } as never)
      .mockResolvedValueOnce({
        data: { token: mockJwt2 },
        error: null,
      } as never);

    await getApiToken();
    expect(authClient.token).toHaveBeenCalledTimes(1);

    clearApiToken();

    const refreshed = await getApiToken();
    expect(refreshed).toBe(mockJwt2);
    expect(authClient.token).toHaveBeenCalledTimes(2);
  });
});
