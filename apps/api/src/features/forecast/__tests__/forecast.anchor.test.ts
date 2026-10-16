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

describe('B09 Forecast Anchor End-to-End API Test (Harbor Wholesale)', () => {
  useTestDb();
  const app = createApp();

  const tenantId = 'tenant_harbor_wholesale_anchor';
  const userId = 'usr_harbor_owner';
  let token: string;

  beforeAll(async () => {
    await setupTestAuth();
  });

  beforeEach(async () => {
    await seedTestMember(tenantId, userId, 'owner');
    token = await issueTestToken(userId);

    // 1. Settings (as-of date 2026-10-20, floor 30,000 CNY = 3,000,000 fen)
    await tenantsRepository.upsertDefaults(tenantId);
    await tenantsRepository.update(tenantId, {
      forecastAsOfDate: '2026-10-20',
      minimumCashMinor: 3_000_000,
    });

    // 2. Cash balance as of 2026-10-20: 80,000 CNY = 8,000,000 fen
    await accountsRepository.create(tenantId, {
      code: '1001',
      name: 'Primary Operating Account',
      openingBalanceMinor: 8_000_000,
      openingBalanceDate: '2026-10-20',
    });

    // 3. Outstanding Invoices
    await invoicesRepository.bulkUpsert(tenantId, [
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

    // 4. Commitments
    await commitmentsRepository.create(tenantId, {
      label: 'Office rent',
      direction: 'outflow',
      category: 'rent',
      amountMinor: 1_200_000,
      frequency: 'monthly',
      anchorOn: '2026-10-25',
    });
    await commitmentsRepository.create(tenantId, {
      label: 'Staff payroll',
      direction: 'outflow',
      category: 'payroll',
      amountMinor: 4_500_000,
      frequency: 'monthly',
      anchorOn: '2026-11-03',
    });
    await commitmentsRepository.create(tenantId, {
      label: 'Quarterly overhead',
      direction: 'outflow',
      category: 'overhead',
      amountMinor: 800_000,
      frequency: 'once',
      anchorOn: '2026-11-07',
    });
    await commitmentsRepository.create(tenantId, {
      label: 'Recurring retail receipts',
      direction: 'inflow',
      category: 'customer_receipt',
      amountMinor: 1_000_000,
      frequency: 'weekly',
      anchorOn: '2026-11-11',
    });
  });

  it('GET /api/v1/forecasts/latest returns day-21 closing -2,000,000 fen and matches anchor specification', async () => {
    const res = await request(app)
      .get('/api/v1/forecasts/latest')
      .set('Authorization', `Bearer ${token}`)
      .set('X-Tenant-Id', tenantId);

    expect(res.status).toBe(200);
    const data = res.body.data;
    expect(data.asOfDate).toBe('2026-10-20');
    expect(data.horizonDays).toBe(91);
    expect(data.isStale).toBe(false);
    expect(data.assumptions.length).toBeGreaterThanOrEqual(1);

    const points = data.run.points;
    expect(points).toHaveLength(91);

    // Day 0: 2026-10-20
    expect(points[0].date).toBe('2026-10-20');
    expect(points[0].closingMinor).toBe(8_000_000);

    // Day 21: 2026-11-10 -> closing -2,000,000 fen
    const day21 = points[21];
    expect(day21.date).toBe('2026-11-10');
    expect(day21.closingMinor).toBe(-2_000_000);

    // Receipts by day 21 sum to 2,000,000 fen
    let totalReceipts = 0;
    for (let i = 0; i <= 21; i++) {
      totalReceipts += points[i].receiptsMinor;
    }
    expect(totalReceipts).toBe(2_000_000);

    // Payments by day 21 sum to 12,000,000 fen
    let totalPayments = 0;
    for (let i = 0; i <= 21; i++) {
      totalPayments += points[i].paymentsMinor;
    }
    expect(totalPayments).toBe(12_000_000);

    // Summary metrics
    const summary = data.run.summary;
    expect(summary.minCashMinor).toBe(-2_000_000);
    expect(summary.minCashDate).toBe('2026-11-07');
    expect(summary.firstBelowFloorDate).toBe('2026-10-29');
    expect(summary.firstNegativeDate).toBe('2026-11-03');
    expect(summary.liquidityGapMinor).toBe(5_000_000);

    // Conservative min cash is present and <= baseline
    expect(summary.conservativeMinCashMinor).toBeDefined();
    expect(summary.conservativeMinCashMinor).toBeLessThanOrEqual(summary.minCashMinor);

    // Weekly buckets: 13 weeks
    expect(data.weeklyBuckets).toHaveLength(13);
  });
});
