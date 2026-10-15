import { describe, it, expect, beforeAll } from 'vitest';
import {
  generateKeyPair,
  exportJWK,
  SignJWT,
  createLocalJWKSet,
  type JWTVerifyGetKey,
} from 'jose';
import { verifyAccessToken, setRemoteJwksForTesting } from '../jwt-verifier';
import { UnauthenticatedError } from '../../../core/http/app-error';
import { env } from '../../../config/env';

type KeyPair = Awaited<ReturnType<typeof generateKeyPair>>;

describe('verifyAccessToken', () => {
  let privateKey: KeyPair['privateKey'];
  let localJwks: JWTVerifyGetKey;

  beforeAll(async () => {
    const pair = await generateKeyPair('RS256');
    privateKey = pair.privateKey;
    const jwk = await exportJWK(pair.publicKey);
    jwk.kid = 'test-key-b03';
    jwk.alg = 'RS256';

    localJwks = createLocalJWKSet({ keys: [jwk] }) as unknown as JWTVerifyGetKey;
    setRemoteJwksForTesting(localJwks);
  });

  async function issueToken(
    claims: Record<string, unknown>,
    options: {
      kid?: string;
      alg?: string;
      issuer?: string;
      audience?: string;
      expiresIn?: string;
    } = {},
  ): Promise<string> {
    const jwt = new SignJWT(claims)
      .setProtectedHeader({
        alg: options.alg ?? 'RS256',
        kid: options.kid ?? 'test-key-b03',
      })
      .setIssuer(options.issuer ?? env.BETTER_AUTH_URL)
      .setAudience(options.audience ?? env.BETTER_AUTH_URL)
      .setIssuedAt();

    if (options.expiresIn !== undefined) {
      jwt.setExpirationTime(options.expiresIn);
    } else {
      jwt.setExpirationTime('15m');
    }

    return await jwt.sign(privateKey);
  }

  it('successfully verifies a valid JWT signed with sub claim', async () => {
    const token = await issueToken({ sub: 'user_owner_01' });
    const verified = await verifyAccessToken(token, { keyResolver: localJwks });

    expect(verified.userId).toBe('user_owner_01');
    expect(verified.expiresAt).toBeInstanceOf(Date);
    expect(verified.expiresAt.getTime()).toBeGreaterThan(Date.now());
  });

  it('successfully verifies a JWT using id claim when sub is absent', async () => {
    const token = await issueToken({ id: 'user_employee_02' });
    const verified = await verifyAccessToken(token, { keyResolver: localJwks });

    expect(verified.userId).toBe('user_employee_02');
  });

  it('rejects an expired token with UnauthenticatedError', async () => {
    const token = await issueToken({ sub: 'user_expired' }, { expiresIn: '-1s' });

    await expect(verifyAccessToken(token, { keyResolver: localJwks })).rejects.toThrow(
      UnauthenticatedError,
    );
  });

  it('rejects a token with wrong issuer', async () => {
    const token = await issueToken(
      { sub: 'user_tampered' },
      { issuer: 'https://impostor.harbor.local' },
    );

    await expect(verifyAccessToken(token, { keyResolver: localJwks })).rejects.toThrow(
      UnauthenticatedError,
    );
  });

  it('rejects a token with wrong audience', async () => {
    const token = await issueToken(
      { sub: 'user_tampered' },
      { audience: 'https://unrelated-service.local' },
    );

    await expect(verifyAccessToken(token, { keyResolver: localJwks })).rejects.toThrow(
      UnauthenticatedError,
    );
  });

  it('rejects a tampered signature', async () => {
    const token = await issueToken({ sub: 'user_clean' });
    const parts = token.split('.');
    // Corrupt the signature segment
    const signature = parts[2] ?? '';
    const tampered = `${parts[0]}.${parts[1]}.bad${signature.slice(3)}`;

    await expect(verifyAccessToken(tampered, { keyResolver: localJwks })).rejects.toThrow(
      UnauthenticatedError,
    );
  });

  it('rejects a token missing both sub and id claims', async () => {
    const token = await issueToken({ email: 'nobody@harbor.local' });

    await expect(verifyAccessToken(token, { keyResolver: localJwks })).rejects.toThrow(
      'Invalid token subject',
    );
  });

  it('rejects empty or non-string tokens immediately', async () => {
    await expect(verifyAccessToken('', { keyResolver: localJwks })).rejects.toThrow(
      'Authentication required',
    );
  });
});
