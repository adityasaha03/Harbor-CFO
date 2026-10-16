import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { useTestDb } from '../../../core/db/test/mongo-test-harness';
import { tenantsRepository } from '../../tenants';
import { accountsRepository } from '../../accounts';
import { invoicesRepository } from '../../invoices';
import { commitmentsRepository } from '../../commitments';
import { ledgerRepository } from '../../ledger';
import { loadForecastInput } from '../forecast.inputs';
import {
  registerForecastContributor,
  clearForecastContributors,
} from '../forecast.sources';

describe('loadForecastInput Loader', () => {
  useTestDb();

  const tenantId = 'tenant_inputs_test';

  beforeEach(async () => {
    clearForecastContributors();

    // 1. Tenant settings
    await tenantsRepository.upsertDefaults(tenantId);
    await tenantsRepository.update(tenantId, {
      forecastAsOfDate: '2026-10-20',
      minimumCashMinor: 3_000_000,
    });

    // 2. Opening cash balance via accounts
    await accountsRepository.create(tenantId, {
      code: '1001',
      name: 'Main Operating Bank',
      openingBalanceMinor: 8_000_000,
      openingBalanceDate: '2026-10-20',
    });

    // 3. Invoices
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

  afterEach(() => {
    clearForecastContributors();
  });

  it('aggregates live tenant settings, opening cash, invoices, and commitments', async () => {
    const { input, datasetVersion } = await loadForecastInput(tenantId);

    expect(datasetVersion).toBeGreaterThanOrEqual(1);
    expect(input.asOfDate).toBe('2026-10-20');
    expect(input.floorMinor).toBe(3_000_000);
    expect(input.openingCashMinor).toBe(8_000_000);
    expect(input.horizonDays).toBe(91);

    // Verify invoices
    expect(input.invoices).toHaveLength(3);
    const lateInv = input.invoices.find((i) => i.externalId === 'INV-AR-LATE');
    expect(lateInv).toBeDefined();
    expect(lateInv!.outstandingMinor).toBe(4_000_000);
    expect(lateInv!.expectedSettlementOn).toBe('2026-11-13');

    // Verify commitments
    expect(input.commitments).toHaveLength(4);
    const rent = input.commitments.find((c) => c.label === 'Office rent');
    expect(rent).toBeDefined();
    expect(rent!.amountMinor).toBe(1_200_000);
    expect(rent!.anchorOn).toBe('2026-10-25');
  });

  it('loads future-dated ledger flows booked after asOfDate', async () => {
    await ledgerRepository.bulkUpsert(tenantId, [
      {
        externalId: 'LEDGER-FUTURE-1',
        accountCode: '1001',
        bookedOn: '2026-11-05',
        amountMinor: 350_000,
        currency: 'CNY',
        category: 'other_income',
        description: 'Scheduled tax refund',
      },
    ]);

    const { input } = await loadForecastInput(tenantId);
    expect(input.scheduledLedger).toHaveLength(1);
    expect(input.scheduledLedger[0]!.amountMinor).toBe(350_000);
    expect(input.scheduledLedger[0]!.on).toBe('2026-11-05');
    expect(input.scheduledLedger[0]!.label).toBe('Scheduled tax refund');
  });

  it('incorporates contributed financing obligations from registered extension point', async () => {
    const unsubscribe = registerForecastContributor(async (tid, asOf) => {
      if (tid !== tenantId) return [];
      return [
        {
          id: 'FIN-EXTENSION-01',
          label: 'Contributor bridge loan',
          flows: [
            { on: asOf, amountMinor: 2_000_000, kind: 'draw' },
            { on: '2026-11-20', amountMinor: 2_050_000, kind: 'repayment' },
          ],
        },
      ];
    });

    const { input } = await loadForecastInput(tenantId);
    expect(input.financing).toHaveLength(1);
    expect(input.financing[0]!.id).toBe('FIN-EXTENSION-01');
    expect(input.financing[0]!.flows).toHaveLength(2);

    unsubscribe();
    const { input: inputAfterUnsub } = await loadForecastInput(tenantId);
    expect(inputAfterUnsub.financing).toHaveLength(0);
  });
});
