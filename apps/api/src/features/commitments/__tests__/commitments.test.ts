import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../../../app.js';
import { useTestDb } from '../../../core/db/test/mongo-test-harness.js';
import { setupTestAuth, issueTestToken, seedTestMember } from '../../../test-utils/test-auth-helper.js';
import { CommitmentModel } from '../commitments.model.js';

describe('Commitments feature tests (Model, Repository & Full CRUD Routes)', () => {
  useTestDb();
  const app = createApp();

  beforeAll(async () => {
    await setupTestAuth();
  });

  describe('Model indexes & uniqueness', () => {
    it('rejects duplicate (tenantId, label)', async () => {
      await CommitmentModel.init();
      await CommitmentModel.create({
        tenantId: 'tenant_cm_1',
        label: 'Office Rent',
        direction: 'outflow',
        category: 'rent',
        amountMinor: 2500000,
        frequency: 'monthly',
        anchorOn: '2026-01-01',
      });

      await expect(
        CommitmentModel.create({
          tenantId: 'tenant_cm_1',
          label: 'Office Rent',
          direction: 'outflow',
          category: 'rent',
          amountMinor: 3000000,
          frequency: 'monthly',
          anchorOn: '2026-02-01',
        }),
      ).rejects.toThrow();
    });
  });

  describe('Full CRUD Routes and RBAC', () => {
    it('supports complete lifecycle: GET, POST, PATCH, DELETE with proper RBAC and isolation', async () => {
      const tenantA = 'tenant_cm_route_a';
      const tenantB = 'tenant_cm_route_b';

      await seedTestMember(tenantA, 'usr_cm_owner_a', 'owner');
      await seedTestMember(tenantA, 'usr_cm_emp_a', 'employee');
      await seedTestMember(tenantB, 'usr_cm_owner_b', 'owner');

      const ownerTokenA = await issueTestToken('usr_cm_owner_a');
      const empTokenA = await issueTestToken('usr_cm_emp_a');
      const ownerTokenB = await issueTestToken('usr_cm_owner_b');

      // 1. Employee cannot POST (403)
      const empPost = await request(app)
        .post('/api/v1/commitments')
        .set('Authorization', `Bearer ${empTokenA}`)
        .set('X-Tenant-Id', tenantA)
        .send({
          label: 'Payroll Batch',
          direction: 'outflow',
          category: 'payroll',
          amountMinor: 5000000,
          frequency: 'monthly',
          anchorOn: '2026-01-25',
        });
      expect(empPost.status).toBe(403);

      // 2. Owner POST valid commitment (201)
      const createRes = await request(app)
        .post('/api/v1/commitments')
        .set('Authorization', `Bearer ${ownerTokenA}`)
        .set('X-Tenant-Id', tenantA)
        .send({
          label: 'Payroll Batch',
          direction: 'outflow',
          category: 'payroll',
          amountMinor: 5000000,
          frequency: 'monthly',
          anchorOn: '2026-01-25',
        });
      expect(createRes.status).toBe(201);
      const createdId = createRes.body.data.id;
      expect(createdId).toBeDefined();
      expect(createRes.body.data.label).toBe('Payroll Batch');

      // 3. Duplicate label returns 409 Conflict
      const dupRes = await request(app)
        .post('/api/v1/commitments')
        .set('Authorization', `Bearer ${ownerTokenA}`)
        .set('X-Tenant-Id', tenantA)
        .send({
          label: 'Payroll Batch',
          direction: 'outflow',
          category: 'payroll',
          amountMinor: 6000000,
          frequency: 'monthly',
          anchorOn: '2026-01-25',
        });
      expect(dupRes.status).toBe(409);

      // 4. Invalid input returns 400
      const badRes = await request(app)
        .post('/api/v1/commitments')
        .set('Authorization', `Bearer ${ownerTokenA}`)
        .set('X-Tenant-Id', tenantA)
        .send({
          label: '',
          direction: 'invalid_dir',
          amountMinor: -100,
        });
      expect(badRes.status).toBe(400);

      // 5. GET /api/v1/commitments returns list
      const getRes = await request(app)
        .get('/api/v1/commitments')
        .set('Authorization', `Bearer ${ownerTokenA}`)
        .set('X-Tenant-Id', tenantA);
      expect(getRes.status).toBe(200);
      expect(getRes.body.data).toHaveLength(1);

      // 6. Tenant B cannot see Tenant A's commitment (isolation)
      const getBRes = await request(app)
        .get('/api/v1/commitments')
        .set('Authorization', `Bearer ${ownerTokenB}`)
        .set('X-Tenant-Id', tenantB);
      expect(getBRes.status).toBe(200);
      expect(getBRes.body.data).toHaveLength(0);

      // 7. Tenant B cannot PATCH Tenant A's commitment (returns 404)
      const crossPatch = await request(app)
        .patch(`/api/v1/commitments/${createdId}`)
        .set('Authorization', `Bearer ${ownerTokenB}`)
        .set('X-Tenant-Id', tenantB)
        .send({ amountMinor: 9999999 });
      expect(crossPatch.status).toBe(404);

      // 8. Owner PATCH commitment (200)
      const patchRes = await request(app)
        .patch(`/api/v1/commitments/${createdId}`)
        .set('Authorization', `Bearer ${ownerTokenA}`)
        .set('X-Tenant-Id', tenantA)
        .send({ amountMinor: 5500000 });
      expect(patchRes.status).toBe(200);
      expect(patchRes.body.data.amountMinor).toBe(5500000);

      // 9. Owner DELETE commitment (200)
      const delRes = await request(app)
        .delete(`/api/v1/commitments/${createdId}`)
        .set('Authorization', `Bearer ${ownerTokenA}`)
        .set('X-Tenant-Id', tenantA);
      expect(delRes.status).toBe(200);
      expect(delRes.body.data.success).toBe(true);

      // 10. GET after DELETE returns empty list
      const afterDel = await request(app)
        .get('/api/v1/commitments')
        .set('Authorization', `Bearer ${ownerTokenA}`)
        .set('X-Tenant-Id', tenantA);
      expect(afterDel.body.data).toHaveLength(0);
    });
  });
});
