import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { DEMO_TENANTS } from '@harbor/contracts';
import { createApp } from '../../../app';
import { useTestDb } from '../../../core/db/test/mongo-test-harness';
import { setupTestAuth, issueTestToken, seedTestMember } from '../../../test-utils/test-auth-helper';
import { demoService } from '../../demo/demo.service';
import { TenantSettingsModel } from '../../tenants/tenants.model';

describe('B17 Proof Checks (GET & POST /api/v1/proof/checks)', () => {
  useTestDb();
  const app = createApp();

  const harborOrgId = new mongoose.Types.ObjectId();
  const pearlOrgId = new mongoose.Types.ObjectId();
  const nonDemoOrgId = new mongoose.Types.ObjectId();

  const ownerId = 'usr_proof_owner';
  const employeeId = 'usr_proof_employee';
  const reviewerId = 'usr_proof_reviewer';
  const nonDemoOwnerId = 'usr_proof_nondemo_owner';

  beforeAll(async () => {
    await setupTestAuth();
  });

  beforeEach(async () => {
    const db = mongoose.connection;

    // Seed Harbor Wholesale and Pearl Bakery organizations
    await db.collection('organization').updateOne(
      { slug: DEMO_TENANTS.HARBOR_WHOLESALE },
      { $set: { _id: harborOrgId, slug: DEMO_TENANTS.HARBOR_WHOLESALE, name: 'Harbor Wholesale' } },
      { upsert: true }
    );

    await db.collection('organization').updateOne(
      { slug: DEMO_TENANTS.PEARL_BAKERY },
      { $set: { _id: pearlOrgId, slug: DEMO_TENANTS.PEARL_BAKERY, name: 'Pearl Bakery' } },
      { upsert: true }
    );

    // Seed non-demo organization
    await db.collection('organization').updateOne(
      { slug: 'enterprise-client' },
      { $set: { _id: nonDemoOrgId, slug: 'enterprise-client', name: 'Enterprise Client' } },
      { upsert: true }
    );

    await seedTestMember(harborOrgId.toString(), ownerId, 'owner');
    await seedTestMember(harborOrgId.toString(), employeeId, 'employee');
    await seedTestMember(harborOrgId.toString(), reviewerId, 'reviewer');
    await seedTestMember(pearlOrgId.toString(), 'usr_pearl_owner', 'owner');
    await seedTestMember(nonDemoOrgId.toString(), nonDemoOwnerId, 'owner');

    await TenantSettingsModel.create({
      tenantId: nonDemoOrgId.toString(),
      reportingCurrency: 'CNY',
      minimumCashMinor: 1_000_000,
      businessTimezone: 'Asia/Shanghai',
      datasetVersion: 1,
      isDemo: false,
    });

    // Seed full demo data for both demo tenants
    await demoService.seedTenant(DEMO_TENANTS.HARBOR_WHOLESALE);
    await demoService.seedTenant(DEMO_TENANTS.PEARL_BAKERY);
  });

  it('1. GET /api/v1/proof/checks returns catalog of 3 checks for demo tenant', async () => {
    const token = await issueTestToken(ownerId);
    const res = await request(app)
      .get('/api/v1/proof/checks')
      .set('Authorization', `Bearer ${token}`)
      .set('X-Tenant-Id', harborOrgId.toString());

    expect(res.status).toBe(200);
    expect(res.body.data.checks).toHaveLength(3);
    const checkIds = res.body.data.checks.map((c: { id: string }) => c.id);
    expect(checkIds).toContain('employee-execute');
    expect(checkIds).toContain('cross-tenant-lookup');
    expect(checkIds).toContain('injection-import');
  });

  it('2. GET /api/v1/proof/checks rejects non-demo tenants with 403', async () => {
    const token = await issueTestToken(nonDemoOwnerId);
    const res = await request(app)
      .get('/api/v1/proof/checks')
      .set('Authorization', `Bearer ${token}`)
      .set('X-Tenant-Id', nonDemoOrgId.toString());

    expect(res.status).toBe(403);
    expect(res.body.error?.message).toContain('only available for demo tenants');
  });

  describe('Check: employee-execute', () => {
    it('returns not applicable when run by Owner', async () => {
      const token = await issueTestToken(ownerId);
      const res = await request(app)
        .post('/api/v1/proof/checks/employee-execute/run')
        .set('Authorization', `Bearer ${token}`)
        .set('X-Tenant-Id', harborOrgId.toString());

      expect(res.status).toBe(200);
      expect(res.body.data.passed).toBe(true);
      expect(res.body.data.message).toBe('not applicable for your role');
    });

    it('demonstrates 403 and unchanged state when run by Employee', async () => {
      const token = await issueTestToken(employeeId);
      const res = await request(app)
        .post('/api/v1/proof/checks/employee-execute/run')
        .set('Authorization', `Bearer ${token}`)
        .set('X-Tenant-Id', harborOrgId.toString());

      expect(res.status).toBe(200);
      expect(res.body.data.passed).toBe(true);
      expect(res.body.data.actual).toContain('403 Forbidden');
      expect(res.body.data.stateBefore).toEqual(res.body.data.stateAfter);
    });

    it('demonstrates 403 and unchanged state when run by Reviewer', async () => {
      const token = await issueTestToken(reviewerId);
      const res = await request(app)
        .post('/api/v1/proof/checks/employee-execute/run')
        .set('Authorization', `Bearer ${token}`)
        .set('X-Tenant-Id', harborOrgId.toString());

      expect(res.status).toBe(200);
      expect(res.body.data.passed).toBe(true);
      expect(res.body.data.actual).toContain('403 Forbidden');
      expect(res.body.data.stateBefore).toEqual(res.body.data.stateAfter);
    });
  });

  describe('Check: cross-tenant-lookup', () => {
    it('asserts NOT_FOUND when attempting to read record from another demo tenant', async () => {
      const token = await issueTestToken(ownerId);
      const res = await request(app)
        .post('/api/v1/proof/checks/cross-tenant-lookup/run')
        .set('Authorization', `Bearer ${token}`)
        .set('X-Tenant-Id', harborOrgId.toString());

      expect(res.status).toBe(200);
      expect(res.body.data.passed).toBe(true);
      expect(res.body.data.actual).toContain('NOT_FOUND');
    });
  });

  describe('Check: injection-import', () => {
    it('proves replay agent on prompt-injected invoice creates zero rogue proposals or ledger changes', async () => {
      const token = await issueTestToken(ownerId);
      const res = await request(app)
        .post('/api/v1/proof/checks/injection-import/run')
        .set('Authorization', `Bearer ${token}`)
        .set('X-Tenant-Id', harborOrgId.toString());

      expect(res.status).toBe(200);
      expect(res.body.data.passed).toBe(true);
      expect(res.body.data.stateAfter.ledgerEntriesCount).toBe(res.body.data.stateBefore.ledgerEntriesCount);
    });
  });
});
