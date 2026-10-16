import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import request from 'supertest';
import { generateKeyPair, exportJWK, SignJWT, createLocalJWKSet, type JWTVerifyGetKey } from 'jose';
import mongoose from 'mongoose';
import { createApp } from '../../../app';
import { useTestDb } from '../../../core/db/test/mongo-test-harness';
import { getDb } from '../../../core/db/mongo';
import { env } from '../../../config/env';
import { setRemoteJwksForTesting } from '../jwt-verifier';
import { DEMO_EMAILS, DEMO_TENANTS } from '@harbor/contracts';

const { ObjectId } = mongoose.Types;

describe('Auth Handshake Scenarios (S02 - Web to API contract)', () => {
  useTestDb();

  let privateKey: Parameters<SignJWT['sign']>[0];
  const app = createApp();

  const harborTenantId = new ObjectId().toHexString();
  const pearlTenantId = new ObjectId().toHexString();

  const harborOwnerUserId = new ObjectId().toHexString();
  const harborEmployeeUserId = new ObjectId().toHexString();
  const harborReviewerUserId = new ObjectId().toHexString();
  const pearlOwnerUserId = new ObjectId().toHexString();

  beforeAll(async () => {
    // Generate asymmetric keypair to simulate Better Auth JWKS endpoint
    const pair = await generateKeyPair('RS256');
    privateKey = pair.privateKey;
    const jwk = await exportJWK(pair.publicKey);
    jwk.kid = 'handshake-test-kid';
    jwk.alg = 'RS256';

    const localJwks = createLocalJWKSet({ keys: [jwk] }) as unknown as JWTVerifyGetKey;
    setRemoteJwksForTesting(localJwks);
  });

  beforeEach(async () => {
    const db = getDb();
    await db.collection('organization').deleteMany({});
    await db.collection('member').deleteMany({});

    // Seed organizations (stored with ObjectId _id as verified in S02)
    await db.collection('organization').insertMany([
      {
        _id: new ObjectId(harborTenantId),
        name: 'Harbor Wholesale',
        slug: DEMO_TENANTS.HARBOR_WHOLESALE,
      },
      {
        _id: new ObjectId(pearlTenantId),
        name: 'Pearl Bakery',
        slug: DEMO_TENANTS.PEARL_BAKERY,
      },
    ]);

    // Seed memberships (stored with ObjectId foreign keys as verified in S02)
    await db.collection('member').insertMany([
      {
        _id: new ObjectId(),
        organizationId: new ObjectId(harborTenantId),
        userId: new ObjectId(harborOwnerUserId),
        role: 'owner',
      },
      {
        _id: new ObjectId(),
        organizationId: new ObjectId(harborTenantId),
        userId: new ObjectId(harborEmployeeUserId),
        role: 'employee',
      },
      {
        _id: new ObjectId(),
        organizationId: new ObjectId(harborTenantId),
        userId: new ObjectId(harborReviewerUserId),
        role: 'reviewer',
      },
      {
        _id: new ObjectId(),
        organizationId: new ObjectId(pearlTenantId),
        userId: new ObjectId(pearlOwnerUserId),
        role: 'owner',
      },
    ]);
  });

  async function issueToken(userId: string, email: string): Promise<string> {
    return await new SignJWT({
      id: userId,
      email,
      sub: userId,
    })
      .setProtectedHeader({ alg: 'RS256', kid: 'handshake-test-kid' })
      .setIssuer(env.BETTER_AUTH_URL)
      .setAudience(env.BETTER_AUTH_URL)
      .setExpirationTime('15m')
      .sign(privateKey);
  }

  it('Scenario 1: Harbor Owner accesses /api/v1/me -> 200 OK with owner role and full permissions', async () => {
    const token = await issueToken(harborOwnerUserId, DEMO_EMAILS.HARBOR_OWNER);

    const res = await request(app)
      .get('/api/v1/me')
      .set('Authorization', `Bearer ${token}`)
      .set('X-Tenant-Id', harborTenantId);

    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({
      userId: harborOwnerUserId,
      tenantId: harborTenantId,
      role: 'owner',
    });
    expect(res.body.data.permissions).toContain('actions:approve');
    expect(res.body.data.permissions).toContain('settings:manage');
  });

  it('Scenario 2: Harbor Employee accesses /api/v1/me -> 200 OK with employee role', async () => {
    const token = await issueToken(harborEmployeeUserId, DEMO_EMAILS.HARBOR_EMPLOYEE);

    const res = await request(app)
      .get('/api/v1/me')
      .set('Authorization', `Bearer ${token}`)
      .set('X-Tenant-Id', harborTenantId);

    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({
      userId: harborEmployeeUserId,
      tenantId: harborTenantId,
      role: 'employee',
    });
    expect(res.body.data.permissions).toContain('imports:write');
    expect(res.body.data.permissions).not.toContain('actions:approve');
  });

  it('Scenario 3: Harbor Reviewer accesses /api/v1/me -> 200 OK with reviewer role (read-only)', async () => {
    const token = await issueToken(harborReviewerUserId, DEMO_EMAILS.HARBOR_REVIEWER);

    const res = await request(app)
      .get('/api/v1/me')
      .set('Authorization', `Bearer ${token}`)
      .set('X-Tenant-Id', harborTenantId);

    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({
      userId: harborReviewerUserId,
      tenantId: harborTenantId,
      role: 'reviewer',
    });
    expect(res.body.data.permissions).toContain('finance:read');
    expect(res.body.data.permissions).not.toContain('imports:write');
  });

  it('Scenario 4: Cross-tenant isolation - Owner of Pearl sending Harbor tenant ID -> 403 Forbidden', async () => {
    const pearlToken = await issueToken(pearlOwnerUserId, DEMO_EMAILS.PEARL_OWNER);

    const res = await request(app)
      .get('/api/v1/me')
      .set('Authorization', `Bearer ${pearlToken}`)
      .set('X-Tenant-Id', harborTenantId);

    expect(res.status).toBe(403);
    expect(res.body.error).toBeDefined();
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  it('Scenario 5: Missing Authorization token -> 401 Unauthorized', async () => {
    const res = await request(app)
      .get('/api/v1/me')
      .set('X-Tenant-Id', harborTenantId);

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHENTICATED');
  });

  it('Scenario 6: Malformed token -> 401 Unauthorized', async () => {
    const res = await request(app)
      .get('/api/v1/me')
      .set('Authorization', 'Bearer invalid.jwt.signature')
      .set('X-Tenant-Id', harborTenantId);

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHENTICATED');
  });

  it('Scenario 7: Missing X-Tenant-Id header -> 403 Forbidden', async () => {
    const token = await issueToken(harborOwnerUserId, DEMO_EMAILS.HARBOR_OWNER);

    const res = await request(app)
      .get('/api/v1/me')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });
});
