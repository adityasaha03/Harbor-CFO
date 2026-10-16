import type { FinancingOffer } from '@harbor/contracts';

/**
 * 6 synthetic financing offers defined for the HarborCFO financing catalog.
 * Amounts are stored as integer minor units (fen, 1 CNY = 100 fen).
 * All catalog records are marked synthetic: true with version: 1.
 */
export const SYNTHETIC_OFFERS_CATALOG: FinancingOffer[] = [
  {
    code: 'revolver-flex',
    version: 1,
    synthetic: true,
    type: 'revolving_credit',
    name: 'Revolver Flex',
    description: 'Short-term revolving credit facility with 1-day rapid drawdown.',
    currency: 'CNY',
    minAmountMinor: 500_000, // 5,000 CNY
    maxAmountMinor: 5_000_000, // 50,000 CNY
    dynamicCap: 'none',
    fundingDelayDays: 1,
    upfrontFeeBps: 200,
    flatInterestBps: 150,
    installments: {
      count: 1,
      firstDueAfterFundingDays: 30,
      intervalDays: 0,
    },
    eligiblePurposes: ['working_capital', 'bridge'],
    requiresInvoiceEvidence: false,
    requiredProfileFields: ['yearsInOperation'],
    minYearsInOperation: 1,
  },
  {
    code: 'bridge-term',
    version: 1,
    synthetic: true,
    type: 'bridge_loan',
    name: 'Bridge Term Loan',
    description: 'Medium-duration bridge financing for seasonal working capital gaps.',
    currency: 'CNY',
    minAmountMinor: 3_000_000, // 30,000 CNY
    maxAmountMinor: 10_000_000, // 100,000 CNY
    dynamicCap: 'none',
    fundingDelayDays: 2,
    upfrontFeeBps: 200,
    flatInterestBps: 300,
    installments: {
      count: 3,
      firstDueAfterFundingDays: 33,
      intervalDays: 14,
    },
    eligiblePurposes: ['working_capital', 'bridge'],
    requiresInvoiceEvidence: false,
    requiredProfileFields: [],
  },
  {
    code: 'invoice-advance',
    version: 1,
    synthetic: true,
    type: 'invoice_finance',
    name: 'Invoice Advance',
    description: 'Receivables-backed financing providing immediate liquidity against open invoices.',
    currency: 'CNY',
    minAmountMinor: 1_000_000, // 10,000 CNY
    maxAmountMinor: 20_000_000, // 200,000 CNY
    dynamicCap: 'ar_advance_80pct',
    fundingDelayDays: 3,
    upfrontFeeBps: 150,
    flatInterestBps: 200,
    installments: {
      count: 1,
      firstDueAfterFundingDays: 45,
      intervalDays: 0,
    },
    eligiblePurposes: ['working_capital'],
    requiresInvoiceEvidence: true,
    requiredProfileFields: [],
  },
  {
    code: 'equipment-lease',
    version: 1,
    synthetic: true,
    type: 'equipment_finance',
    name: 'Equipment Leaseback',
    description: 'Asset-backed financing tailored for capital equipment acquisitions and upgrades.',
    currency: 'CNY',
    minAmountMinor: 5_000_000, // 50,000 CNY
    maxAmountMinor: 50_000_000, // 500,000 CNY
    dynamicCap: 'none',
    fundingDelayDays: 5,
    upfrontFeeBps: 100,
    flatInterestBps: 400,
    installments: {
      count: 6,
      firstDueAfterFundingDays: 30,
      intervalDays: 30,
    },
    eligiblePurposes: ['equipment'],
    requiresInvoiceEvidence: false,
    requiredProfileFields: [],
  },
  {
    code: 'merchant-advance',
    version: 1,
    synthetic: true,
    type: 'merchant_advance',
    name: 'Merchant Cash Advance',
    description: 'Revenue-based advance repaid through projected electronic sales receipts.',
    currency: 'CNY',
    minAmountMinor: 500_000, // 5,000 CNY
    maxAmountMinor: 8_000_000, // 80,000 CNY
    dynamicCap: 'none',
    fundingDelayDays: 2,
    upfrontFeeBps: 300,
    flatInterestBps: 500,
    installments: {
      count: 4,
      firstDueAfterFundingDays: 14,
      intervalDays: 14,
    },
    eligiblePurposes: ['working_capital'],
    requiresInvoiceEvidence: false,
    requiredProfileFields: ['monthlyCardSalesMinor'],
  },
  {
    code: 'term-loan-slow',
    version: 1,
    synthetic: true,
    type: 'term_loan',
    name: 'Traditional Term Loan',
    description: 'Low-rate institutional term loan with extended underwriting timeline.',
    currency: 'CNY',
    minAmountMinor: 5_000_000, // 50,000 CNY
    maxAmountMinor: 30_000_000, // 300,000 CNY
    dynamicCap: 'none',
    fundingDelayDays: 30,
    upfrontFeeBps: 100,
    flatInterestBps: 250,
    installments: {
      count: 6,
      firstDueAfterFundingDays: 30,
      intervalDays: 30,
    },
    eligiblePurposes: ['working_capital'],
    requiresInvoiceEvidence: false,
    requiredProfileFields: [],
  },
];

export const SYNTHETIC_OFFERS = SYNTHETIC_OFFERS_CATALOG;
