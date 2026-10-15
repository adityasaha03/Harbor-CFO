/**
 * Engine-internal types for the forecast module.
 * Shared types live in @harbor/contracts/forecast.
 */

/** A single dated flow placed into a day bucket during forecast construction. */
export interface DatedFlow {
  readonly dayIndex: number;
  readonly date: string;
  readonly amountMinor: number;
  /** Whether this flow is a receipt (positive) or payment (negative) in the cash position. */
  readonly category: 'receipt' | 'payment' | 'financing' | 'fee' | 'repayment';
  readonly source: {
    readonly type: 'invoice' | 'commitment' | 'financing' | 'ledger';
    readonly id: string;
    readonly label: string;
    readonly amountMinor: number;
  };
}

