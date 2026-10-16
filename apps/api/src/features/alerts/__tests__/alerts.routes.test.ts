import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../../../app';
import { useTestDb } from '../../../core/db/test/mongo-test-harness';
import {
  issueTestToken,
  seedTestMember,
  setupTestAuth,
} from '../../../test-utils/test-auth-helper';
import { alertsService } from '../alerts.service';
import { AlertModel } from '../alerts.model';

describe('B10 Alerts Routes - Endpoints and Tenant Isolation', () => {
  useTestDb();
  const app = createApp();

  const tenantA = 'org_alerts_route_a';
  const tenantB = 'org_alerts_route_b';
  const userA = 'usr_route_a';
  const userB = 'usr_route_b';
  let tokenA: string;
  let tokenB: string;

  beforeAll(async () => {
    await setupTestAuth();
  });

  beforeEach(async () => {
    await seedTestMember(tenantA, userA, 'owner');
    await seedTestMember(tenantB, userB, 'owner');
    tokenA = await issueTestToken(userA);
    tokenB = await issueTestToken(userB);

    // Seed alert for Tenant A
    await alertsService.raiseRepaymentPressure(tenantA, {
      refId: 'loan_a',
      title: 'Tenant A Balloon Payment',
      summary: 'Upcoming payment of CNY 50,000 creates pressure.',
      evidence: [],
    });

    // Seed resolved alert for Tenant A
    await AlertModel.create({
      tenantId: tenantA,
      ruleId: 'stale_data',
      fingerprint: 'stale_data:imports',
      severity: 'info',
      status: 'resolved',
      title: 'Resolved Stale Data Alert',
      summary: 'Data was stale previously.',
      evidence: [],
      firstSeenAt: new Date(Date.now() - 86400000),
      lastSeenAt: new Date(Date.now() - 86400000),
      resolvedAt: new Date(),
    });

    // Seed alert for Tenant B
    await alertsService.raiseRepaymentPressure(tenantB, {
      refId: 'loan_b',
      title: 'Tenant B Balloon Payment',
      summary: 'Tenant B payment.',
      evidence: [],
    });
  });

  describe('GET /api/v1/alerts', () => {
    it('returns 401 without bearer token', async () => {
      const res = await request(app)
        .get('/api/v1/alerts')
        .set('X-Tenant-Id', tenantA);

      expect(res.status).toBe(401);
    });

    it('returns 403 when X-Tenant-Id is missing', async () => {
      const res = await request(app)
        .get('/api/v1/alerts')
        .set('Authorization', `Bearer ${tokenA}`);

      expect(res.status).toBe(403);
    });

    it('returns 200 with list of alerts for authenticated tenant', async () => {
      const res = await request(app)
        .get('/api/v1/alerts')
        .set('Authorization', `Bearer ${tokenA}`)
        .set('X-Tenant-Id', tenantA);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data).toHaveLength(2);

      // Verify tenant B alert is not present
      const fingerprints = res.body.data.map((a: { fingerprint: string }) => a.fingerprint);
      expect(fingerprints).toContain('repayment_pressure:loan_a');
      expect(fingerprints).not.toContain('repayment_pressure:loan_b');
    });

    it('filters alerts by status query (?status=open)', async () => {
      const res = await request(app)
        .get('/api/v1/alerts?status=open')
        .set('Authorization', `Bearer ${tokenA}`)
        .set('X-Tenant-Id', tenantA);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].status).toBe('open');
      expect(res.body.data[0].fingerprint).toBe('repayment_pressure:loan_a');
    });

    it('filters alerts by status query (?status=resolved)', async () => {
      const res = await request(app)
        .get('/api/v1/alerts?status=resolved')
        .set('Authorization', `Bearer ${tokenA}`)
        .set('X-Tenant-Id', tenantA);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].status).toBe('resolved');
      expect(res.body.data[0].fingerprint).toBe('stale_data:imports');
    });
  });

  describe('GET /api/v1/alerts/:id', () => {
    it('returns 200 with alert details by ID', async () => {
      const listRes = await request(app)
        .get('/api/v1/alerts?status=open')
        .set('Authorization', `Bearer ${tokenA}`)
        .set('X-Tenant-Id', tenantA);

      const alertId = listRes.body.data[0].id;

      const res = await request(app)
        .get(`/api/v1/alerts/${alertId}`)
        .set('Authorization', `Bearer ${tokenA}`)
        .set('X-Tenant-Id', tenantA);

      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(alertId);
      expect(res.body.data.title).toContain('Tenant A Balloon Payment');
    });

    it('returns 404 when requesting an alert belonging to another tenant', async () => {
      // Find Tenant B alert ID
      const listB = await request(app)
        .get('/api/v1/alerts')
        .set('Authorization', `Bearer ${tokenB}`)
        .set('X-Tenant-Id', tenantB);

      const alertBId = listB.body.data[0].id;

      // Tenant A tries to access Tenant B's alert
      const res = await request(app)
        .get(`/api/v1/alerts/${alertBId}`)
        .set('Authorization', `Bearer ${tokenA}`)
        .set('X-Tenant-Id', tenantA);

      expect(res.status).toBe(404);
    });

    it('returns 404 for invalid or non-existent ID', async () => {
      const res = await request(app)
        .get('/api/v1/alerts/507f1f77bcf86cd799439011')
        .set('Authorization', `Bearer ${tokenA}`)
        .set('X-Tenant-Id', tenantA);

      expect(res.status).toBe(404);
    });
  });
});
