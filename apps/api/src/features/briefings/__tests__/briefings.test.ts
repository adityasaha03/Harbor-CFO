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

describe('B19 Weekly Briefing Route & Anchor Snapshot', () => {
  useTestDb();
  const app = createApp();

  const tenantAnchor = 'tenant_anchor_briefings';
  const userAnchor = 'usr_anchor_owner';
  let tokenAnchor: string;

  beforeAll(async () => {
    await setupTestAuth();
  });

  beforeEach(async () => {
    await seedTestMember(tenantAnchor, userAnchor, 'owner');
    tokenAnchor = await issueTestToken(userAnchor);

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

    // 3. Invoices: Receipts by day 21 = 20k (INV-AR-101), Overdue = 40k (INV-AR-LATE), Supplier = 55k (INV-AP-201)
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
        expectedSettlementOn: '2026-11-13', // Day 24
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

    // 4. Anchor Commitments from specification
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
    await commitmentsRepository.create(tenantAnchor, {
      label: 'Quarterly overhead',
      direction: 'outflow',
      category: 'overhead',
      amountMinor: 800_000,
      frequency: 'once',
      anchorOn: '2026-11-07',
    });
    await commitmentsRepository.create(tenantAnchor, {
      label: 'Recurring retail receipts',
      direction: 'inflow',
      category: 'customer_receipt',
      amountMinor: 1_000_000,
      frequency: 'weekly',
      anchorOn: '2026-11-11',
    });
  });

  it('GET /api/v1/briefings/latest generates accurate deterministic narrative and metrics on anchor fixture', async () => {
    const res = await request(app)
      .get('/api/v1/briefings/latest')
      .set('Authorization', `Bearer ${tokenAnchor}`)
      .set('X-Tenant-Id', tenantAnchor);

    expect(res.status).toBe(200);
    const briefing = res.body.data;

    // Deterministic metrics assertion
    expect(briefing.tenantId).toBe(tenantAnchor);
    expect(briefing.asOfDate).toBe('2026-10-20');
    expect(briefing.metrics.currentCashMinor).toBe(8_000_000); // 80,000 CNY
    expect(briefing.metrics.floorMinor).toBe(3_000_000); // 30,000 CNY
    expect(briefing.metrics.minCashMinor).toBe(-2_000_000); // -20,000 CNY
    expect(briefing.metrics.minCashDate).toBe('2026-11-07');
    expect(briefing.metrics.liquidityGapMinor).toBe(5_000_000); // 50,000 CNY
    expect(briefing.metrics.overdueArMinor).toBe(4_000_000); // 40,000 CNY

    // Narrative checks
    expect(briefing.sections.whatHappened).toContain('¥80,000');
    expect(briefing.sections.whatHappened).toContain('¥40,000 is overdue');
    expect(briefing.sections.whatMatters).toContain('-¥20,000');
    expect(briefing.sections.whatMatters).toContain('2026-11-07');
    expect(briefing.sections.whatMatters).toContain('¥50,000');
    expect(briefing.sections.whatToDoNext).toContain('INV-AR-LATE');
    expect(briefing.sections.whatToDoNext).toContain('¥40,000');
    expect(briefing.sections.whatToDoNext).toContain('¥50,000');

    // Snapshot matching on deterministic narrative sections
    expect(briefing.sections).toMatchInlineSnapshot(`
      {
        "whatHappened": "Operating cash stands at ¥80,000 as of 2026-10-20. Outstanding customer receivables total ¥60,000, of which ¥40,000 is overdue past contractual payment terms.",
        "whatMatters": "Projected cash turns negative, reaching a low of -¥20,000 on 2026-11-07. This breaches the ¥30,000 safety floor, leaving a ¥50,000 liquidity shortfall. No critical risk alerts are active.",
        "whatToDoNext": "Expedite collection on invoice INV-AR-LATE (¥40,000) to accelerate cash inflow prior to day-21 cash dip. Review eligible financing options (such as bridge loan or revolving credit) to secure up to ¥50,000 in standby liquidity.",
      }
    `);
  });

  it('rejects unauthenticated requests with 401', async () => {
    const res = await request(app)
      .get('/api/v1/briefings/latest')
      .set('X-Tenant-Id', tenantAnchor);

    expect(res.status).toBe(401);
  });
});
