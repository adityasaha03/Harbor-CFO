export interface MetricFormula {
  title: string;
  formula: string;
  explanation: string;
  sourceDescription: string;
  sourceRoute?: string;
}

export type MetricFormulaKey = 'cash' | 'floorGap' | 'aging' | 'concentration';

export const METRIC_FORMULAS: Record<MetricFormulaKey, MetricFormula> = {
  cash: {
    title: 'Current Cash Balance',
    formula:
      'Cash = Starting Bank Balance + Sum(Committed Inflows) - Sum(Committed Outflows)',
    explanation:
      'Total reconciled cash available across all active accounts as of the forecast baseline date.',
    sourceDescription: 'Bank accounts and cleared ledger transactions',
    sourceRoute: '/forecast',
  },
  floorGap: {
    title: 'Liquidity Floor Gap',
    formula: 'Gap = Liquidity Floor - Min(Projected Cash within 91 Days)',
    explanation:
      'The minimum funding or acceleration amount needed to keep the closing balance above the policy floor at all times.',
    sourceDescription:
      'Company policy liquidity floor and deterministic daily flow projection',
    sourceRoute: '/forecast',
  },
  aging: {
    title: 'Invoice Aging Buckets',
    formula:
      'Days Past Due = Max(0, EvaluationDate - InvoiceDueDate)',
    explanation:
      'Outstanding invoice balances partitioned into 30-day buckets based on elapsed calendar days past due date.',
    sourceDescription: 'Unsettled accounts receivable and payable invoices',
    sourceRoute: '/forecast',
  },
  concentration: {
    title: 'Customer Concentration',
    formula:
      'Concentration % = (Top Counterparty Outstanding AR / Total Outstanding AR) × 100',
    explanation:
      'The share of all outstanding accounts receivable owed by the single largest customer. Flags alert when exceeding the 40% threshold.',
    sourceDescription: 'Open accounts receivable aggregated by counterparty',
    sourceRoute: '/forecast',
  },
};
