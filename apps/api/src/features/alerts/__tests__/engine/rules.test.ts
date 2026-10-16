import { describe, expect, it } from 'vitest';
import {
  evaluateAlerts,
  evaluateCustomerConcentration,
  evaluateFloorBreach,
  evaluateNegativeCash,
  evaluateOverdueReceivables,
  evaluateStaleData,
} from '../../engine';
import type { AlertEvaluationContext } from '../../engine/types';

function createBaseContext(): AlertEvaluationContext {
  return {
    tenantId: 'org_test_01',
    asOfDate: '2026-10-20',
    settings: {
      minimumCashMinor: 3000000, // 30,000.00 CNY
      overdueAlertDays: 7,
      concentrationThresholdPct: 40,
      staleDataDays: 14,
    },
    forecastSummary: {
      firstNegativeDate: null,
      firstBelowFloorDate: null,
      liquidityGapMinor: 0,
      minCashMinor: 5000000,
      points: [],
    },
    invoices: [],
    lastCommittedImportAt: '2026-10-18T10:00:00Z',
  };
}

describe('Alerts Engine - Rules Evaluation', () => {
  describe('negative_cash rule', () => {
    it('triggers critical alert when firstNegativeDate is present with provenance outflows', () => {
      const ctx = createBaseContext();
      ctx.forecastSummary = {
        firstNegativeDate: '2026-11-10',
        firstBelowFloorDate: '2026-10-29',
        liquidityGapMinor: 5000000,
        minCashMinor: -2000000,
        points: [
          {
            date: '2026-11-10',
            closingMinor: -2000000,
            receiptsMinor: 0,
            paymentsMinor: 5000000,
            financingMinor: 0,
            feesMinor: 0,
            repaymentsMinor: 0,
            sources: [
              {
                type: 'commitment',
                id: 'comm-payroll-01',
                label: 'Payroll',
                amountMinor: -5000000,
              },
            ],
          },
        ],
      };

      const alert = evaluateNegativeCash(ctx);
      expect(alert).not.toBeNull();
      expect(alert?.ruleId).toBe('negative_cash');
      expect(alert?.severity).toBe('critical');
      expect(alert?.fingerprint).toBe('negative_cash:horizon');
      expect(alert?.title).toContain('2026-11-10');
      expect(alert?.summary).toContain('Payroll');
      expect(alert?.evidence.length).toBeGreaterThanOrEqual(1);
    });

    it('does not trigger when firstNegativeDate is null', () => {
      const ctx = createBaseContext();
      ctx.forecastSummary!.firstNegativeDate = null;
      expect(evaluateNegativeCash(ctx)).toBeNull();
    });
  });

  describe('floor_breach rule', () => {
    it('triggers high severity alert when firstBelowFloorDate is present', () => {
      const ctx = createBaseContext();
      ctx.forecastSummary = {
        firstNegativeDate: null,
        firstBelowFloorDate: '2026-10-29',
        liquidityGapMinor: 5000000,
        minCashMinor: 1000000,
        points: [],
      };

      const alert = evaluateFloorBreach(ctx);
      expect(alert).not.toBeNull();
      expect(alert?.ruleId).toBe('floor_breach');
      expect(alert?.severity).toBe('high');
      expect(alert?.fingerprint).toBe('floor_breach:horizon');
      expect(alert?.summary).toContain('¥50,000.00');
    });

    it('does not trigger when firstBelowFloorDate is null', () => {
      const ctx = createBaseContext();
      ctx.forecastSummary!.firstBelowFloorDate = null;
      expect(evaluateFloorBreach(ctx)).toBeNull();
    });
  });

  describe('overdue_receivable rule', () => {
    it('triggers high severity when overdue 30+ days', () => {
      const ctx = createBaseContext();
      ctx.invoices = [
        {
          id: 'inv-01',
          invoiceNumber: 'INV-2026-001',
          direction: 'AR',
          counterpartyExternalId: 'cust-apex',
          counterpartyName: 'Apex Distribution Ltd',
          totalMinor: 4000000,
          outstandingMinor: 4000000,
          dueOn: '2026-09-15', // 35 days overdue relative to 2026-10-20
          status: 'issued',
        },
      ];

      const alerts = evaluateOverdueReceivables(ctx);
      expect(alerts).toHaveLength(1);
      expect(alerts[0]!.ruleId).toBe('overdue_receivable');
      expect(alerts[0]!.severity).toBe('high');
      expect(alerts[0]!.fingerprint).toBe('overdue_receivable:cust-apex');
      expect(alerts[0]!.summary).toContain('Apex Distribution Ltd');
      expect(alerts[0]!.summary).toContain('35 days past due');
    });

    it('triggers high severity when overdue amount >= minimumCashFloor', () => {
      const ctx = createBaseContext();
      ctx.settings.minimumCashMinor = 3000000;
      ctx.invoices = [
        {
          id: 'inv-02',
          invoiceNumber: 'INV-2026-002',
          direction: 'AR',
          counterpartyExternalId: 'cust-big',
          counterpartyName: 'Big Buyer Corp',
          totalMinor: 3500000,
          outstandingMinor: 3500000, // 35,000 > 30,000 floor
          dueOn: '2026-10-10', // 10 days overdue (< 30 days)
          status: 'issued',
        },
      ];

      const alerts = evaluateOverdueReceivables(ctx);
      expect(alerts).toHaveLength(1);
      expect(alerts[0]!.severity).toBe('high');
    });

    it('triggers medium severity when overdue days >= threshold but < 30 and amount < floor', () => {
      const ctx = createBaseContext();
      ctx.settings.minimumCashMinor = 3000000;
      ctx.invoices = [
        {
          id: 'inv-03',
          invoiceNumber: 'INV-2026-003',
          direction: 'AR',
          counterpartyExternalId: 'cust-small',
          counterpartyName: 'Small Buyer',
          totalMinor: 500000,
          outstandingMinor: 500000, // 5,000 < 30,000
          dueOn: '2026-10-10', // 10 days overdue >= 7 threshold
          status: 'issued',
        },
      ];

      const alerts = evaluateOverdueReceivables(ctx);
      expect(alerts).toHaveLength(1);
      expect(alerts[0]!.severity).toBe('medium');
    });

    it('boundary: triggers exactly at overdueAlertDays (7 days)', () => {
      const ctx = createBaseContext();
      ctx.settings.overdueAlertDays = 7;
      ctx.invoices = [
        {
          id: 'inv-boundary',
          invoiceNumber: 'INV-BOUNDARY',
          direction: 'AR',
          counterpartyExternalId: 'cust-b',
          totalMinor: 100000,
          outstandingMinor: 100000,
          dueOn: '2026-10-13', // exactly 7 days before 2026-10-20
          status: 'issued',
        },
      ];

      const alerts = evaluateOverdueReceivables(ctx);
      expect(alerts).toHaveLength(1);
    });

    it('boundary: does not trigger when overdue days is strictly less than overdueAlertDays (6 days)', () => {
      const ctx = createBaseContext();
      ctx.settings.overdueAlertDays = 7;
      ctx.invoices = [
        {
          id: 'inv-sub-boundary',
          invoiceNumber: 'INV-SUB',
          direction: 'AR',
          counterpartyExternalId: 'cust-b',
          totalMinor: 100000,
          outstandingMinor: 100000,
          dueOn: '2026-10-14', // 6 days before 2026-10-20
          status: 'issued',
        },
      ];

      const alerts = evaluateOverdueReceivables(ctx);
      expect(alerts).toHaveLength(0);
    });

    it('ignores paid invoices and AP invoices', () => {
      const ctx = createBaseContext();
      ctx.invoices = [
        {
          id: 'inv-paid',
          invoiceNumber: 'INV-PAID',
          direction: 'AR',
          counterpartyExternalId: 'cust-paid',
          totalMinor: 100000,
          outstandingMinor: 0,
          dueOn: '2026-09-01',
          status: 'paid',
        },
        {
          id: 'inv-ap',
          invoiceNumber: 'INV-AP',
          direction: 'AP',
          counterpartyExternalId: 'supp-01',
          totalMinor: 100000,
          outstandingMinor: 100000,
          dueOn: '2026-09-01',
          status: 'issued',
        },
      ];

      const alerts = evaluateOverdueReceivables(ctx);
      expect(alerts).toHaveLength(0);
    });
  });

  describe('customer_concentration rule', () => {
    it('triggers when one customer exceeds concentrationThresholdPct (e.g. 66.7% > 40%)', () => {
      const ctx = createBaseContext();
      ctx.settings.concentrationThresholdPct = 40;
      ctx.invoices = [
        {
          id: 'inv-1',
          direction: 'AR',
          counterpartyExternalId: 'cust-apex',
          counterpartyName: 'Apex Distribution Ltd',
          totalMinor: 4000000,
          outstandingMinor: 4000000, // 40,000
          dueOn: '2026-11-01',
          status: 'issued',
        },
        {
          id: 'inv-2',
          direction: 'AR',
          counterpartyExternalId: 'cust-other',
          counterpartyName: 'Other Buyer',
          totalMinor: 2000000,
          outstandingMinor: 2000000, // 20,000 -> Total AR = 60,000 (Apex = 66.7%)
          dueOn: '2026-11-01',
          status: 'issued',
        },
      ];

      const alerts = evaluateCustomerConcentration(ctx);
      expect(alerts).toHaveLength(1);
      expect(alerts[0]!.ruleId).toBe('customer_concentration');
      expect(alerts[0]!.severity).toBe('medium');
      expect(alerts[0]!.fingerprint).toBe('customer_concentration:cust-apex');
      expect(alerts[0]!.summary).toContain('66.7%');
      expect(alerts[0]!.summary).toContain('40%');
    });

    it('boundary: does not trigger when concentration is exactly at threshold (40.0%)', () => {
      const ctx = createBaseContext();
      ctx.settings.concentrationThresholdPct = 40;
      ctx.invoices = [
        {
          id: 'inv-1',
          direction: 'AR',
          counterpartyExternalId: 'cust-exact',
          totalMinor: 400000,
          outstandingMinor: 400000, // 40% of 1,000,000
          dueOn: '2026-11-01',
          status: 'issued',
        },
        {
          id: 'inv-2',
          direction: 'AR',
          counterpartyExternalId: 'cust-rest',
          totalMinor: 600000,
          outstandingMinor: 600000, // 60%
          dueOn: '2026-11-01',
          status: 'issued',
        },
      ];

      const alerts = evaluateCustomerConcentration(ctx);
      expect(alerts.find((a) => a.fingerprint.includes('cust-exact'))).toBeUndefined();
    });

    it('zero AR: does not trigger when total outstanding AR is zero', () => {
      const ctx = createBaseContext();
      ctx.invoices = [
        {
          id: 'inv-paid',
          direction: 'AR',
          counterpartyExternalId: 'cust-apex',
          totalMinor: 4000000,
          outstandingMinor: 0,
          dueOn: '2026-11-01',
          status: 'paid',
        },
      ];

      const alerts = evaluateCustomerConcentration(ctx);
      expect(alerts).toHaveLength(0);
    });
  });

  describe('stale_data rule', () => {
    it('triggers info alert when last committed import is older than staleDataDays', () => {
      const ctx = createBaseContext();
      ctx.settings.staleDataDays = 14;
      ctx.asOfDate = '2026-10-20';
      ctx.lastCommittedImportAt = '2026-10-01T00:00:00Z'; // 19 days ago > 14 days

      const alert = evaluateStaleData(ctx);
      expect(alert).not.toBeNull();
      expect(alert?.ruleId).toBe('stale_data');
      expect(alert?.severity).toBe('info');
      expect(alert?.fingerprint).toBe('stale_data:imports');
      expect(alert?.summary).toContain('19 days ago');
    });

    it('boundary: does not trigger when elapsed days equals staleDataDays (14 days)', () => {
      const ctx = createBaseContext();
      ctx.settings.staleDataDays = 14;
      ctx.asOfDate = '2026-10-20';
      ctx.lastCommittedImportAt = '2026-10-06T00:00:00Z'; // exactly 14 days

      expect(evaluateStaleData(ctx)).toBeNull();
    });

    it('does not trigger when import is fresh', () => {
      const ctx = createBaseContext();
      ctx.settings.staleDataDays = 14;
      ctx.asOfDate = '2026-10-20';
      ctx.lastCommittedImportAt = '2026-10-18T00:00:00Z'; // 2 days ago

      expect(evaluateStaleData(ctx)).toBeNull();
    });

    it('does not trigger when lastCommittedImportAt is null', () => {
      const ctx = createBaseContext();
      ctx.lastCommittedImportAt = null;
      expect(evaluateStaleData(ctx)).toBeNull();
    });
  });

  describe('evaluateAlerts aggregator', () => {
    it('aggregates all applicable rules into a candidate alerts list', () => {
      const ctx = createBaseContext();
      ctx.forecastSummary = {
        firstNegativeDate: '2026-11-10',
        firstBelowFloorDate: '2026-10-29',
        liquidityGapMinor: 5000000,
        minCashMinor: -2000000,
        points: [],
      };
      ctx.invoices = [
        {
          id: 'inv-apex',
          invoiceNumber: 'INV-088',
          direction: 'AR',
          counterpartyExternalId: 'cust-apex',
          counterpartyName: 'Apex Distribution Ltd',
          totalMinor: 4000000,
          outstandingMinor: 4000000,
          dueOn: '2026-09-15', // Overdue
          status: 'issued',
        },
      ];
      ctx.lastCommittedImportAt = '2026-10-01T00:00:00Z'; // Stale

      const alerts = evaluateAlerts(ctx);
      const ruleIds = alerts.map((a) => a.ruleId);

      expect(ruleIds).toContain('negative_cash');
      expect(ruleIds).toContain('floor_breach');
      expect(ruleIds).toContain('overdue_receivable');
      expect(ruleIds).toContain('customer_concentration');
      expect(ruleIds).toContain('stale_data');
    });
  });
});
