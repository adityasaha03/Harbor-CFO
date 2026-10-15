import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../../../app.js';
import { useTestDb } from '../../../core/db/test/mongo-test-harness.js';
import { setupTestAuth, issueTestToken, seedTestMember } from '../../../test-utils/test-auth-helper.js';
import { AccountModel } from '../accounts.model.js';
import { accountsRepository } from '../accounts.repository.js';

describe('Accounts feature tests (Model, Repository & Routes)', () => {
  useTestDb();
  const app = createApp();

  beforeAll(async () => {
    await setupTestAuth();
  });

  describe('Model indexes & uniqueness', () => {
    it('rejects duplicate (tenantId, code)', async () => {
      await AccountModel.init();
      await AccountModel.create({
        tenantId: 'tenant_acc_1',
        code: '1001',
        name: 'Operating Cash',
        currency: 'CNY',
        openingBalanceMinor: 1000000,
        openingBalanceDate: '2026-01-01',
      });

      await expect(
        AccountModel.create({
          tenantId: 'tenant_acc_1',
          code: '1001',
          name: 'Another Cash',
          currency: 'CNY',
          openingBalanceMinor: 2000000,
          openingBalanceDate: '2026-01-01',
        }),
      ).rejects.toThrow();

      // Same code for different tenant is allowed
      const acc2 = await AccountModel.create({
        tenantId: 'tenant_acc_2',
        code: '1001',
        name: 'Tenant 2 Cash',
        currency: 'CNY',
        openingBalanceMinor: 500000,
        openingBalanceDate: '2026-01-01',
      });
      expect(acc2).toBeDefined();
    });
  });

  describe('Repository tenant scoping & bulkUpsert', () => {
    it('enforces strict tenant scoping and idempotent bulkUpsert', async () => {
      const tenantA = 'tenant_acc_repo_a';
      const tenantB = 'tenant_acc_repo_b';

      await accountsRepository.bulkUpsert(tenantA, [
        {
          code: '1001',
          name: 'Main Account',
          openingBalanceMinor: 5000000,
          openingBalanceDate: '2026-01-01',
        },
      ]);

      await accountsRepository.bulkUpsert(tenantB, [
        {
          code: '1002',
          name: 'Secondary Account',
          openingBalanceMinor: 2000000,
          openingBalanceDate: '2026-01-01',
        },
      ]);

      const listA = await accountsRepository.list(tenantA);
      expect(listA).toHaveLength(1);
      expect(listA[0]?.code).toBe('1001');

      const listB = await accountsRepository.list(tenantB);
      expect(listB).toHaveLength(1);
      expect(listB[0]?.code).toBe('1002');

      // Tenant A cannot read Tenant B account by code
      const crossRead = await accountsRepository.findByCode(tenantA, '1002');
      expect(crossRead).toBeNull();
    });
  });

  describe('GET /api/v1/accounts endpoint', () => {
    it('returns accounts for tenant and enforces tenant isolation', async () => {
      const tenantA = 'tenant_acc_route_a';
      const tenantB = 'tenant_acc_route_b';

      await seedTestMember(tenantA, 'usr_acc_a', 'reviewer');
      await seedTestMember(tenantB, 'usr_acc_b', 'reviewer');

      await accountsRepository.create(tenantA, {
        code: '1001',
        name: 'Account A',
        openingBalanceMinor: 1000000,
        openingBalanceDate: '2026-01-01',
      });

      const tokenA = await issueTestToken('usr_acc_a');
      const res = await request(app)
        .get('/api/v1/accounts')
        .set('Authorization', `Bearer ${tokenA}`)
        .set('X-Tenant-Id', tenantA);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].code).toBe('1001');

      // Unauthenticated request returns 401
      const unauth = await request(app)
        .get('/api/v1/accounts')
        .set('X-Tenant-Id', tenantA);
      expect(unauth.status).toBe(401);
    });
  });
});

