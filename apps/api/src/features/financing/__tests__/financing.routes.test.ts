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
import { seedFinancingOffers } from '../financing.repository';
import { FinancingOfferModel } from '../financing.model';

describe('B12 Financing Routes, Catalog, Anchor Matching, and Permissions', () => {
  useTestDb();
  const app = createApp();

  const anchorTenantId = 'tenant_harbor_anchor_financing';
  const ownerUserId = 'usr_owner_financing';
  const reviewerUserId = 'usr_reviewer_financing';
  const otherTenantId = 'tenant_isolated_financing';
  const otherOwnerId = 'usr_other_owner';

  let ownerToken: string;
  let reviewerToken: string;
  let otherToken: string;

  beforeAll(async () => {
    await setupTestAuth();
  });

  beforeEach(async () => {
    await seedTestMember(anchorTenantId, ownerUserId, 'owner');
    await seedTestMember(anchorTenantId, reviewerUserId, 'reviewer');
    await seedTestMember(otherTenantId, otherOwnerId, 'owner');

    ownerToken = await issueTestToken(ownerUserId);
    reviewerToken = await issueTestToken(reviewerUserId);
    otherToken = await issueTestToken(otherOwnerId);

    // Setup Anchor Tenant
    await tenantsRepository.upsertDefaults(anchorTenantId);
    await tenantsRepository.update(anchorTenantId, {
      forecastAsOfDate: '2026-10-20',
      minimumCashMinor: 3_000_000, // floor: 30,000 CNY
      profile: {
        yearsInOperation: 3,
        employeeCount: 15,
        industry: 'Wholesale Trade',
        monthlyRevenueMinor: 20_000_000,
        // Notice: monthlyCardSalesMinor is intentionally omitted to test cannot_assess
      },
    });

    // Opening cash balance 80,000 CNY = 8,000,000 fen
    await accountsRepository.create(anchorTenantId, {
      code: '1001',
      name: 'Primary Bank Account',
      openingBalanceMinor: 8_000_000,
      openingBalanceDate: '2026-10-20',
    });

    // Invoices on anchor tenant
    await invoicesRepository.bulkUpsert(anchorTenantId, [
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

    // Commitments on anchor tenant
    await commitmentsRepository.create(anchorTenantId, {
      label: 'Office rent',
      direction: 'outflow',
      category: 'rent',
      amountMinor: 1_200_000,
      frequency: 'monthly',
      anchorOn: '2026-10-25',
    });
    await commitmentsRepository.create(anchorTenantId, {
      label: 'Staff payroll',
      direction: 'outflow',
      category: 'payroll',
      amountMinor: 4_500_000,
      frequency: 'monthly',
      anchorOn: '2026-11-03',
    });
    await commitmentsRepository.create(anchorTenantId, {
      label: 'Quarterly overhead',
      direction: 'outflow',
      category: 'overhead',
      amountMinor: 800_000,
      frequency: 'once',
      anchorOn: '2026-11-07',
    });
    await commitmentsRepository.create(anchorTenantId, {
      label: 'Recurring retail receipts',
      direction: 'inflow',
      category: 'customer_receipt',
      amountMinor: 1_000_000,
      frequency: 'weekly',
      anchorOn: '2026-11-11',
    });

    // Ensure catalog is seeded idempotently
    await seedFinancingOffers();
  });

  it('idempotently seeds financing offers', async () => {
    const count1 = await seedFinancingOffers();
    expect(count1).toBe(6);

    // Calling again modifies/matches without errors or duplicates
    const count2 = await seedFinancingOffers();
    expect(count2).toBe(6);

    const totalInDb = await FinancingOfferModel.countDocuments();
    expect(totalInDb).toBe(6);
  });

  it('GET /api/v1/financing/offers returns 6 synthetic offers with finance:read permission', async () => {
    // Reviewer has finance:read permission
    const res = await request(app)
      .get('/api/v1/financing/offers')
      .set('Authorization', `Bearer ${reviewerToken}`)
      .set('X-Tenant-Id', anchorTenantId);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(6);

    const codes = res.body.data.map((o: { code: string }) => o.code);
    expect(codes).toContain('bridge-term');
    expect(codes).toContain('revolver-flex');
    expect(codes).toContain('invoice-advance');
    expect(codes).toContain('equipment-lease');
    expect(codes).toContain('merchant-advance');
    expect(codes).toContain('term-loan-slow');

    // Verify Owner can also read offers
    const ownerRes = await request(app)
      .get('/api/v1/financing/offers')
      .set('Authorization', `Bearer ${ownerToken}`)
      .set('X-Tenant-Id', anchorTenantId);
    expect(ownerRes.status).toBe(200);

    // Reject unauthenticated requests
    const unauth = await request(app).get('/api/v1/financing/offers');
    expect(unauth.status).toBe(401);
  });

  it('POST /api/v1/financing/match evaluates anchor tenant matching rules exactly', async () => {
    // Reviewer can also perform read-only matching
    const res = await request(app)
      .post('/api/v1/financing/match')
      .set('Authorization', `Bearer ${reviewerToken}`)
      .set('X-Tenant-Id', anchorTenantId)
      .send({
        purpose: 'working_capital',
      });

    expect(res.status).toBe(200);
    const data = res.body.data;

    // 1. Anchor metrics: gap 5,000,000 fen, breach date 2026-10-29
    expect(data.requiredGapMinor).toBe(5_000_000);
    expect(data.breachDate).toBe('2026-10-29');

    // 2. bridge-term suggested 6,000,000 fen and eligible
    const bridge = data.eligible.find((c: { offer: { code: string } }) => c.offer.code === 'bridge-term');
    expect(bridge).toBeDefined();
    expect(bridge.suggestedPrincipalMinor).toBe(6_000_000);
    expect(bridge.schedule.totalCostMinor).toBe(300_000);
    expect(bridge.schedule.installments).toHaveLength(3);

    // 3. revolver-flex eligible with gap coverage 0.98
    const revolver = data.eligible.find((c: { offer: { code: string } }) => c.offer.code === 'revolver-flex');
    expect(revolver).toBeDefined();
    expect(revolver.suggestedPrincipalMinor).toBe(5_000_000);
    expect(revolver.scoringBreakdown.gapCoverage).toBe(0.98);

    // 4. term-loan-slow excluded with FUNDS_TOO_LATE
    const termSlow = data.excluded.find((e: { offer: { code: string } }) => e.offer.code === 'term-loan-slow');
    expect(termSlow).toBeDefined();
    expect(termSlow.reasons.some((r: { code: string }) => r.code === 'FUNDS_TOO_LATE')).toBe(true);

    // 5. equipment-lease excluded because purpose is working_capital
    const equip = data.excluded.find((e: { offer: { code: string } }) => e.offer.code === 'equipment-lease');
    expect(equip).toBeDefined();
    expect(equip.reasons.some((r: { code: string }) => r.code === 'PURPOSE_NOT_SUPPORTED')).toBe(true);

    // 6. merchant-advance in cannotAssess because monthlyCardSalesMinor is missing
    const merchant = data.cannotAssess.find((c: { offer: { code: string } }) => c.offer.code === 'merchant-advance');
    expect(merchant).toBeDefined();
    expect(merchant.missing).toContain('monthlyCardSalesMinor');
  });

  it('POST /api/v1/financing/match returns reason NO_GAP when liquidity gap is 0', async () => {
    // Setup other tenant with plenty of cash and no AP
    await tenantsRepository.upsertDefaults(otherTenantId);
    await tenantsRepository.update(otherTenantId, {
      forecastAsOfDate: '2026-10-20',
      minimumCashMinor: 1_000_000,
    });
    await accountsRepository.create(otherTenantId, {
      code: '1001',
      name: 'Safe Bank Account',
      openingBalanceMinor: 50_000_000,
      openingBalanceDate: '2026-10-20',
    });

    const res = await request(app)
      .post('/api/v1/financing/match')
      .set('Authorization', `Bearer ${otherToken}`)
      .set('X-Tenant-Id', otherTenantId)
      .send({
        purpose: 'working_capital',
      });

    expect(res.status).toBe(200);
    expect(res.body.data.reason).toBe('NO_GAP');
    expect(res.body.data.requiredGapMinor).toBe(0);
    expect(res.body.data.eligible).toEqual([]);
  });
});
