import { generateKeyPair, exportJWK, SignJWT, createLocalJWKSet, type JWTVerifyGetKey } from 'jose';
import { env } from '../config/env.js';
import { getDb } from '../core/db/mongo.js';
import { setRemoteJwksForTesting } from '../features/auth/jwt-verifier.js';

let privateKey: Parameters<SignJWT['sign']>[0] | null = null;
const KID = 'test-auth-kid';

export async function setupTestAuth(): Promise<void> {
  const pair = await generateKeyPair('RS256');
  privateKey = pair.privateKey;
  const jwk = await exportJWK(pair.publicKey);
  jwk.kid = KID;
  jwk.alg = 'RS256';

  const localJwks = createLocalJWKSet({ keys: [jwk] }) as unknown as JWTVerifyGetKey;
  setRemoteJwksForTesting(localJwks);
}

export async function issueTestToken(userId: string): Promise<string> {
  if (!privateKey) {
    await setupTestAuth();
  }
  return new SignJWT({ sub: userId })
    .setProtectedHeader({ alg: 'RS256', kid: KID })
    .setIssuer(env.BETTER_AUTH_URL)
    .setAudience(env.BETTER_AUTH_URL)
    .setExpirationTime('15m')
    .sign(privateKey!);
}

export async function seedTestMember(
  tenantId: string,
  userId: string,
  role: 'owner' | 'employee' | 'reviewer' = 'owner',
): Promise<void> {
  const db = getDb();
  await db.collection('organization').updateOne(
    { id: tenantId },
    { $set: { id: tenantId, name: `Org ${tenantId}` } },
    { upsert: true },
  );
  await db.collection('member').updateOne(
    { userId, organizationId: tenantId },
    { $set: { userId, organizationId: tenantId, role } },
    { upsert: true },
  );
}
