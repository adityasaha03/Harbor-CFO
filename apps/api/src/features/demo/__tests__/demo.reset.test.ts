import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { DEMO_TENANTS } from '@harbor/contracts';
import { createApp } from '../../../app';
import { env } from '../../../config/env';
import { useTestDb } from '../../../core/db/test/mongo-test-harness';
import { setupTestAuth, issueTestToken, seedTestMember } from '../../../test-utils/test-auth-helper';
import { TenantSettingsModel } from '../../tenants/tenants.model';

describe('B17 Demo Reset Endpoint (POST /api/v1/demo/reset)', () => {
  useTestDb();
  const app = createApp();

  const harborOrgId = new mongoose.Types.ObjectId();
  const nonDemoOrgId = new mongoose.Types.ObjectId();
  const harborOwnerId = 'usr_harbor_reset_owner';
  const harborEmpId = 'usr_harbor_reset_emp';
  const nonDemoOwnerId = 'usr_nondemo_owner';

  beforeAll(async () => {
    await setupTestAuth();
  });

  beforeEach(async () => {
    const db = mongoose.connection;

    // Seed Harbor Wholesale (Demo)
    await db.collection('organization').updateOne(
      { slug: DEMO_TENANTS.HARBOR_WHOLESALE },
      { $set: { _id: harborOrgId, slug: DEMO_TENANTS.HARBOR_WHOLESALE, name: 'Harbor Wholesale' } },
      { upsert: true }
    );
    await seedTestMember(harborOrgId.toString(), harborOwnerId, 'owner');
    await seedTestMember(harborOrgId.toString(), harborEmpId, 'employee');

    await TenantSettingsModel.create({
      tenantId: harborOrgId.toString(),
      reportingCurrency: 'CNY',
      minimumCashMinor: 3_000_000,
      businessTimezone: 'Asia/Shanghai',
      datasetVersion: 1,
      isDemo: true,
    });

    // Seed non-demo tenant
    await db.collection('organization').updateOne(
      { slug: 'real-corp' },
      { $set: { _id: nonDemoOrgId, slug: 'real-corp', name: 'Real Corp' } },
      { upsert: true }
    );
    await seedTestMember(nonDemoOrgId.toString(), nonDemoOwnerId, 'owner');

    await TenantSettingsModel.create({
      tenantId: nonDemoOrgId.toString(),
      reportingCurrency: 'CNY',
      minimumCashMinor: 1_000_000,
      businessTimezone: 'Asia/Shanghai',
      datasetVersion: 1,
      isDemo: false,
    });
  });

  it('1. rejects unauthenticated requests with 401', async () => {
    const res = await request(app)
      .post('/api/v1/demo/reset')
      .set('X-Tenant-Id', harborOrgId.toString());

    expect(res.status).toBe(401);
  });

  it('2. rejects employee (lacking settings:manage permission) with 403', async () => {
    const token = await issueTestToken(harborEmpId);
    const res = await request(app)
      .post('/api/v1/demo/reset')
      .set('Authorization', `Bearer ${token}`)
      .set('X-Tenant-Id', harborOrgId.toString());

    expect(res.status).toBe(403);
  });

  it('3. returns 404 when ENABLE_DEMO_RESET is false', async () => {
    env.ENABLE_DEMO_RESET = false;
    const token = await issueTestToken(harborOwnerId);

    const res = await request(app)
      .post('/api/v1/demo/reset')
      .set('Authorization', `Bearer ${token}`)
      .set('X-Tenant-Id', harborOrgId.toString());

    expect(res.status).toBe(404);
    expect(res.body.error?.message).toContain('disabled');
  });

  it('4. rejects non-demo tenants with 403 even when flag is enabled', async () => {
    env.ENABLE_DEMO_RESET = true;
    const token = await issueTestToken(nonDemoOwnerId);

    const res = await request(app)
      .post('/api/v1/demo/reset')
      .set('Authorization', `Bearer ${token}`)
      .set('X-Tenant-Id', nonDemoOrgId.toString());

    expect(res.status).toBe(403);
    expect(res.body.error?.message).toContain('only available for demo tenants');
  });

  it('5. successfully resets demo tenant when flag is true and caller is owner of demo tenant', async () => {
    env.ENABLE_DEMO_RESET = true;
    const token = await issueTestToken(harborOwnerId);

    const res = await request(app)
      .post('/api/v1/demo/reset')
      .set('Authorization', `Bearer ${token}`)
      .set('X-Tenant-Id', harborOrgId.toString());

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('reset_completed');
    expect(res.body.data.slug).toBe(DEMO_TENANTS.HARBOR_WHOLESALE);
    expect(res.body.data.tenantId).toBe(harborOrgId.toString());
  });
});
