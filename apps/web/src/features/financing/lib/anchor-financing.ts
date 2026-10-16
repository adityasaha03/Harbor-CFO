import type {
  FinancingOffer,
  FinancingMatchResponse,
} from '@harbor/contracts';

export const ANCHOR_OFFERS_CATALOG: FinancingOffer[] = [
  {
    code: 'revolver-flex',
    version: 1,
    synthetic: true,
    type: 'revolving_credit',
    name: 'Revolver Flex',
    description: 'Short-term revolving credit facility with 1-day rapid drawdown.',
    currency: 'CNY',
    minAmountMinor: 500_000,
    maxAmountMinor: 5_000_000,
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
    minAmountMinor: 3_000_000,
    maxAmountMinor: 10_000_000,
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
    name: 'Invoice Advance Facility',
    description: 'Advance liquidity secured against verified outstanding accounts receivable.',
    currency: 'CNY',
    minAmountMinor: 1_000_000,
    maxAmountMinor: 20_000_000,
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
    name: 'Equipment Financing Lease',
    description: 'Asset-backed leasing line for machinery, logistics fleets, and warehouse hardware.',
    currency: 'CNY',
    minAmountMinor: 5_000_000,
    maxAmountMinor: 50_000_000,
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
    name: 'Merchant Card Advance',
    description: 'Revenue-contingent advance underwritten against monthly card settlement velocity.',
    currency: 'CNY',
    minAmountMinor: 500_000,
    maxAmountMinor: 8_000_000,
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
    name: 'Traditional Commercial Term Loan',
    description: 'Low-rate institutional term loan with extended 30-day underwriting timeline.',
    currency: 'CNY',
    minAmountMinor: 5_000_000,
    maxAmountMinor: 30_000_000,
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

export const ANCHOR_FINANCING_MATCH: FinancingMatchResponse = {
  requiredGapMinor: 5_000_000, // 50,000.00 CNY
  breachDate: '2026-10-29',
  eligible: [
    {
      offer: ANCHOR_OFFERS_CATALOG[1]!, // bridge-term
      suggestedPrincipalMinor: 6_000_000, // 60,000.00 CNY
      schedule: {
        principalMinor: 6_000_000,
        fundingOn: '2026-10-22',
        upfrontFeeMinor: 120_000,
        interestMinor: 180_000,
        totalRepaymentMinor: 6_180_000,
        netProceedsMinor: 5_880_000,
        totalCostMinor: 300_000, // 3,000.00 CNY
        installments: [
          { installmentIndex: 1, dueOn: '2026-11-24', amountMinor: 2_060_000 },
          { installmentIndex: 2, dueOn: '2026-12-08', amountMinor: 2_060_000 },
          { installmentIndex: 3, dueOn: '2026-12-22', amountMinor: 2_060_000 },
        ],
      },
      impact: {
        minCashMinor: 1_000_000,
        firstBelowFloorDate: '2026-12-08',
        firstNegativeDate: null,
        anyNegativeCash: false,
        cashAtDay21Minor: 3_880_000,
        cashAtBreachDateMinor: 4_000_000,
      },
      score: 0.9700,
      scoringBreakdown: {
        gapCoverage: 1.0,
        timeliness: 1.0,
        repaymentResilience: 0.88,
        costEfficiency: 1.0,
        totalScore: 0.9700,
      },
      warnings: [],
    },
    {
      offer: ANCHOR_OFFERS_CATALOG[2]!, // invoice-advance
      suggestedPrincipalMinor: 4_800_000, // capped at 80% AR
      schedule: {
        principalMinor: 4_800_000,
        fundingOn: '2026-10-23',
        upfrontFeeMinor: 72_000,
        interestMinor: 96_000,
        totalRepaymentMinor: 4_896_000,
        netProceedsMinor: 4_728_000,
        totalCostMinor: 168_000,
        installments: [
          { installmentIndex: 1, dueOn: '2026-12-07', amountMinor: 4_896_000 },
        ],
      },
      impact: {
        minCashMinor: -272_000,
        firstBelowFloorDate: '2026-10-29',
        firstNegativeDate: '2026-11-03',
        anyNegativeCash: true,
        cashAtDay21Minor: 2_728_000,
        cashAtBreachDateMinor: 2_800_000,
      },
      score: 0.8850,
      scoringBreakdown: {
        gapCoverage: 0.9456,
        timeliness: 0.8571,
        repaymentResilience: 0.80,
        costEfficiency: 0.95,
        totalScore: 0.8850,
      },
      warnings: ['Projected closing balance dips below zero during loan term.'],
    },
    {
      offer: ANCHOR_OFFERS_CATALOG[0]!, // revolver-flex
      suggestedPrincipalMinor: 5_000_000, // capped at 50,000.00 CNY
      schedule: {
        principalMinor: 5_000_000,
        fundingOn: '2026-10-21',
        upfrontFeeMinor: 100_000,
        interestMinor: 75_000,
        totalRepaymentMinor: 5_075_000,
        netProceedsMinor: 4_900_000,
        totalCostMinor: 175_000,
        installments: [
          { installmentIndex: 1, dueOn: '2026-11-20', amountMinor: 5_075_000 },
        ],
      },
      impact: {
        minCashMinor: -100_000,
        firstBelowFloorDate: '2026-10-29',
        firstNegativeDate: '2026-11-03',
        anyNegativeCash: true,
        cashAtDay21Minor: 2_900_000,
        cashAtBreachDateMinor: 3_000_000,
      },
      score: 0.8750,
      scoringBreakdown: {
        gapCoverage: 0.98,
        timeliness: 1.0,
        repaymentResilience: 0.75,
        costEfficiency: 0.92,
        totalScore: 0.8750,
      },
      warnings: [
        'Projected closing balance dips below zero during loan term.',
        'Net proceeds cover 98.0% of required liquidity gap.',
      ],
    },
  ],
  excluded: [
    {
      offer: ANCHOR_OFFERS_CATALOG[5]!, // term-loan-slow
      reasons: [
        {
          code: 'FUNDS_TOO_LATE',
          explanation:
            'Funds arrive after cash first falls below the floor (disbursement delay is 30 days, breach is 9 days away).',
        },
      ],
    },
    {
      offer: ANCHOR_OFFERS_CATALOG[3]!, // equipment-lease
      reasons: [
        {
          code: 'PURPOSE_NOT_SUPPORTED',
          explanation:
            'Offer supports [equipment] but requested purpose is working_capital.',
        },
      ],
    },
  ],
  cannotAssess: [
    {
      offer: ANCHOR_OFFERS_CATALOG[4]!, // merchant-advance
      missing: ['monthlyCardSalesMinor'],
    },
  ],
};
