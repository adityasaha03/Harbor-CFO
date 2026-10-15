import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../../../app.js';
import { useTestDb } from '../../../core/db/test/mongo-test-harness.js';
import { setupTestAuth, issueTestToken, seedTestMember } from '../../../test-utils/test-auth-helper.js';
import { LedgerEntryModel } from '../ledger.model.js';
import { ledgerRepository } from '../ledger.repository.js';
import { ledgerService } from '../ledger.service.js';
import { accountsRepository } from '../../accounts/accounts.repository.js';

describe('Ledger feature tests (Model, getCashAt Calculation & Routes)', () => {
  useTestDb();
  const app = createApp();

  beforeAll(async () => {
    await setupTestAuth();
  });

  describe('Model indexes & uniqueness', () => {
    it('rejects duplicate (tenantId, accountCode, externalId)', async () => {
      await LedgerEntryModel.init();
      await LedgerEntryModel.create({
        tenantId: 'tenant_ldg_1',
        accountCode: '1001',
        externalId: 'TX-001',
        bookedOn: '2026-03-01',
        amountMinor: 50000,
        currency: 'CNY',
        category: 'customer_receipt',
      });

      await expect(
        LedgerEntryModel.create({
          tenantId: 'tenant_ldg_1',
          accountCode: '1001',
          externalId: 'TX-001',
          bookedOn: '2026-03-02',
          amountMinor: 75000,
          currency: 'CNY',
          category: 'customer_receipt',
        }),
      ).rejects.toThrow();
    });

    it('verifies secondary index (tenantId, bookedOn)', async () => {
      await LedgerEntryModel.init();
      const indexes = await LedgerEntryModel.collection.indexes();
      const bookedOnIdx = indexes.find(
        (idx) => idx.key.tenantId === 1 && idx.key.bookedOn === 1,
      );
      expect(bookedOnIdx).toBeDefined();
    });
  });

  describe('getCashAt exact boundary calculation', () => {
    it('ignores entries on or before opening date, sums strictly later entries up to asOf', async () => {
      const tenantId = 'tenant_cash_calc';
      // Create main account with opening balance on 2026-01-10 of 1,000,000 fen (10,000 RMB)
      await accountsRepository.create(tenantId, {
        code: '1001',
        name: 'Main Bank',
        currency: 'CNY',
        openingBalanceMinor: 1000000,
        openingBalanceDate: '2026-01-10',
      });

      await ledgerRepository.bulkUpsert(tenantId, [
        // Entry BEFORE opening date (2026-01-05): must be IGNORED
        {
          accountCode: '1001',
          externalId: 'TX-BEFORE',
          bookedOn: '2026-01-05',
          amountMinor: 999999,
          category: 'customer_receipt',
        },
        // Entry ON opening date (2026-01-10): must be IGNORED
        {
          accountCode: '1001',
          externalId: 'TX-ON-OPENING',
          bookedOn: '2026-01-10',
          amountMinor: 888888,
          category: 'customer_receipt',
        },
        // Entry 1 AFTER opening date (2026-01-11): +200,000
        {
          accountCode: '1001',
          externalId: 'TX-AFTER-1',
          bookedOn: '2026-01-11',
          amountMinor: 200000,
          category: 'customer_receipt',
        },
        // Entry 2 AFTER opening date (2026-01-15): -50,000
        {
          accountCode: '1001',
          externalId: 'TX-AFTER-2',
          bookedOn: '2026-01-15',
          amountMinor: -50000,
          category: 'supplier_payment',
        },
        // Entry 3 ON asOf date (2026-01-20): +30,000
        {
          accountCode: '1001',
          externalId: 'TX-ON-ASOF',
          bookedOn: '2026-01-20',
          amountMinor: 30000,
          category: 'customer_receipt',
        },
        // Entry 4 AFTER asOf date (2026-01-25): must NOT be included in cash at 2026-01-20
        {
          accountCode: '1001',
          externalId: 'TX-FUTURE',
          bookedOn: '2026-01-25',
          amountMinor: 500000,
          category: 'customer_receipt',
        },
      ]);

      // Calculate cash at asOf = '2026-01-20'
      // Expected = opening (1,000,000) + 200,000 - 50,000 + 30,000 = 1,180,000
      const cashAt20th = await ledgerService.getCashAt(tenantId, '2026-01-20');
      expect(cashAt20th).toBe(1180000);

      // Calculate cash at asOf = '2026-01-10' (on opening date) -> exactly opening balance (1,000,000)
      const cashAtOpening = await ledgerService.getCashAt(tenantId, '2026-01-10');
      expect(cashAtOpening).toBe(1000000);

      // Calculate cash at asOf = '2026-01-30' (includes the 2026-01-25 entry)
      // Expected = 1,180,000 + 500,000 = 1,680,000
      const cashAt30th = await ledgerService.getCashAt(tenantId, '2026-01-30');
      expect(cashAt30th).toBe(1680000);
    });
  });

  describe('GET /api/v1/ledger-entries route', () => {
    it('returns paginated ledger entries filtered by category & date range', async () => {
      const tenantId = 'tenant_ldg_route';
      await seedTestMember(tenantId, 'usr_ldg_1', 'reviewer');
      const token = await issueTestToken('usr_ldg_1');

      await ledgerRepository.bulkUpsert(tenantId, [
        {
          accountCode: '1001',
          externalId: 'TX-1',
          bookedOn: '2026-02-01',
          amountMinor: 100000,
          category: 'customer_receipt',
        },
        {
          accountCode: '1001',
          externalId: 'TX-2',
          bookedOn: '2026-02-15',
          amountMinor: -40000,
          category: 'payroll',
        },
        {
          accountCode: '1001',
          externalId: 'TX-3',
          bookedOn: '2026-03-01',
          amountMinor: -20000,
          category: 'payroll',
        },
      ]);

      // Query with category filter
      const payrollRes = await request(app)
        .get('/api/v1/ledger-entries?category=payroll')
        .set('Authorization', `Bearer ${token}`)
        .set('X-Tenant-Id', tenantId);

      expect(payrollRes.status).toBe(200);
      expect(payrollRes.body.data).toHaveLength(2);
      expect(payrollRes.body.meta.total).toBe(2);

      // Query with date range filter
      const febRes = await request(app)
        .get('/api/v1/ledger-entries?from=2026-02-01&to=2026-02-28')
        .set('Authorization', `Bearer ${token}`)
        .set('X-Tenant-Id', tenantId);

      expect(febRes.status).toBe(200);
      expect(febRes.body.data).toHaveLength(2);
    });
  });
});
