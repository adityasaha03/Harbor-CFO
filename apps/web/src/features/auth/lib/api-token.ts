import { authClient } from './auth-client';

interface CachedToken {
  token: string;
  expiresAt: number;
}

let cachedToken: CachedToken | null = null;
let inFlightPromise: Promise<string> | null = null;

const REFRESH_BUFFER_MS = 60 * 1000; // Refresh when less than 60s remain

/**
 * Decodes the exp claim from a JWT without external libraries.
 * Returns the expiration epoch in milliseconds.
 */
export function parseJwtExpiration(token: string): number {
  try {
    const parts = token.split('.');
    if (parts.length < 2) return 0;
    const base64Url = parts[1];
    if (!base64Url) return 0;
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
    const jsonStr =
      typeof atob === 'function'
        ? atob(padded)
        : Buffer.from(padded, 'base64').toString('utf-8');
    const payload = JSON.parse(jsonStr) as { exp?: number };
    return typeof payload.exp === 'number' ? payload.exp * 1000 : 0;
  } catch {
    return 0;
  }
}

/**
 * Checks whether the cached token exists and has more than 60s remaining.
 */
function isTokenFresh(cache: CachedToken | null): boolean {
  if (!cache || !cache.token) return false;
  return cache.expiresAt - Date.now() > REFRESH_BUFFER_MS;
}

interface TokenResponse {
  data?: { token?: string } | string | null;
  error?: { message?: string } | null;
}

/**
 * Retrieves a valid JWT from memory cache or fetches a fresh one from authClient.
 * Concurrent callers share a single in-flight request.
 */
export async function getApiToken(options?: { forceRefresh?: boolean }): Promise<string> {
  if (!options?.forceRefresh && isTokenFresh(cachedToken)) {
    return cachedToken!.token;
  }

  if (inFlightPromise) {
    return inFlightPromise;
  }

  inFlightPromise = (async () => {
    try {
      const tokenFn = (authClient as unknown as { token?: () => Promise<TokenResponse> }).token;
      if (typeof tokenFn !== 'function') {
        throw new Error('Better Auth client token plugin is not configured');
      }
      const res = await tokenFn();
      const rawToken =
        typeof res?.data === 'string'
          ? res.data
          : (res?.data as { token?: string } | undefined)?.token;

      if (!rawToken || res?.error) {
        throw new Error(res?.error?.message || 'Failed to acquire API authentication token');
      }

      const expiresAt = parseJwtExpiration(rawToken);
      // Fallback: if exp claim is absent or unparseable, default to 15 min lifetime
      const fallbackExpiresAt = Date.now() + 15 * 60 * 1000;

      cachedToken = {
        token: rawToken,
        expiresAt: expiresAt > Date.now() ? expiresAt : fallbackExpiresAt,
      };

      return rawToken;
    } finally {
      inFlightPromise = null;
    }
  })();

  return inFlightPromise;
}

/**
 * Clears the in-memory token cache. Call on sign-out and active company switch.
 */
export function clearApiToken(): void {
  cachedToken = null;
  inFlightPromise = null;
}
