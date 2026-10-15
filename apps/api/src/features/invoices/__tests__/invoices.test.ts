import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../../../app.js';
import { useTestDb } from '../../../core/db/test/mongo-test-harness.js';
import { setupTestAuth, issueTestToken, seedTestMember } from '../../../test-utils/test-auth-helper.js';
import { InvoiceModel } from '../invoices.model.js';
import { invoicesRepository } from '../invoices.repository.js';
import { invoicesService } from '../invoices.service.js';
import { tenantsRepository } from '../../tenants/tenants.repository.js';

describe('Invoices feature tests (Model, Derived Overdue & Routes)', () => {
  useTestDb();
  const app = createApp();

  beforeAll(async () => {
    await setupTestAuth();
  });

  describe('Model indexes & validation', () => {
    it('rejects duplicate (tenantId, externalId)', async () => {
      await InvoiceModel.init();
      await InvoiceModel.create({
        tenantId: 'tenant_inv_1',
        externalId: 'INV-001',
        direction: 'AR',
        counterpartyExternalId: 'CP-1',
        totalMinor: 100000,
        outstandingMinor: 100000,
        currency: 'CNY',
        dueOn: '2026-04-01',
        expectedSettlementOn: '2026-04-05',
        status: 'open',
      });

      await expect(
        InvoiceModel.create({
          tenantId: 'tenant_inv_1',
          externalId: 'INV-001',
          direction: 'AR',
          counterpartyExternalId: 'CP-1',
          totalMinor: 200000,
          outstandingMinor: 200000,
          currency: 'CNY',
          dueOn: '2026-04-10',
          expectedSettlementOn: '2026-04-15',
          status: 'open',
        }),
      ).rejects.toThrow();
    });

    it('verifies secondary compound index for forecast & filtering', async () => {
      await InvoiceModel.init();
      const indexes = await InvoiceModel.collection.indexes();
      const compound = indexes.find(
        (idx) =>
          idx.key.tenantId === 1 &&
          idx.key.direction === 1 &&
          idx.key.status === 1 &&
          idx.key.expectedSettlementOn === 1,
      );
      expect(compound).toBeDefined();
    });
  });

  describe('Derived overdue calculation & listOutstanding', () => {
    it('correctly derives isOverdue based on asOf date and outstandingMinor', async () => {
      const tenantId = 'tenant_inv_overdue';
      // Set asOf date override to 2026-04-10
      await tenantsRepository.upsertDefaults(tenantId);
      await tenantsRepository.update(tenantId, { forecastAsOfDate: '2026-04-10' });

      await invoicesRepository.bulkUpsert(tenantId, [
        // 1: due 2026-04-05 (< 2026-04-10), outstanding > 0 -> OVERDUE
        {
          externalId: 'INV-OVERDUE',
          direction: 'AR',
          counterpartyExternalId: 'CP-1',
          totalMinor: 50000,
          outstandingMinor: 50000,
          dueOn: '2026-04-05',
          expectedSettlementOn: '2026-04-12',
          status: 'open',
        },
        // 2: due 2026-04-05, but paid (outstanding = 0) -> NOT overdue
        {
          externalId: 'INV-PAID',
          direction: 'AR',
          counterpartyExternalId: 'CP-1',
          totalMinor: 50000,
          outstandingMinor: 0,
          dueOn: '2026-04-05',
          expectedSettlementOn: '2026-04-05',
          status: 'paid',
        },
        // 3: due 2026-04-15 (> 2026-04-10) -> NOT overdue
        {
          externalId: 'INV-FUTURE',
          direction: 'AR',
          counterpartyExternalId: 'CP-1',
          totalMinor: 80000,
          outstandingMinor: 80000,
          dueOn: '2026-04-15',
          expectedSettlementOn: '2026-04-15',
          status: 'open',
        },
      ]);

      const all = await invoicesService.list(tenantId);
      const overdueInv = all.find((i) => i.externalId === 'INV-OVERDUE');
      const paidInv = all.find((i) => i.externalId === 'INV-PAID');
      const futureInv = all.find((i) => i.externalId === 'INV-FUTURE');

      expect(overdueInv?.isOverdue).toBe(true);
      expect(paidInv?.isOverdue).toBe(false);
      expect(futureInv?.isOverdue).toBe(false);

      // listOutstanding only returns open/partially_paid with outstanding > 0
      const outstanding = await invoicesService.listOutstanding(tenantId);
      expect(outstanding).toHaveLength(2);
      expect(outstanding.map((i) => i.externalId)).not.toContain('INV-PAID');
    });
  });

  describe('GET /api/v1/invoices endpoint', () => {
    it('filters by direction, status, overdue and enforces tenant isolation', async () => {
      const tenantA = 'tenant_inv_route_a';
      const tenantB = 'tenant_inv_route_b';

      await seedTestMember(tenantA, 'usr_inv_a', 'reviewer');
      await seedTestMember(tenantB, 'usr_inv_b', 'reviewer');

      await tenantsRepository.upsertDefaults(tenantA);
      await tenantsRepository.update(tenantA, { forecastAsOfDate: '2026-04-10' });

      await invoicesRepository.bulkUpsert(tenantA, [
        {
          externalId: 'INV-AR-1',
          direction: 'AR',
          counterpartyExternalId: 'CP-A',
          totalMinor: 100000,
          outstandingMinor: 100000,
          dueOn: '2026-04-01',
          expectedSettlementOn: '2026-04-15',
          status: 'open',
        },
        {
          externalId: 'INV-AP-1',
          direction: 'AP',
          counterpartyExternalId: 'CP-B',
          totalMinor: 40000,
          outstandingMinor: 40000,
          dueOn: '2026-04-20',
          expectedSettlementOn: '2026-04-20',
          status: 'open',
        },
      ]);

      const tokenA = await issueTestToken('usr_inv_a');

      // Filter by direction=AR
      const arRes = await request(app)
        .get('/api/v1/invoices?direction=AR')
        .set('Authorization', `Bearer ${tokenA}`)
        .set('X-Tenant-Id', tenantA);

      expect(arRes.status).toBe(200);
      expect(arRes.body.data).toHaveLength(1);
      expect(arRes.body.data[0].externalId).toBe('INV-AR-1');

      // Filter by overdue=true
      const overdueRes = await request(app)
        .get('/api/v1/invoices?overdue=true')
        .set('Authorization', `Bearer ${tokenA}`)
        .set('X-Tenant-Id', tenantA);

      expect(overdueRes.status).toBe(200);
      expect(overdueRes.body.data).toHaveLength(1);
      expect(overdueRes.body.data[0].externalId).toBe('INV-AR-1');

      // Tenant B gets empty array (isolation)
      const tokenB = await issueTestToken('usr_inv_b');
      const bRes = await request(app)
        .get('/api/v1/invoices')
        .set('Authorization', `Bearer ${tokenB}`)
        .set('X-Tenant-Id', tenantB);

      expect(bRes.status).toBe(200);
      expect(bRes.body.data).toHaveLength(0);
    });
  });
});

