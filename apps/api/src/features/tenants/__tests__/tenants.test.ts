import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../../../app.js';
import { useTestDb } from '../../../core/db/test/mongo-test-harness.js';
import { setupTestAuth, issueTestToken, seedTestMember } from '../../../test-utils/test-auth-helper.js';
import { TenantSettingsModel } from '../tenants.model.js';
import { tenantsRepository } from '../tenants.repository.js';
import { tenantsService } from '../tenants.service.js';

describe('Tenants feature tests (Model, Concurrency & Routes)', () => {
  useTestDb();
  const app = createApp();

  beforeAll(async () => {
    await setupTestAuth();
  });

  describe('Model indexes & validation', () => {
    it('rejects duplicate tenantId', async () => {
      await TenantSettingsModel.init();
      await TenantSettingsModel.create({
        tenantId: 'tenant_uniq_1',
        datasetVersion: 1,
        minimumCashMinor: 500000,
        businessTimezone: 'Asia/Shanghai',
        profile: {
          yearsInOperation: 3,
          industry: 'Technology',
        },
      });

      await expect(
        TenantSettingsModel.create({
          tenantId: 'tenant_uniq_1',
          datasetVersion: 1,
          minimumCashMinor: 100000,
        }),
      ).rejects.toThrow();
    });
  });

  describe('bumpDatasetVersion concurrency', () => {
    it('atomically increments datasetVersion under 20 concurrent bumps', async () => {
      const tenantId = 'tenant_concur_bump';
      await tenantsService.ensureSettings(tenantId);

      const results = await Promise.all(
        Array.from({ length: 20 }, () => tenantsService.bumpDatasetVersion(tenantId)),
      );

      // Verify all results are distinct integers from 2 to 21
      expect(new Set(results).size).toBe(20);
      const maxVersion = Math.max(...results);
      expect(maxVersion).toBe(21);

      const finalSettings = await tenantsRepository.findByTenantId(tenantId);
      expect(finalSettings?.datasetVersion).toBe(21);
    });
  });

  describe('getForecastAsOf', () => {
    it('returns forecastAsOfDate override when configured', async () => {
      const tenantId = 'tenant_asof_override';
      await tenantsRepository.upsertDefaults(tenantId);
      await tenantsRepository.update(tenantId, { forecastAsOfDate: '2026-06-15' });

      const asOf = await tenantsService.getForecastAsOf(tenantId);
      expect(asOf).toBe('2026-06-15');
    });

    it('returns formatted date string when override is not set', async () => {
      const tenantId = 'tenant_asof_default';
      const asOf = await tenantsService.getForecastAsOf(tenantId);
      expect(asOf).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
  });

  describe('Tenant settings endpoints', () => {
    it('GET /api/v1/tenant-settings returns defaults and enforces tenant isolation', async () => {
      const tenantA = 'tenant_sett_a';
      const tenantB = 'tenant_sett_b';
      await seedTestMember(tenantA, 'usr_sett_a', 'reviewer');
      await seedTestMember(tenantB, 'usr_sett_b', 'reviewer');

      const tokenA = await issueTestToken('usr_sett_a');
      const tokenB = await issueTestToken('usr_sett_b');

      const resA = await request(app)
        .get('/api/v1/tenant-settings')
        .set('Authorization', `Bearer ${tokenA}`)
        .set('X-Tenant-Id', tenantA);

      expect(resA.status).toBe(200);
      expect(resA.body.data.tenantId).toBe(tenantA);
      expect(resA.body.data.minimumCashMinor).toBe(0);

      const resB = await request(app)
        .get('/api/v1/tenant-settings')
        .set('Authorization', `Bearer ${tokenB}`)
        .set('X-Tenant-Id', tenantB);

      expect(resB.status).toBe(200);
      expect(resB.body.data.tenantId).toBe(tenantB);
    });

    it('PATCH /api/v1/tenant-settings allows owner and rejects employee with 403', async () => {
      const tenantId = 'tenant_patch_rbac';
      await seedTestMember(tenantId, 'usr_patch_owner', 'owner');
      await seedTestMember(tenantId, 'usr_patch_emp', 'employee');

      const ownerToken = await issueTestToken('usr_patch_owner');
      const empToken = await issueTestToken('usr_patch_emp');

      // Employee cannot patch settings
      const empRes = await request(app)
        .patch('/api/v1/tenant-settings')
        .set('Authorization', `Bearer ${empToken}`)
        .set('X-Tenant-Id', tenantId)
        .send({ minimumCashMinor: 20000000 });

      expect(empRes.status).toBe(403);

      // Owner can patch settings
      const ownerRes = await request(app)
        .patch('/api/v1/tenant-settings')
        .set('Authorization', `Bearer ${ownerToken}`)
        .set('X-Tenant-Id', tenantId)
        .send({
          minimumCashMinor: 25000000,
          profile: {
            yearsInOperation: 5,
            industry: 'FinTech',
          },
        });

      expect(ownerRes.status).toBe(200);
      expect(ownerRes.body.data.minimumCashMinor).toBe(25000000);
      expect(ownerRes.body.data.profile.industry).toBe('FinTech');
    });

    it('PATCH /api/v1/tenant-settings returns 400 on invalid input', async () => {
      const tenantId = 'tenant_patch_bad';
      await seedTestMember(tenantId, 'usr_bad_owner', 'owner');
      const token = await issueTestToken('usr_bad_owner');

      const res = await request(app)
        .patch('/api/v1/tenant-settings')
        .set('Authorization', `Bearer ${token}`)
        .set('X-Tenant-Id', tenantId)
        .send({ minimumCashMinor: -500 });

      expect(res.status).toBe(400);
    });
  });
});
