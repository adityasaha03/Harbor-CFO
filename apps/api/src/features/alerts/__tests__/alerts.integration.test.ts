import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../../../app';
import { useTestDb } from '../../../core/db/test/mongo-test-harness';
import {
  issueTestToken,
  seedTestMember,
  setupTestAuth,
} from '../../../test-utils/test-auth-helper';
import { accountsRepository } from '../../accounts';
import { commitmentsRepository } from '../../commitments';
import { counterpartiesRepository } from '../../counterparties';
import { tenantsRepository } from '../../tenants';
import { AlertModel } from '../alerts.model';

describe('B10 Alerts Reactive Integration - Fixture Import Triggers Alerts', () => {
  useTestDb();
  const app = createApp();

  const tenantId = 'org_harbor_anchor_alerts';
  const ownerId = 'usr_anchor_alerts_owner';
  let token: string;

  beforeAll(async () => {
    await setupTestAuth();
  });

  beforeEach(async () => {
    await seedTestMember(tenantId, ownerId, 'owner');
    token = await issueTestToken(ownerId);

    // 1. Settings (Anchor Demo)
    await tenantsRepository.upsertDefaults(tenantId);
    await tenantsRepository.update(tenantId, {
      forecastAsOfDate: '2026-10-20',
      minimumCashMinor: 3_000_000, // 30,000 CNY floor
      overdueAlertDays: 7,
      concentrationThresholdPct: 40,
    });

    // 2. Opening Cash = 80,000 CNY (8,000,000 fen)
    await accountsRepository.create(tenantId, {
      code: '1001',
      name: 'Primary Operating Account',
      openingBalanceMinor: 8_000_000,
      openingBalanceDate: '2026-10-20',
    });

    // 3. Counterparties
    await counterpartiesRepository.bulkUpsert(tenantId, [
      {
        externalId: 'CUST-001',
        type: 'customer',
        name: 'Standard Customer 001',
      },
      {
        externalId: 'CUST-LATE',
        type: 'customer',
        name: 'Apex Distribution Ltd',
      },
      {
        externalId: 'SUPP-001',
        type: 'vendor',
        name: 'Primary Materials Supplier',
      },
    ]);

    // 4. Anchor commitments (Rent, Payroll, Overhead)
    await commitmentsRepository.create(tenantId, {
      label: 'Office rent',
      direction: 'outflow',
      category: 'rent',
      amountMinor: 1_200_000, // 12,000 CNY on 2026-10-25
      frequency: 'monthly',
      anchorOn: '2026-10-25',
    });
    await commitmentsRepository.create(tenantId, {
      label: 'Staff payroll',
      direction: 'outflow',
      category: 'payroll',
      amountMinor: 4_500_000, // 45,000 CNY on 2026-11-03
      frequency: 'monthly',
      anchorOn: '2026-11-03',
    });
    await commitmentsRepository.create(tenantId, {
      label: 'Quarterly overhead',
      direction: 'outflow',
      category: 'overhead',
      amountMinor: 800_000, // 8,000 CNY on 2026-11-07
      frequency: 'once',
      anchorOn: '2026-11-07',
    });
  });

  it('importing the fixture publishes forecast.updated then creates floor_breach, negative_cash, customer_concentration and overdue_receivable alerts without any other call', async () => {
    // Invoices CSV content matching Harbor Wholesale fixture
    const csvContent = [
      'invoiceId,direction,counterpartyId,total,outstanding,currency,dueDate,expectedSettlementDate,status',
      'INV-AR-101,AR,CUST-001,20000.00,20000.00,CNY,2026-10-30,2026-11-01,open',
      'INV-AR-LATE,AR,CUST-LATE,40000.00,40000.00,CNY,2026-09-25,2026-11-13,open',
      'INV-AP-201,AP,SUPP-001,55000.00,55000.00,CNY,2026-10-29,2026-10-29,open',
    ].join('\n');

    // Step 1: Preview import
    const prevRes = await request(app)
      .post('/api/v1/imports/preview')
      .set('Authorization', `Bearer ${token}`)
      .set('X-Tenant-Id', tenantId)
      .field('kind', 'invoices')
      .attach('file', Buffer.from(csvContent, 'utf-8'), 'anchor-invoices.csv');

    expect(prevRes.status).toBe(200);
    const importId = prevRes.body.data.importId;
    expect(importId).toBeDefined();

    // Verify no alerts exist before commit
    const alertsBefore = await AlertModel.find({ tenantId, status: 'open' });
    expect(alertsBefore).toHaveLength(0);

    // Step 2: Commit import
    const commitRes = await request(app)
      .post(`/api/v1/imports/${importId}/commit`)
      .set('Authorization', `Bearer ${token}`)
      .set('X-Tenant-Id', tenantId);

    expect(commitRes.status).toBe(200);
    expect(commitRes.body.data.status).toBe('committed');

    // Step 3: Wait for event loop domain listeners to handle reactive events
    let openAlerts = await AlertModel.find({ tenantId, status: 'open' });
    const deadline = Date.now() + 3000;
    while (openAlerts.length < 4 && Date.now() < deadline) {
      await new Promise((resolve) => setTimeout(resolve, 50));
      openAlerts = await AlertModel.find({ tenantId, status: 'open' });
    }

    // Step 4: Verify open alerts in database without making any further calls
    const ruleIds = openAlerts.map((a) => a.ruleId);

    // Assert that all four required alerts were created proactively
    expect(ruleIds).toContain('floor_breach');
    expect(ruleIds).toContain('negative_cash');
    expect(ruleIds).toContain('customer_concentration');
    expect(ruleIds).toContain('overdue_receivable');

    // Check specific anchor details
    const floorAlert = openAlerts.find((a) => a.ruleId === 'floor_breach');
    expect(floorAlert?.severity).toBe('high');
    expect(floorAlert?.summary).toContain('¥30,000.00');

    const negCashAlert = openAlerts.find((a) => a.ruleId === 'negative_cash');
    expect(negCashAlert?.severity).toBe('critical');
    expect(negCashAlert?.title).toContain('2026-11-03');

    const concAlert = openAlerts.find((a) => a.ruleId === 'customer_concentration');
    expect(concAlert?.severity).toBe('medium');
    expect(concAlert?.summary).toContain('66.7%');
    expect(concAlert?.fingerprint).toBe('customer_concentration:CUST-LATE');

    const overdueAlert = openAlerts.find((a) => a.ruleId === 'overdue_receivable');
    expect(overdueAlert?.severity).toBe('high');
    expect(overdueAlert?.fingerprint).toBe('overdue_receivable:CUST-LATE');
  });
});
