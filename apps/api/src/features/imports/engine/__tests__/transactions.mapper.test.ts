import { describe, it, expect } from 'vitest';
import { mapTransactionRow } from '../transactions.mapper';
import { type NumberedRow } from '../types';

function makeRow(data: Record<string, string>, lineNumber = 2): NumberedRow {
  return { lineNumber, data };
}

describe('mapTransactionRow', () => {
  describe('valid rows', () => {
    it('maps a valid positive amount to minor units', () => {
      const result = mapTransactionRow(
        makeRow({
          externalid: 'TXN-001',
          date: '2026-10-01',
          accountid: 'OPERATING',
          amount: '50000.00',
          currency: 'CNY',
          category: 'customer_receipt',
          description: 'Payment from Customer A',
        }),
      );

      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.row.externalId).toBe('TXN-001');
      expect(result.row.bookedOn).toBe('2026-10-01');
      expect(result.row.accountCode).toBe('OPERATING');
      expect(result.row.amountMinor).toBe(5_000_000);
      expect(result.row.currency).toBe('CNY');
      expect(result.row.category).toBe('customer_receipt');
      expect(result.row.description).toBe('Payment from Customer A');
    });

    it('maps a negative amount correctly', () => {
      const result = mapTransactionRow(
        makeRow({
          externalid: 'TXN-002',
          date: '2026-10-02',
          accountid: 'OPERATING',
          amount: '-25000.00',
          currency: 'CNY',
          category: 'supplier_payment',
          description: 'Payment to Supplier B',
        }),
      );

      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.row.amountMinor).toBe(-2_500_000);
    });

    it('maps an amount with no decimal places', () => {
      const result = mapTransactionRow(
        makeRow({
          externalid: 'TXN-003',
          date: '2026-10-03',
          accountid: 'OPERATING',
          amount: '100',
          currency: 'CNY',
          category: 'overhead',
          description: '',
        }),
      );

      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.row.amountMinor).toBe(10_000);
    });

    it('maps all valid categories', () => {
      const categories = [
        'customer_receipt', 'supplier_payment', 'payroll', 'rent',
        'overhead', 'tax', 'loan_draw', 'loan_fee', 'loan_repayment',
        'other_income', 'other_expense',
      ];

      for (const category of categories) {
        const result = mapTransactionRow(
          makeRow({
            externalid: 'TXN-001',
            date: '2026-10-01',
            accountid: 'OPERATING',
            amount: '100.00',
            currency: 'CNY',
            category,
            description: '',
          }),
        );
        expect(result.ok).toBe(true);
      }
    });
  });

  describe('invalid rows', () => {
    it('rejects an empty external ID', () => {
      const result = mapTransactionRow(
        makeRow({
          externalid: '',
          date: '2026-10-01',
          accountid: 'OPERATING',
          amount: '100.00',
          currency: 'CNY',
          category: 'payroll',
          description: '',
        }),
      );

      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.errors).toContainEqual(
        expect.objectContaining({ field: 'externalId' }),
      );
    });

    it('rejects an invalid date', () => {
      const result = mapTransactionRow(
        makeRow({
          externalid: 'TXN-001',
          date: '2026-13-01',
          accountid: 'OPERATING',
          amount: '100.00',
          currency: 'CNY',
          category: 'payroll',
          description: '',
        }),
      );

      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.errors).toContainEqual(
        expect.objectContaining({ field: 'date' }),
      );
    });

    it('rejects a zero amount', () => {
      const result = mapTransactionRow(
        makeRow({
          externalid: 'TXN-001',
          date: '2026-10-01',
          accountid: 'OPERATING',
          amount: '0.00',
          currency: 'CNY',
          category: 'payroll',
          description: '',
        }),
      );

      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.errors).toContainEqual(
        expect.objectContaining({ field: 'amount' }),
      );
    });

    it('rejects non-CNY currency', () => {
      const result = mapTransactionRow(
        makeRow({
          externalid: 'TXN-001',
          date: '2026-10-01',
          accountid: 'OPERATING',
          amount: '100.00',
          currency: 'USD',
          category: 'payroll',
          description: '',
        }),
      );

      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.errors).toContainEqual(
        expect.objectContaining({ field: 'currency' }),
      );
    });

    it('rejects an invalid category', () => {
      const result = mapTransactionRow(
        makeRow({
          externalid: 'TXN-001',
          date: '2026-10-01',
          accountid: 'OPERATING',
          amount: '100.00',
          currency: 'CNY',
          category: 'bogus',
          description: '',
        }),
      );

      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.errors).toContainEqual(
        expect.objectContaining({ field: 'category' }),
      );
    });

    it('rejects a missing account ID', () => {
      const result = mapTransactionRow(
        makeRow({
          externalid: 'TXN-001',
          date: '2026-10-01',
          accountid: '',
          amount: '100.00',
          currency: 'CNY',
          category: 'payroll',
          description: '',
        }),
      );

      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.errors).toContainEqual(
        expect.objectContaining({ field: 'accountId' }),
      );
    });

    it('rejects a non-numeric amount', () => {
      const result = mapTransactionRow(
        makeRow({
          externalid: 'TXN-001',
          date: '2026-10-01',
          accountid: 'OPERATING',
          amount: 'abc',
          currency: 'CNY',
          category: 'payroll',
          description: '',
        }),
      );

      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.errors).toContainEqual(
        expect.objectContaining({ field: 'amount' }),
      );
    });

    it('collects multiple errors from a single row', () => {
      const result = mapTransactionRow(
        makeRow({
          externalid: '',
          date: 'not-a-date',
          accountid: '',
          amount: 'abc',
          currency: 'USD',
          category: 'bogus',
          description: '',
        }),
      );

      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.errors.length).toBeGreaterThanOrEqual(5);
    });
  });
});

