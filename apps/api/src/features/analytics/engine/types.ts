import type {
  InvoiceDirection,
  InvoiceStatus,
  LedgerCategory,
} from '@harbor/contracts';

export interface AnalyticsInvoiceItem {
  externalId: string;
  direction: InvoiceDirection;
  counterpartyExternalId: string;
  counterpartyName?: string;
  totalMinor: number;
  outstandingMinor: number;
  dueOn: string; // YYYY-MM-DD
  status: InvoiceStatus;
}

export interface AnalyticsLedgerItem {
  externalId: string;
  bookedOn: string; // YYYY-MM-DD
  amountMinor: number;
  category: LedgerCategory;
  invoiceExternalId?: string;
}
