import { type ForecastInput } from '@harbor/contracts';

/**
 * Demo anchor fixture ("Harbor Wholesale", synthetic, CNY stored as fen).
 * Hand-verified values from docs/PRODUCT_BRIEF.md and docs/plan/backend/B08-forecast-engine.md.
 */
export const HARBOR_ANCHOR_INPUT: ForecastInput = {
  asOfDate: '2026-10-20',
  openingCashMinor: 8_000_000, // 80,000 CNY
  floorMinor: 3_000_000, // 30,000 CNY
  horizonDays: 91,
  invoices: [
    {
      externalId: 'INV-AR-101',
      direction: 'AR',
      outstandingMinor: 2_000_000, // 20,000 CNY
      dueOn: '2026-10-30',
      expectedSettlementOn: '2026-11-01', // day 12
      counterpartyExternalId: 'CUST-001',
    },
    {
      externalId: 'INV-AR-LATE',
      direction: 'AR',
      outstandingMinor: 4_000_000, // 40,000 CNY
      dueOn: '2026-09-25', // overdue
      expectedSettlementOn: '2026-11-13', // day 24
      counterpartyExternalId: 'CUST-LATE',
    },
    {
      externalId: 'INV-AP-201',
      direction: 'AP',
      outstandingMinor: 5_500_000, // 55,000 CNY
      dueOn: '2026-10-29',
      expectedSettlementOn: '2026-10-29', // day 9
      counterpartyExternalId: 'SUPP-001',
    },
  ],
  commitments: [
    {
      id: 'COMM-RENT',
      label: 'Office rent',
      direction: 'outflow',
      amountMinor: 1_200_000, // 12,000 CNY
      frequency: 'monthly',
      anchorOn: '2026-10-25', // day 5
    },
    {
      id: 'COMM-PAYROLL',
      label: 'Staff payroll',
      direction: 'outflow',
      amountMinor: 4_500_000, // 45,000 CNY
      frequency: 'monthly',
      anchorOn: '2026-11-03', // day 14
    },
    {
      id: 'COMM-OVERHEAD',
      label: 'Quarterly overhead',
      direction: 'outflow',
      amountMinor: 800_000, // 8,000 CNY
      frequency: 'once',
      anchorOn: '2026-11-07', // day 18
    },
    {
      id: 'COMM-RETAIL-RECEIPTS',
      label: 'Recurring retail receipts',
      direction: 'inflow',
      amountMinor: 1_000_000, // 10,000 CNY
      frequency: 'weekly',
      anchorOn: '2026-11-11', // day 22
    },
  ],
  financing: [],
  scheduledLedger: [],
};

