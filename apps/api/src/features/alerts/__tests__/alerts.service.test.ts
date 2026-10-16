import { describe, expect, it, beforeEach } from 'vitest';
import { useTestDb } from '../../../core/db/test/mongo-test-harness';
import { accountsRepository } from '../../accounts';
import { counterpartiesRepository } from '../../counterparties';
import { invoicesRepository } from '../../invoices';
import { tenantsRepository } from '../../tenants';
import { alertsService } from '../alerts.service';
import { AlertModel } from '../alerts.model';

describe('B10 Alerts Service - Dedup, Resolution and Lifecycle', () => {
  useTestDb();

  const tenantId = 'tenant_alert_test_01';
  const otherTenantId = 'tenant_alert_test_02';

  beforeEach(async () => {
    // 1. Settings
    await tenantsRepository.upsertDefaults(tenantId);
    await tenantsRepository.update(tenantId, {
      forecastAsOfDate: '2026-10-20',
      minimumCashMinor: 3_000_000, // 30,000 CNY floor
      overdueAlertDays: 7,
      concentrationThresholdPct: 40,
    });

    // 2. Initial Operating Account (positive cash)
    await accountsRepository.create(tenantId, {
      code: '1001',
      name: 'Main Bank Account',
      openingBalanceMinor: 8_000_000, // 80,000 CNY
      openingBalanceDate: '2026-10-20',
    });

    // 3. Counterparties
    await counterpartiesRepository.bulkUpsert(tenantId, [
      {
        externalId: 'cust-apex',
        type: 'customer',
        name: 'Apex Distribution Ltd',
      },
      {
        externalId: 'cust-other',
        type: 'customer',
        name: 'Other Retailer',
      },
    ]);
  });

  it('dedup test: evaluating twice creates one alert; changed severity updates it', async () => {
    // Seed overdue AR: 10 days overdue, 10,000 CNY (< 30,000 floor -> medium severity)
    await invoicesRepository.bulkUpsert(tenantId, [
      {
        externalId: 'INV-101',
        direction: 'AR',
        counterpartyExternalId: 'cust-apex',
        totalMinor: 1_000_000,
        outstandingMinor: 1_000_000,
        issuedOn: '2026-09-10',
        dueOn: '2026-10-10', // 10 days overdue relative to 2026-10-20
        expectedSettlementOn: '2026-10-25',
        status: 'open',
      },
      {
        externalId: 'INV-102',
        direction: 'AR',
        counterpartyExternalId: 'cust-other',
        totalMinor: 2_000_000,
        outstandingMinor: 2_000_000,
        issuedOn: '2026-10-01',
        dueOn: '2026-11-05', // not overdue
        expectedSettlementOn: '2026-11-05',
        status: 'open',
      },
    ]);

    // 1. First evaluation: should create overdue alert
    const firstRun = await alertsService.evaluateAndSync(tenantId);
    expect(firstRun.active.length).toBeGreaterThanOrEqual(1);

    const overdueAlert = firstRun.active.find(
      (a) => a.fingerprint === 'overdue_receivable:cust-apex',
    );
    expect(overdueAlert).toBeDefined();
    expect(overdueAlert?.severity).toBe('medium');
    const firstAlertId = overdueAlert?.id;

    const dbAlertsAfterFirst = await AlertModel.find({ tenantId, fingerprint: 'overdue_receivable:cust-apex' });
    expect(dbAlertsAfterFirst).toHaveLength(1);

    // 2. Second evaluation: should dedup and NOT create a new alert
    await alertsService.evaluateAndSync(tenantId);
    const dbAlertsAfterSecond = await AlertModel.find({ tenantId, fingerprint: 'overdue_receivable:cust-apex' });
    expect(dbAlertsAfterSecond).toHaveLength(1);
    expect(String(dbAlertsAfterSecond[0]!._id)).toBe(firstAlertId);

    // 3. Changed condition: make invoice amount 40,000 CNY (>= 30,000 floor -> high severity)
    await invoicesRepository.bulkUpsert(tenantId, [
      {
        externalId: 'INV-101',
        direction: 'AR',
        counterpartyExternalId: 'cust-apex',
        totalMinor: 4_000_000,
        outstandingMinor: 4_000_000,
        issuedOn: '2026-09-10',
        dueOn: '2026-10-10',
        expectedSettlementOn: '2026-10-25',
        status: 'open',
      },
    ]);

    await alertsService.evaluateAndSync(tenantId);
    const dbAlertsAfterThird = await AlertModel.find({ tenantId, fingerprint: 'overdue_receivable:cust-apex' });
    expect(dbAlertsAfterThird).toHaveLength(1);
    expect(String(dbAlertsAfterThird[0]!._id)).toBe(firstAlertId);
    expect(dbAlertsAfterThird[0]!.severity).toBe('high');
    expect(dbAlertsAfterThird[0]!.summary).toContain('¥40,000.00');
  });

  it('resolution test: after the condition clears the alert becomes resolved', async () => {
    // 1. Seed overdue invoice
    await invoicesRepository.bulkUpsert(tenantId, [
      {
        externalId: 'INV-RES-01',
        direction: 'AR',
        counterpartyExternalId: 'cust-apex',
        totalMinor: 1_000_000,
        outstandingMinor: 1_000_000,
        issuedOn: '2026-09-10',
        dueOn: '2026-10-10',
        expectedSettlementOn: '2026-10-25',
        status: 'open',
      },
    ]);

    await alertsService.evaluateAndSync(tenantId);

    const openBefore = await alertsService.list(tenantId, { status: 'open' });
    expect(openBefore.some((a) => a.fingerprint === 'overdue_receivable:cust-apex')).toBe(true);

    // 2. Clear condition: mark invoice paid (outstandingMinor = 0)
    await invoicesRepository.bulkUpsert(tenantId, [
      {
        externalId: 'INV-RES-01',
        direction: 'AR',
        counterpartyExternalId: 'cust-apex',
        totalMinor: 1_000_000,
        outstandingMinor: 0,
        issuedOn: '2026-09-10',
        dueOn: '2026-10-10',
        expectedSettlementOn: '2026-10-25',
        status: 'paid',
      },
    ]);

    const syncResult = await alertsService.evaluateAndSync(tenantId);
    expect(syncResult.resolved.some((a) => a.fingerprint === 'overdue_receivable:cust-apex')).toBe(true);

    const openAfter = await alertsService.list(tenantId, { status: 'open' });
    expect(openAfter.some((a) => a.fingerprint === 'overdue_receivable:cust-apex')).toBe(false);

    const resolvedAfter = await alertsService.list(tenantId, { status: 'resolved' });
    const resolvedAlert = resolvedAfter.find((a) => a.fingerprint === 'overdue_receivable:cust-apex');
    expect(resolvedAlert).toBeDefined();
    expect(resolvedAlert?.status).toBe('resolved');
    expect(resolvedAlert?.resolvedAt).toBeDefined();
  });

  it('repayment pressure workflow: raises and updates repayment pressure alert', async () => {
    const alert = await alertsService.raiseRepaymentPressure(tenantId, {
      refId: 'commitment_bridge_01',
      title: 'Repayment pressure from Bridge Loan',
      summary: 'Upcoming balloon installment of CNY 20,600.00 creates liquidity risk.',
      evidence: [
        {
          type: 'commitment',
          id: 'commitment_bridge_01',
          label: 'Bridge loan installment',
          amountMinor: 2060000,
        },
      ],
    });

    expect(alert.ruleId).toBe('repayment_pressure');
    expect(alert.severity).toBe('high');
    expect(alert.fingerprint).toBe('repayment_pressure:commitment_bridge_01');

    const list = await alertsService.list(tenantId);
    expect(list.some((a) => a.id === alert.id)).toBe(true);
  });

  it('tenant isolation: ensures alerts from one tenant are not accessible by another', async () => {
    await alertsService.raiseRepaymentPressure(tenantId, {
      refId: 'tenant_1_loan',
      title: 'Tenant 1 Alert',
      summary: 'Tenant 1 summary',
      evidence: [],
    });

    const otherList = await alertsService.list(otherTenantId);
    expect(otherList).toHaveLength(0);
  });
});
