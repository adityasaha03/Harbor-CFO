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

describe('B11 Analytics Summary Route & Anchor Assertions', () => {
  useTestDb();
  const app = createApp();

  const tenantAnchor = 'tenant_anchor_analytics';
  const tenantOther = 'tenant_other_analytics';
  const userAnchor = 'usr_anchor_owner';
  const userOther = 'usr_other_owner';
  let tokenAnchor: string;
  let tokenOther: string;

  beforeAll(async () => {
    await setupTestAuth();
  });

  beforeEach(async () => {
    await seedTestMember(tenantAnchor, userAnchor, 'owner');
    await seedTestMember(tenantOther, userOther, 'owner');
    tokenAnchor = await issueTestToken(userAnchor);
    tokenOther = await issueTestToken(userOther);

    // 1. Seed Harbor Wholesale Anchor Settings
    await tenantsRepository.upsertDefaults(tenantAnchor);
    await tenantsRepository.update(tenantAnchor, {
      forecastAsOfDate: '2026-10-20',
      minimumCashMinor: 3_000_000, // 30,000 CNY floor
    });

    // 2. Opening Cash = 80,000 CNY (8,000,000 fen)
    await accountsRepository.create(tenantAnchor, {
      code: '1001',
      name: 'Primary Operating Cash',
      openingBalanceMinor: 8_000_000,
      openingBalanceDate: '2026-10-20',
    });

    // 3. Outstanding Invoices
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
        dueOn: '2026-09-25', // 25 days overdue relative to 2026-10-20
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

    // Setup Tenant Other with empty/independent data
    await tenantsRepository.upsertDefaults(tenantOther);
    await accountsRepository.create(tenantOther, {
      code: '1001',
      name: 'Other Cash',
      openingBalanceMinor: 1_234_000,
      openingBalanceDate: '2026-10-20',
    });
  });

  it('GET /api/v1/analytics/summary returns anchor metrics: late customer concentration is 66.7%', async () => {
    const res = await request(app)
      .get('/api/v1/analytics/summary')
      .set('Authorization', `Bearer ${tokenAnchor}`)
      .set('X-Tenant-Id', tenantAnchor);

    expect(res.status).toBe(200);
    const data = res.body.data;

    // Anchor context
    expect(data.asOf).toBe('2026-10-20');
    expect(data.currentCashMinor).toBe(8_000_000);
    expect(data.floorMinor).toBe(3_000_000);

    // Customer Concentration Anchor Check:
    // Total AR = 6,000,000 fen. CUST-LATE = 4,000,000 fen.
    // Concentration = 4,000,000 / 6,000,000 = 66.7%
    const conc = data.concentration;
    expect(conc.isApplicable).toBe(true);
    expect(conc.totalOutstandingMinor).toBe(6_000_000);
    expect(conc.topCustomer).not.toBeNull();
    expect(conc.topCustomer.counterpartyExternalId).toBe('CUST-LATE');
    expect(conc.topCustomer.outstandingMinor).toBe(4_000_000);
    expect(conc.topCustomer.sharePct).toBe(66.7);
    expect(conc.shareBps).toBe(6667);
    expect(conc.isExceeded).toBe(true);

    // AR Aging Anchor Check:
    // INV-AR-101 (2_000_000): due 2026-10-30 -> not yet due
    // INV-AR-LATE (4_000_000): due 2026-09-25 -> 25 days overdue (in 1-30 bucket)
    const arAging = data.aging.ar;
    expect(arAging.notYetDue.amountMinor).toBe(2_000_000);
    expect(arAging.notYetDue.count).toBe(1);
    expect(arAging.overdue1to30.amountMinor).toBe(4_000_000);
    expect(arAging.overdue1to30.count).toBe(1);
    expect(arAging.total.amountMinor).toBe(6_000_000);
    expect(arAging.total.count).toBe(2);

    // AP Aging Check:
    // INV-AP-201 (5_500_000): due 2026-10-29 -> not yet due
    const apAging = data.aging.ap;
    expect(apAging.notYetDue.amountMinor).toBe(5_500_000);
    expect(apAging.notYetDue.count).toBe(1);
    expect(apAging.total.amountMinor).toBe(5_500_000);

    // Data completeness
    expect(data.dataCompleteness.invoiceCount).toBe(3);
    expect(data.dataCompleteness.warnings.length).toBeGreaterThanOrEqual(1);
  });

  it('enforces tenant isolation: separate tenants receive their own analytics data', async () => {
    const resOther = await request(app)
      .get('/api/v1/analytics/summary')
      .set('Authorization', `Bearer ${tokenOther}`)
      .set('X-Tenant-Id', tenantOther);

    expect(resOther.status).toBe(200);
    const dataOther = resOther.body.data;

    expect(dataOther.currentCashMinor).toBe(1_234_000);
    expect(dataOther.concentration.isApplicable).toBe(false);
    expect(dataOther.aging.ar.total.amountMinor).toBe(0);
  });

  it('rejects unauthenticated requests with 401 Unauthorized', async () => {
    const res = await request(app)
      .get('/api/v1/analytics/summary')
      .set('X-Tenant-Id', tenantAnchor);

    expect(res.status).toBe(401);
  });

  it('GET /api/v1/analytics/health-score returns calculated score and top deductions', async () => {
    const res = await request(app)
      .get('/api/v1/analytics/health-score')
      .set('Authorization', `Bearer ${tokenAnchor}`)
      .set('X-Tenant-Id', tenantAnchor);

    expect(res.status).toBe(200);
    const data = res.body.data;
    expect(data.score).toBeGreaterThanOrEqual(0);
    expect(data.score).toBeLessThanOrEqual(100);
    expect(['Excellent', 'Good', 'Fair', 'Poor']).toContain(data.rating);
    expect(data.components).toHaveProperty('liquidity');
    expect(data.components).toHaveProperty('receivables');
    expect(data.components).toHaveProperty('concentration');
    expect(data.components).toHaveProperty('freshness');
    expect(data.deductions).toHaveProperty('liquidity');
    expect(Array.isArray(data.reasons)).toBe(true);
    expect(data.summary).toBeTruthy();
  });

  it('GET /api/v1/analytics/health alias route works seamlessly', async () => {
    const res = await request(app)
      .get('/api/v1/analytics/health')
      .set('Authorization', `Bearer ${tokenAnchor}`)
      .set('X-Tenant-Id', tenantAnchor);

    expect(res.status).toBe(200);
    expect(res.body.data.score).toBeDefined();
  });
});
