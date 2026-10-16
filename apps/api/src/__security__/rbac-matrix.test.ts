import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../app';
import { useTestDb } from '../core/db/test/mongo-test-harness';
import { setupTestAuth } from '../test-utils/test-auth-helper';
import { setupTwoTenants, type SecurityTestFixtures } from './helpers';

describe('B18 Security Suite 2: RBAC Matrix and Router Security Scanner', () => {
  useTestDb();
  const app = createApp();
  let fix: SecurityTestFixtures;

  beforeAll(async () => {
    await setupTestAuth();
  });

  beforeEach(async () => {
    fix = await setupTwoTenants();
  });

  describe('Permission: actions:approve (Owner only)', () => {
    it('allows Owner to access approval endpoint', async () => {
      const res = await request(app)
        .post(`/api/v1/action-proposals/${fix.sampleIds.proposalAId}/approve`)
        .set('Authorization', `Bearer ${fix.tenantA.owner.token}`)
        .set('X-Tenant-Id', fix.tenantA.id)
        .send({ payloadHash: 'hash_sec_a_proposal' });

      // Owner is allowed past permission gate (may succeed or validate hash)
      expect(res.status).not.toBe(403);
      expect(res.status).not.toBe(401);
    });

    it('denies Employee with 403 on actions:approve', async () => {
      const res = await request(app)
        .post(`/api/v1/action-proposals/${fix.sampleIds.proposalAId}/approve`)
        .set('Authorization', `Bearer ${fix.tenantA.employee.token}`)
        .set('X-Tenant-Id', fix.tenantA.id)
        .send({ payloadHash: 'hash_sec_a_proposal' });

      expect(res.status).toBe(403);
      expect(res.body.error?.code).toBe('FORBIDDEN');
    });

    it('denies Reviewer with 403 on actions:approve', async () => {
      const res = await request(app)
        .post(`/api/v1/action-proposals/${fix.sampleIds.proposalAId}/approve`)
        .set('Authorization', `Bearer ${fix.tenantA.reviewer.token}`)
        .set('X-Tenant-Id', fix.tenantA.id)
        .send({ payloadHash: 'hash_sec_a_proposal' });

      expect(res.status).toBe(403);
      expect(res.body.error?.code).toBe('FORBIDDEN');
    });

    it('denies Anonymous with 401 on actions:approve', async () => {
      const res = await request(app)
        .post(`/api/v1/action-proposals/${fix.sampleIds.proposalAId}/approve`)
        .set('X-Tenant-Id', fix.tenantA.id)
        .send({ payloadHash: 'hash_sec_a_proposal' });

      expect(res.status).toBe(401);
      expect(res.body.error?.code).toBe('UNAUTHENTICATED');
    });
  });

  describe('Permission: settings:manage (Owner only)', () => {
    it('denies Employee with 403 on PATCH /tenant-settings', async () => {
      const res = await request(app)
        .patch('/api/v1/tenant-settings')
        .set('Authorization', `Bearer ${fix.tenantA.employee.token}`)
        .set('X-Tenant-Id', fix.tenantA.id)
        .send({ floorMinor: 5_000_000 });

      expect(res.status).toBe(403);
      expect(res.body.error?.code).toBe('FORBIDDEN');
    });

    it('denies Reviewer with 403 on PATCH /tenant-settings', async () => {
      const res = await request(app)
        .patch('/api/v1/tenant-settings')
        .set('Authorization', `Bearer ${fix.tenantA.reviewer.token}`)
        .set('X-Tenant-Id', fix.tenantA.id)
        .send({ floorMinor: 5_000_000 });

      expect(res.status).toBe(403);
    });
  });

  describe('Permission: audit:export (Owner only)', () => {
    it('allows Owner to access audit events', async () => {
      const res = await request(app)
        .get('/api/v1/audit-events')
        .set('Authorization', `Bearer ${fix.tenantA.owner.token}`)
        .set('X-Tenant-Id', fix.tenantA.id);

      expect(res.status).toBe(200);
    });

    it('denies Employee with 403 on audit:export', async () => {
      const res = await request(app)
        .get('/api/v1/audit-events')
        .set('Authorization', `Bearer ${fix.tenantA.employee.token}`)
        .set('X-Tenant-Id', fix.tenantA.id);

      expect(res.status).toBe(403);
    });

    it('denies Reviewer with 403 on audit:export', async () => {
      const res = await request(app)
        .get('/api/v1/audit-events')
        .set('Authorization', `Bearer ${fix.tenantA.reviewer.token}`)
        .set('X-Tenant-Id', fix.tenantA.id);

      expect(res.status).toBe(403);
    });
  });

  describe('Permission: agent:use (Owner and Employee, not Reviewer)', () => {
    it('denies Reviewer with 403 on POST /agent/runs', async () => {
      const res = await request(app)
        .post('/api/v1/agent/runs')
        .set('Authorization', `Bearer ${fix.tenantA.reviewer.token}`)
        .set('X-Tenant-Id', fix.tenantA.id)
        .send({ prompt: 'Calculate cash gap', style: 'standard' });

      expect(res.status).toBe(403);
      expect(res.body.error?.code).toBe('FORBIDDEN');
    });
  });

  describe('Permission: finance:read (Owner, Employee, and Reviewer)', () => {
    it('allows Reviewer to read accounts', async () => {
      const res = await request(app)
        .get('/api/v1/accounts')
        .set('Authorization', `Bearer ${fix.tenantA.reviewer.token}`)
        .set('X-Tenant-Id', fix.tenantA.id);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThan(0);
    });

    it('denies Anonymous with 401 on finance:read', async () => {
      const res = await request(app)
        .get('/api/v1/accounts')
        .set('X-Tenant-Id', fix.tenantA.id);

      expect(res.status).toBe(401);
      expect(res.body.error?.code).toBe('UNAUTHENTICATED');
    });
  });

  describe('Router Security Stack Inspection', () => {
    it('verifies that only /health/* is public and all /api/v1/* routes reject anonymous requests with 401', async () => {
      // 1. Health routes are explicitly public
      const healthLive = await request(app).get('/health/live');
      expect(healthLive.status).toBe(200);

      const healthReady = await request(app).get('/health/ready');
      expect([200, 503]).toContain(healthReady.status);

      // 2. All /api/v1 feature root endpoints must reject anonymous access with 401
      const apiEndpoints = [
        '/api/v1/me',
        '/api/v1/tenant-settings',
        '/api/v1/accounts',
        '/api/v1/ledger-entries',
        '/api/v1/invoices',
        '/api/v1/commitments',
        '/api/v1/imports',
        '/api/v1/forecasts/latest',
        '/api/v1/alerts',
        '/api/v1/analytics/summary',
        '/api/v1/financing/offers',
        '/api/v1/scenarios',
        '/api/v1/action-proposals',
        '/api/v1/agent/runs',
        '/api/v1/events',
        '/api/v1/audit-events',
      ];

      for (const endpoint of apiEndpoints) {
        const res = await request(app).get(endpoint);
        expect(
          res.status,
          `Endpoint ${endpoint} must require authentication (expected 401, got ${res.status})`,
        ).toBe(401);
      }
    });
  });
});
