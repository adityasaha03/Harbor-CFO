import { describe, it, expect } from 'vitest';
import { useTestDb } from '../../../core/db/test/mongo-test-harness.js';
import { CounterpartyModel } from '../counterparties.model.js';
import { counterpartiesRepository } from '../counterparties.repository.js';
import { counterpartiesService } from '../counterparties.service.js';

describe('Counterparties feature tests (Model & Repository)', () => {
  useTestDb();

  describe('Model uniqueness', () => {
    it('rejects duplicate (tenantId, externalId)', async () => {
      await CounterpartyModel.init();
      await CounterpartyModel.create({
        tenantId: 'tenant_cp_1',
        externalId: 'CP-100',
        name: 'Alpha Supplier',
        maskedName: 'Supplier 001',
        type: 'vendor',
      });

      await expect(
        CounterpartyModel.create({
          tenantId: 'tenant_cp_1',
          externalId: 'CP-100',
          name: 'Alpha Supplier Duplicate',
          maskedName: 'Supplier 002',
          type: 'vendor',
        }),
      ).rejects.toThrow();
    });
  });

  describe('Repository tenant scoping', () => {
    it('isolates counterparties between tenants', async () => {
      const tenantA = 'tenant_cp_a';
      const tenantB = 'tenant_cp_b';

      await counterpartiesRepository.bulkUpsert(tenantA, [
        { externalId: 'CP-A', name: 'Vendor A', maskedName: 'Vendor 1', type: 'vendor' },
      ]);
      await counterpartiesRepository.bulkUpsert(tenantB, [
        { externalId: 'CP-B', name: 'Vendor B', maskedName: 'Vendor 2', type: 'vendor' },
      ]);

      const listA = await counterpartiesRepository.list(tenantA);
      expect(listA).toHaveLength(1);
      expect(listA[0]?.externalId).toBe('CP-A');

      const crossFind = await counterpartiesRepository.findByExternalId(tenantA, 'CP-B');
      expect(crossFind).toBeNull();
    });

    it('ensureCounterparty creates missing counterparty idempotently', async () => {
      const tenantId = 'tenant_cp_ensure';
      const cp1 = await counterpartiesService.ensureCounterparty(tenantId, 'CP-NEW', 'vendor', 'Vendor New');
      expect(cp1.externalId).toBe('CP-NEW');
      expect(cp1.type).toBe('vendor');

      const cp2 = await counterpartiesService.ensureCounterparty(tenantId, 'CP-NEW', 'vendor', 'Vendor New');
      expect(cp2.externalId).toBe('CP-NEW');

      const all = await counterpartiesRepository.list(tenantId);
      expect(all).toHaveLength(1);
    });
  });
});
