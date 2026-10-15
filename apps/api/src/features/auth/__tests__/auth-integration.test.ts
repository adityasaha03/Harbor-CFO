import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { generateKeyPair, exportJWK, SignJWT, createLocalJWKSet, type JWTVerifyGetKey } from 'jose';
import { createApp } from '../../../app';
import { useTestDb } from '../../../core/db/test/mongo-test-harness';
import { getDb } from '../../../core/db/mongo';
import { env } from '../../../config/env';
import { setRemoteJwksForTesting } from '../jwt-verifier';
import { protect } from '../require-permission.middleware';
import { authRouter } from '../auth.routes';
import { ok } from '../../../core/http/respond';

describe('Auth integration tests (Supertest + seeded DB)', () => {
  useTestDb();

  let privateKey: Parameters<SignJWT['sign']>[0];
  const app = createApp();

  // Mount a test route on authRouter using protect('settings:manage') to verify protect() helper end-to-end
  authRouter.get('/test-permission-check', ...protect('settings:manage'), (_req, res) => {
    ok(res, { secret: 'owner-only-settings' });
  });

  beforeAll(async () => {
    const pair = await generateKeyPair('RS256');
    privateKey = pair.privateKey;
    const jwk = await exportJWK(pair.publicKey);
    jwk.kid = 'integration-test-kid';
    jwk.alg = 'RS256';

    const localJwks = createLocalJWKSet({ keys: [jwk] }) as unknown as JWTVerifyGetKey;
    setRemoteJwksForTesting(localJwks);
  });

  async function issueToken(userId: string): Promise<string> {
    return await new SignJWT({ sub: userId })
      .setProtectedHeader({ alg: 'RS256', kid: 'integration-test-kid' })
      .setIssuer(env.BETTER_AUTH_URL)
      .setAudience(env.BETTER_AUTH_URL)
      .setExpirationTime('15m')
      .sign(privateKey);
  }

  it('returns 401 UNAUTHENTICATED when no token is provided', async () => {
    const res = await request(app)
      .get('/api/v1/me')
      .set('X-Tenant-Id', 'org_demo_01');

    expect(res.status).toBe(401);
    expect(res.body.error).toBeDefined();
    expect(res.body.error.code).toBe('UNAUTHENTICATED');
  });

  it('returns 403 FORBIDDEN when user is not a member of the company', async () => {
    const db = getDb();
    await db.collection('organization').insertOne({
      id: 'org_active_01',
      name: 'Active Org',
    });

    const token = await issueToken('user_outsider');

    const res = await request(app)
      .get('/api/v1/me')
      .set('Authorization', `Bearer ${token}`)
      .set('X-Tenant-Id', 'org_active_01');

    expect(res.status).toBe(403);
    expect(res.body.error).toBeDefined();
    expect(res.body.error.code).toBe('FORBIDDEN');
    expect(res.body.error.message).toBe('Not a member of this company');
  });

  it('returns 403 FORBIDDEN with identical response when tenant is unknown', async () => {
    const token = await issueToken('user_any');

    const res = await request(app)
      .get('/api/v1/me')
      .set('Authorization', `Bearer ${token}`)
      .set('X-Tenant-Id', 'org_non_existent');

    expect(res.status).toBe(403);
    expect(res.body.error).toBeDefined();
    expect(res.body.error.code).toBe('FORBIDDEN');
    expect(res.body.error.message).toBe('Not a member of this company');
  });

  it('returns 200 and full permissions for owner', async () => {
    const db = getDb();
    await db.collection('organization').insertOne({
      id: 'org_main_01',
      name: 'Main Org',
    });
    await db.collection('member').insertOne({
      userId: 'user_owner',
      organizationId: 'org_main_01',
      role: 'owner',
    });

    const token = await issueToken('user_owner');

    const res = await request(app)
      .get('/api/v1/me')
      .set('Authorization', `Bearer ${token}`)
      .set('X-Tenant-Id', 'org_main_01');

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({
      userId: 'user_owner',
      tenantId: 'org_main_01',
      role: 'owner',
      permissions: expect.arrayContaining([
        'finance:read',
        'imports:write',
        'scenarios:write',
        'agent:use',
        'actions:propose',
        'actions:approve',
        'audit:export',
        'settings:manage',
      ]),
    });
  });

  it('returns 200 and employee permissions for employee', async () => {
    const db = getDb();
    await db.collection('organization').insertOne({
      id: 'org_main_02',
      name: 'Employee Org',
    });
    await db.collection('member').insertOne({
      userId: 'user_emp',
      organizationId: 'org_main_02',
      role: 'employee',
    });

    const token = await issueToken('user_emp');

    const res = await request(app)
      .get('/api/v1/me')
      .set('Authorization', `Bearer ${token}`)
      .set('X-Tenant-Id', 'org_main_02');

    expect(res.status).toBe(200);
    expect(res.body.data.role).toBe('employee');
    expect(res.body.data.permissions).toContain('finance:read');
    expect(res.body.data.permissions).not.toContain('actions:approve');
    expect(res.body.data.permissions).not.toContain('settings:manage');
  });

  it('returns 200 and reviewer permissions for reviewer', async () => {
    const db = getDb();
    await db.collection('organization').insertOne({
      id: 'org_main_03',
      name: 'Reviewer Org',
    });
    await db.collection('member').insertOne({
      userId: 'user_rev',
      organizationId: 'org_main_03',
      role: 'reviewer',
    });

    const token = await issueToken('user_rev');

    const res = await request(app)
      .get('/api/v1/me')
      .set('Authorization', `Bearer ${token}`)
      .set('X-Tenant-Id', 'org_main_03');

    expect(res.status).toBe(200);
    expect(res.body.data.role).toBe('reviewer');
    expect(res.body.data.permissions).toEqual(['finance:read']);
  });

  it('role change in the database takes effect on the very next request', async () => {
    const db = getDb();
    await db.collection('organization').insertOne({
      id: 'org_dyn_01',
      name: 'Dynamic Org',
    });
    await db.collection('member').insertOne({
      userId: 'user_dynamic',
      organizationId: 'org_dyn_01',
      role: 'employee',
    });

    const token = await issueToken('user_dynamic');

    // First request: member is employee
    const res1 = await request(app)
      .get('/api/v1/me')
      .set('Authorization', `Bearer ${token}`)
      .set('X-Tenant-Id', 'org_dyn_01');

    expect(res1.status).toBe(200);
    expect(res1.body.data.role).toBe('employee');

    // Update member role in MongoDB to owner
    await db.collection('member').updateOne(
      { userId: 'user_dynamic', organizationId: 'org_dyn_01' },
      { $set: { role: 'owner' } },
    );

    // Second request: immediately reflects owner role
    const res2 = await request(app)
      .get('/api/v1/me')
      .set('Authorization', `Bearer ${token}`)
      .set('X-Tenant-Id', 'org_dyn_01');

    expect(res2.status).toBe(200);
    expect(res2.body.data.role).toBe('owner');
    expect(res2.body.data.permissions).toContain('actions:approve');

    // Revoke membership completely by deleting member record
    await db.collection('member').deleteOne({
      userId: 'user_dynamic',
      organizationId: 'org_dyn_01',
    });

    // Third request: immediately 403 Forbidden
    const res3 = await request(app)
      .get('/api/v1/me')
      .set('Authorization', `Bearer ${token}`)
      .set('X-Tenant-Id', 'org_dyn_01');

    expect(res3.status).toBe(403);
    expect(res3.body.error.message).toBe('Not a member of this company');
  });

  it('protect(permission) enforces permission matrix on protected endpoints', async () => {
    const db = getDb();
    await db.collection('organization').insertOne({
      id: 'org_perm_01',
      name: 'Permission Org',
    });
    await db.collection('member').insertOne({
      userId: 'user_reviewer_only',
      organizationId: 'org_perm_01',
      role: 'reviewer',
    });
    await db.collection('member').insertOne({
      userId: 'user_owner_perm',
      organizationId: 'org_perm_01',
      role: 'owner',
    });

    const reviewerToken = await issueToken('user_reviewer_only');
    const ownerToken = await issueToken('user_owner_perm');

    // Reviewer lacks settings:manage -> 403
    const resDenied = await request(app)
      .get('/api/v1/me/test-permission-check')
      .set('Authorization', `Bearer ${reviewerToken}`)
      .set('X-Tenant-Id', 'org_perm_01');

    expect(resDenied.status).toBe(403);
    expect(resDenied.body.error.code).toBe('FORBIDDEN');
    expect(resDenied.body.error.message).toBe('Insufficient permissions');

    // Owner holds settings:manage -> 200
    const resAllowed = await request(app)
      .get('/api/v1/me/test-permission-check')
      .set('Authorization', `Bearer ${ownerToken}`)
      .set('X-Tenant-Id', 'org_perm_01');

    expect(resAllowed.status).toBe(200);
    expect(resAllowed.body.data.secret).toBe('owner-only-settings');
  });
});
