import { tenantsRepository } from '../../../tenants';
import { accountsRepository } from '../../../accounts';
import { invoicesRepository } from '../../../invoices';
import { commitmentsRepository } from '../../../commitments';

export async function seedAnchorTenant(tenantId: string): Promise<void> {
  // 1. Settings (as-of date 2026-10-20, floor 30,000 CNY = 3,000,000 fen)
  await tenantsRepository.upsertDefaults(tenantId);
  await tenantsRepository.update(tenantId, {
    forecastAsOfDate: '2026-10-20',
    minimumCashMinor: 3_000_000,
    profile: {
      yearsInOperation: 3,
      employeeCount: 15,
      industry: 'Wholesale Trade',
    },
  });

  // 2. Cash balance as of 2026-10-20: 80,000 CNY = 8,000,000 fen
  await accountsRepository.create(tenantId, {
    code: '1001',
    name: 'Primary Operating Account',
    openingBalanceMinor: 8_000_000,
    openingBalanceDate: '2026-10-20',
  });

  // 3. Outstanding and closed Invoices
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
    {
      externalId: 'INV-AR-PAID',
      direction: 'AR',
      counterpartyExternalId: 'CUST-PAID',
      totalMinor: 1_000_000,
      outstandingMinor: 0,
      dueOn: '2026-10-15',
      expectedSettlementOn: '2026-10-15',
      status: 'paid',
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
}
