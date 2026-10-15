import {
  createRemoteJWKSet,
  jwtVerify,
  type JWTVerifyGetKey,
} from 'jose';
import { env } from '../../config/env';
import { UnauthenticatedError } from '../../core/http/app-error';

export interface VerifiedToken {
  userId: string;
  expiresAt: Date;
}

export type KeyResolver = Parameters<typeof jwtVerify>[1];

let remoteJwksCache: JWTVerifyGetKey | null = null;

export function getJwksUrl(): string {
  if (env.BETTER_AUTH_JWKS_URL) {
    return env.BETTER_AUTH_JWKS_URL;
  }
  return new URL('/api/auth/jwks', env.BETTER_AUTH_URL).toString();
}

export function getDefaultJwks(): JWTVerifyGetKey {
  if (!remoteJwksCache) {
    remoteJwksCache = createRemoteJWKSet(new URL(getJwksUrl()));
  }
  return remoteJwksCache;
}

export function setRemoteJwksForTesting(customJwks: JWTVerifyGetKey | null): void {
  remoteJwksCache = customJwks;
}

export interface VerifyAccessTokenOptions {
  keyResolver?: KeyResolver;
  issuer?: string;
  audience?: string;
  currentDate?: Date;
}

/**
 * Verifies a Better Auth JWT access token against JWKS.
 * Enforces issuer, audience, signature and expiry.
 */
export async function verifyAccessToken(
  token: string,
  options: VerifyAccessTokenOptions = {},
): Promise<VerifiedToken> {
  if (!token || typeof token !== 'string') {
    throw new UnauthenticatedError('Authentication required');
  }

  const keyResolver = options.keyResolver ?? getDefaultJwks();
  const issuer = options.issuer ?? env.BETTER_AUTH_URL;
  const audience = options.audience ?? env.BETTER_AUTH_URL;

  try {
    const { payload } = await jwtVerify(token, keyResolver as Parameters<typeof jwtVerify>[1], {
      issuer,
      audience,
      currentDate: options.currentDate,
    });

    const rawSub = payload.sub ?? payload.id;
    if (typeof rawSub !== 'string' || rawSub.trim().length === 0) {
      throw new UnauthenticatedError('Invalid token subject');
    }

    const expiresAt =
      typeof payload.exp === 'number'
        ? new Date(payload.exp * 1000)
        : new Date(Date.now() + 15 * 60 * 1000);

    return {
      userId: rawSub.trim(),
      expiresAt,
    };
  } catch (error) {
    if (error instanceof UnauthenticatedError) {
      throw error;
    }
    // Conceal specific cryptographic or parsing reasons to prevent oracle attacks
    throw new UnauthenticatedError('Invalid or expired token');
  }
}
