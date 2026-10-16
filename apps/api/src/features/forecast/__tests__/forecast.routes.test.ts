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
import { ForecastRunModel } from '../forecast.model';

describe('Forecast Routes, Caching, Drilldown, and Tenant Isolation', () => {
  useTestDb();
  const app = createApp();

  const tenantA = 'tenant_routes_a';
  const tenantB = 'tenant_routes_b';
  const userA = 'usr_owner_a';
  const userB = 'usr_owner_b';
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

    // Tenant A setup
    await tenantsRepository.upsertDefaults(tenantA);
    await tenantsRepository.update(tenantA, {
      forecastAsOfDate: '2026-10-20',
      minimumCashMinor: 3_000_000,
    });
    await accountsRepository.create(tenantA, {
      code: '1001',
      name: 'Tenant A Cash',
      openingBalanceMinor: 8_000_000,
      openingBalanceDate: '2026-10-20',
    });
    await invoicesRepository.bulkUpsert(tenantA, [
      {
        externalId: 'INV-A-1',
        direction: 'AP',
        counterpartyExternalId: 'SUPP-A',
        totalMinor: 5_500_000,
        outstandingMinor: 5_500_000,
        dueOn: '2026-10-29',
        expectedSettlementOn: '2026-10-29',
        status: 'open',
      },
    ]);
    await commitmentsRepository.create(tenantA, {
      label: 'Tenant A Rent',
      direction: 'outflow',
      category: 'rent',
      amountMinor: 1_200_000,
      frequency: 'monthly',
      anchorOn: '2026-10-25',
    });

    // Tenant B setup
    await tenantsRepository.upsertDefaults(tenantB);
    await accountsRepository.create(tenantB, {
      code: '1001',
      name: 'Tenant B Cash',
      openingBalanceMinor: 1_000_000,
      openingBalanceDate: '2026-10-20',
    });
  });

  it('caches baseline forecast run: second request does not recompute', async () => {
    const firstRes = await request(app)
      .get('/api/v1/forecasts/latest')
      .set('Authorization', `Bearer ${tokenA}`)
      .set('X-Tenant-Id', tenantA);

    expect(firstRes.status).toBe(200);
    const firstRunId = firstRes.body.data.run.id;
    const firstCreatedAt = firstRes.body.data.run.createdAt;

    const countBefore = await ForecastRunModel.countDocuments({ tenantId: tenantA });
    expect(countBefore).toBe(1);

    // Second call should return cached run without recomputing
    const secondRes = await request(app)
      .get('/api/v1/forecasts/latest')
      .set('Authorization', `Bearer ${tokenA}`)
      .set('X-Tenant-Id', tenantA);

    expect(secondRes.status).toBe(200);
    expect(secondRes.body.data.run.id).toBe(firstRunId);
    expect(secondRes.body.data.run.createdAt).toBe(firstCreatedAt);

    const countAfter = await ForecastRunModel.countDocuments({ tenantId: tenantA });
    expect(countAfter).toBe(1);
  });

  it('triggers a new forecast run when datasetVersion changes', async () => {
    const initialRes = await request(app)
      .get('/api/v1/forecasts/latest')
      .set('Authorization', `Bearer ${tokenA}`)
      .set('X-Tenant-Id', tenantA);

    expect(initialRes.body.data.inputVersion).toBe(1);

    // Invalidate by bumping datasetVersion to 2
    await tenantsRepository.bumpDatasetVersion(tenantA);

    const updatedRes = await request(app)
      .get('/api/v1/forecasts/latest')
      .set('Authorization', `Bearer ${tokenA}`)
      .set('X-Tenant-Id', tenantA);

    expect(updatedRes.status).toBe(200);
    expect(updatedRes.body.data.inputVersion).toBe(2);
    expect(updatedRes.body.data.isStale).toBe(false);

    const totalRuns = await ForecastRunModel.countDocuments({ tenantId: tenantA });
    expect(totalRuns).toBe(2);
  });

  it('supports single-day drill-down provenance endpoint', async () => {
    // 1. Drill-down for invoice settlement day 2026-10-29
    const drillInv = await request(app)
      .get('/api/v1/forecasts/latest/days/2026-10-29')
      .set('Authorization', `Bearer ${tokenA}`)
      .set('X-Tenant-Id', tenantA);

    expect(drillInv.status).toBe(200);
    const invData = drillInv.body.data;
    expect(invData.date).toBe('2026-10-29');
    expect(invData.paymentsMinor).toBe(5_500_000);
    expect(invData.sources.some((s: { id: string }) => s.id === 'INV-A-1')).toBe(true);
    expect(invData.invoices.some((i: { externalId: string }) => i.externalId === 'INV-A-1')).toBe(true);

    // 2. Drill-down for commitment day 2026-10-25
    const drillComm = await request(app)
      .get('/api/v1/forecasts/latest/days/2026-10-25')
      .set('Authorization', `Bearer ${tokenA}`)
      .set('X-Tenant-Id', tenantA);

    expect(drillComm.status).toBe(200);
    const commData = drillComm.body.data;
    expect(commData.paymentsMinor).toBe(1_200_000);
    expect(commData.commitments.length).toBeGreaterThanOrEqual(1);

    // 3. Validation error on bad date format
    const badDate = await request(app)
      .get('/api/v1/forecasts/latest/days/invalid-date')
      .set('Authorization', `Bearer ${tokenA}`)
      .set('X-Tenant-Id', tenantA);

    expect(badDate.status).toBe(400);

    // 4. Not found for date outside forecast horizon
    const outOfHorizon = await request(app)
      .get('/api/v1/forecasts/latest/days/2030-01-01')
      .set('Authorization', `Bearer ${tokenA}`)
      .set('X-Tenant-Id', tenantA);

    expect(outOfHorizon.status).toBe(404);
  });

  it('enforces tenant isolation across all forecast endpoints', async () => {
    // Create baseline for Tenant A
    const resA = await request(app)
      .get('/api/v1/forecasts/latest')
      .set('Authorization', `Bearer ${tokenA}`)
      .set('X-Tenant-Id', tenantA);

    const runAId = resA.body.data.run.id;

    // Tenant B cannot access Tenant A's run by ID
    const crossTenantGet = await request(app)
      .get(`/api/v1/forecasts/${runAId}`)
      .set('Authorization', `Bearer ${tokenB}`)
      .set('X-Tenant-Id', tenantB);

    expect(crossTenantGet.status).toBe(404);

    // Tenant B's latest forecast is completely independent
    const resB = await request(app)
      .get('/api/v1/forecasts/latest')
      .set('Authorization', `Bearer ${tokenB}`)
      .set('X-Tenant-Id', tenantB);

    expect(resB.status).toBe(200);
    expect(resB.body.data.run.id).not.toBe(runAId);
    expect(resB.body.data.run.openingCashMinor).toBe(1_000_000);
  });
});
