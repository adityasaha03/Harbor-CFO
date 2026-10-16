import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../../../app';
import { useTestDb } from '../../../core/db/test/mongo-test-harness';
import {
  setupTestAuth,
  issueTestToken,
  seedTestMember,
} from '../../../test-utils/test-auth-helper';
import { tenantsRepository } from '../../tenants';
import { accountsRepository } from '../../accounts';
import { invoicesRepository } from '../../invoices';
import { commitmentsRepository } from '../../commitments';

describe('B19 Stress Test Preset Endpoint & Anchor Assertion', () => {
  useTestDb();
  const app = createApp();

  const tenantAnchor = 'tenant_stress_anchor';
  const userOwner = 'usr_stress_owner';
  const userReviewer = 'usr_stress_reviewer';
  let tokenOwner: string;
  let tokenReviewer: string;

  beforeAll(async () => {
    await setupTestAuth();
  });

  beforeEach(async () => {
    await seedTestMember(tenantAnchor, userOwner, 'owner');
    await seedTestMember(tenantAnchor, userReviewer, 'reviewer');
    tokenOwner = await issueTestToken(userOwner);
    tokenReviewer = await issueTestToken(userReviewer);

    // 1. Anchor Tenant Settings
    await tenantsRepository.upsertDefaults(tenantAnchor);
    await tenantsRepository.update(tenantAnchor, {
      forecastAsOfDate: '2026-10-20',
      minimumCashMinor: 3_000_000, // 30,000 CNY floor
    });

    // 2. Day 0 Cash = 80,000 CNY (8,000,000 fen)
    await accountsRepository.create(tenantAnchor, {
      code: 'OPERATING',
      name: 'Primary Operating Cash',
      openingBalanceMinor: 8_000_000,
      openingBalanceDate: '2026-10-20',
    });

    // 3. Anchor Invoices:
    // CUST-001 holds 20,000 CNY (INV-AR-101)
    // CUST-LATE holds 40,000 CNY (INV-AR-LATE) -> largest customer debtor
    await invoicesRepository.bulkUpsert(tenantAnchor, [
      {
        externalId: 'INV-AR-101',
        direction: 'AR',
        counterpartyExternalId: 'CUST-001',
        totalMinor: 2_000_000,
        outstandingMinor: 2_000_000,
        dueOn: '2026-10-30',
        expectedSettlementOn: '2026-11-01',
        status: 'open',
      },
      {
        externalId: 'INV-AR-LATE',
        direction: 'AR',
        counterpartyExternalId: 'CUST-LATE',
        totalMinor: 4_000_000,
        outstandingMinor: 4_000_000,
        dueOn: '2026-09-25',
        expectedSettlementOn: '2026-11-13',
        status: 'open',
      },
      {
        externalId: 'INV-AP-201',
        direction: 'AP',
        counterpartyExternalId: 'SUPP-001',
        totalMinor: 5_500_000,
        outstandingMinor: 5_500_000,
        dueOn: '2026-10-29',
        expectedSettlementOn: '2026-10-29',
        status: 'open',
      },
    ]);

    // Commitments
    await commitmentsRepository.create(tenantAnchor, {
      label: 'Office rent',
      direction: 'outflow',
      category: 'rent',
      amountMinor: 1_200_000,
      frequency: 'monthly',
      anchorOn: '2026-10-25',
    });
    await commitmentsRepository.create(tenantAnchor, {
      label: 'Staff payroll',
      direction: 'outflow',
      category: 'payroll',
      amountMinor: 4_500_000,
      frequency: 'monthly',
      anchorOn: '2026-11-03',
    });
  });

  it('POST /api/v1/scenarios/presets/stress identifies largest debtor and creates 14-day delay scenario', async () => {
    const res = await request(app)
      .post('/api/v1/scenarios/presets/stress')
      .set('Authorization', `Bearer ${tokenOwner}`)
      .set('X-Tenant-Id', tenantAnchor)
      .send({});

    expect(res.status).toBe(201);
    const data = res.body.data;

    // Response structure
    expect(data.scenarioId).toBeDefined();
    expect(data.scenario.name).toBe('Stress Test: Largest Customer Pays 14 Days Late');

    // Changes verification
    const changes = data.scenario.changes;
    expect(changes).toHaveLength(1);
    expect(changes[0]).toEqual({
      type: 'delay_customer_receipts',
      counterpartyExternalId: 'CUST-LATE',
      days: 14,
    });

    // Comparison verification
    expect(data.scenario.comparison).toBeDefined();
    expect(data.baselineSummary).toBeDefined();
    expect(data.scenarioSummary).toBeDefined();
    expect(data.points).toBeDefined();
  });

  it('rejects users without scenarios:write permission (reviewer) with 403 Forbidden', async () => {
    const res = await request(app)
      .post('/api/v1/scenarios/presets/stress')
      .set('Authorization', `Bearer ${tokenReviewer}`)
      .set('X-Tenant-Id', tenantAnchor)
      .send({});

    expect(res.status).toBe(403);
  });

  it('rejects unauthenticated requests with 401 Unauthorized', async () => {
    const res = await request(app)
      .post('/api/v1/scenarios/presets/stress')
      .set('X-Tenant-Id', tenantAnchor)
      .send({});

    expect(res.status).toBe(401);
  });
});
