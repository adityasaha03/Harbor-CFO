export const ALERT_RULES = {
  NEGATIVE_CASH: 'negative_cash',
  FLOOR_BREACH: 'floor_breach',
  OVERDUE_RECEIVABLE: 'overdue_receivable',
  CUSTOMER_CONCENTRATION: 'customer_concentration',
  REPAYMENT_PRESSURE: 'repayment_pressure',
  STALE_DATA: 'stale_data',
} as const;

export const ALERT_FINGERPRINTS = {
  NEGATIVE_CASH_HORIZON: 'negative_cash:horizon',
  FLOOR_BREACH_HORIZON: 'floor_breach:horizon',
  STALE_DATA_IMPORTS: 'stale_data:imports',
  overdueReceivable: (counterpartyExternalId: string): string =>
    `overdue_receivable:${counterpartyExternalId}`,
  customerConcentration: (counterpartyExternalId: string): string =>
    `customer_concentration:${counterpartyExternalId}`,
  repaymentPressure: (refId: string): string =>
    `repayment_pressure:${refId}`,
} as const;
