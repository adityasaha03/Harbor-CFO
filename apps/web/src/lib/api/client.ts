import { authClient, getApiToken, clearApiToken } from '@/features/auth';
import { ApiError } from './errors';
import type { ErrorCode, ApiErrorDetail } from '@harbor/contracts';

let currentTenantId: string | null = null;

export function setActiveTenantId(tenantId: string | null): void {
  currentTenantId = tenantId;
}

export function getActiveTenantId(): string | null {
  return currentTenantId;
}

export interface ApiFetchOptions extends Omit<RequestInit, 'body'> {
  body?: BodyInit | Record<string, unknown> | null;
  tenantId?: string;
  idempotencyKey?: string;
  skipAuth?: boolean;
  _isRetry?: boolean;
}

async function resolveTenantId(explicitTenantId?: string): Promise<string | null> {
  if (explicitTenantId) return explicitTenantId;
  if (currentTenantId) return currentTenantId;

  try {
    const sessionRes = await authClient.getSession();
    const activeOrgId = (
      sessionRes?.data?.session as { activeOrganizationId?: string | null } | undefined
    )?.activeOrganizationId;
    if (activeOrgId) {
      currentTenantId = activeOrgId;
      return activeOrgId;
    }
  } catch {
    // Non-blocking fallback
  }

  return null;
}

/**
 * Standard typed fetch wrapper for HarborCFO Express API (/api/v1).
 * Injects Authorization Bearer JWT and X-Tenant-Id headers.
 * Unwraps { data } envelope and handles 401 single-flight retry.
 */
export async function apiFetch<T>(path: string, options: ApiFetchOptions = {}): Promise<T> {
  const baseUrl = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000').replace(/\/+$/, '');
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  const fullUrl = cleanPath.startsWith('/api/v1')
    ? `${baseUrl}${cleanPath}`
    : `${baseUrl}/api/v1${cleanPath}`;

  const headers = new Headers(options.headers);

  // Authentication header
  if (!options.skipAuth) {
    try {
      const token = await getApiToken();
      if (token) {
        headers.set('Authorization', `Bearer ${token}`);
      }
    } catch (tokenErr) {
      throw new ApiError({
        code: 'UNAUTHENTICATED',
        status: 401,
        message: tokenErr instanceof Error ? tokenErr.message : 'Authentication required',
        cause: tokenErr,
      });
    }
  }

  // Tenant header
  const tenantId = await resolveTenantId(options.tenantId);
  if (tenantId) {
    headers.set('X-Tenant-Id', tenantId);
  }

  // Optional idempotency key for money actions
  if (options.idempotencyKey) {
    headers.set('Idempotency-Key', options.idempotencyKey);
  }

  // Body and content type
  let requestBody: BodyInit | undefined;
  const rawBody = options.body;
  const isFormData = typeof FormData !== 'undefined' && rawBody instanceof FormData;

  if (isFormData) {
    requestBody = rawBody;
    headers.delete('Content-Type');
  } else if (rawBody !== undefined && rawBody !== null) {
    if (typeof rawBody === 'string') {
      requestBody = rawBody;
      if (!headers.has('Content-Type')) {
        headers.set('Content-Type', 'application/json');
      }
    } else {
      requestBody = JSON.stringify(rawBody);
      headers.set('Content-Type', 'application/json');
    }
  }

  let response: Response;
  try {
    response = await fetch(fullUrl, {
      ...options,
      headers,
      body: requestBody,
    });
  } catch (netErr) {
    throw new ApiError({
      code: 'INTERNAL',
      status: 0,
      message: netErr instanceof Error ? netErr.message : 'Network connection failed',
      cause: netErr,
    });
  }

  // Handle 401 Unauthorized with single token refresh retry
  if (response.status === 401) {
    if (!options._isRetry) {
      try {
        await getApiToken({ forceRefresh: true });
        return await apiFetch<T>(path, { ...options, _isRetry: true });
      } catch {
        // Fall through to logout handling if refresh fails
      }
    }

    clearApiToken();
    setActiveTenantId(null);
    try {
      await authClient.signOut();
    } catch {
      // Ignore sign-out errors on forced redirect
    }
    if (typeof window !== 'undefined' && process.env.NODE_ENV !== 'test') {
      window.location.href = '/sign-in';
    }
    throw new ApiError({
      code: 'UNAUTHENTICATED',
      status: 401,
      message: 'Session expired. Please sign in again.',
    });
  }

  // Parse response body
  const contentType = response.headers.get('content-type') || '';
  const isJson = contentType.includes('application/json');

  if (response.status === 204) {
    return undefined as T;
  }

  let responseJson: Record<string, unknown> | null = null;
  if (isJson) {
    try {
      responseJson = (await response.json()) as Record<string, unknown>;
    } catch {
      responseJson = null;
    }
  }

  if (!response.ok) {
    const errorPayload = responseJson?.error as
      | {
          code?: ErrorCode;
          message?: string;
          details?: ApiErrorDetail[] | Record<string, unknown>[];
          requestId?: string;
        }
      | undefined;

    const code: ErrorCode =
      errorPayload?.code || (response.status === 403 ? 'FORBIDDEN' : 'INTERNAL');

    throw new ApiError({
      code,
      status: response.status,
      message: errorPayload?.message || `HTTP ${response.status} ${response.statusText}`,
      requestId: errorPayload?.requestId,
      details: errorPayload?.details,
    });
  }

  if (responseJson && 'data' in responseJson) {
    return responseJson.data as T;
  }

  return responseJson as T;
}
