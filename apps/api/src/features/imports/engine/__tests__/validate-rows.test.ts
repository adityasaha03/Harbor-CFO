import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { validateAndMapRows } from '../validate-rows';
import { type NormalizedTransactionRow, type NormalizedInvoiceRow } from '@harbor/contracts';

const FIXTURES_DIR = join(__dirname, 'fixtures');

describe('validateAndMapRows', () => {
  describe('transactions', () => {
    it('successfully processes clean transactions fixture', () => {
      const buffer = readFileSync(join(FIXTURES_DIR, 'transactions-clean.csv'));
      const result = validateAndMapRows(buffer, 'transactions');

      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.rowCount).toBe(8);
      expect(result.rows).toHaveLength(8);
      expect(result.warnings).toHaveLength(0);

      const first = result.rows[0] as NormalizedTransactionRow;
      expect(first.externalId).toBe('TXN-001');
      expect(first.amountMinor).toBe(5_000_000);
      expect(first.currency).toBe('CNY');
    });

    it('returns structured errors for bad transactions fixture', () => {
      const buffer = readFileSync(join(FIXTURES_DIR, 'transactions-bad.csv'));
      const result = validateAndMapRows(buffer, 'transactions');

      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.truncated).toBe(false);
    });

    it('atomic rejection: one bad row among 100 valid rows returns errors only, zero rows', () => {
      const header = 'externalId,date,accountId,amount,currency,category,description\n';
      const rows: string[] = [];
      for (let i = 1; i <= 100; i++) {
        if (i === 42) {
          // Bad row: invalid currency and zero amount
          rows.push(`TXN-${i},2026-10-01,OPERATING,0.00,USD,customer_receipt,bad row`);
        } else {
          rows.push(`TXN-${i},2026-10-01,OPERATING,100.00,CNY,customer_receipt,good row`);
        }
      }
      const buffer = Buffer.from(header + rows.join('\n'), 'utf-8');
      const result = validateAndMapRows(buffer, 'transactions');

      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors.some((e) => e.row === 43)).toBe(true); // row 42 + 1 (header is 1)
      expect((result as unknown as { rows?: unknown[] }).rows).toBeUndefined();
    });

    it('collapses identical duplicates with a warning', () => {
      const csv = [
        'externalId,date,accountId,amount,currency,category,description',
        'TXN-001,2026-10-01,OPERATING,100.00,CNY,payroll,Test',
        'TXN-001,2026-10-01,OPERATING,100.00,CNY,payroll,Test',
      ].join('\n');
      const buffer = Buffer.from(csv, 'utf-8');
      const result = validateAndMapRows(buffer, 'transactions');

      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.rowCount).toBe(1);
      expect(result.rows).toHaveLength(1);
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0]!.message).toContain('collapsed');
    });

    it('rejects conflicting duplicates with same ID but different content', () => {
      const csv = [
        'externalId,date,accountId,amount,currency,category,description',
        'TXN-001,2026-10-01,OPERATING,100.00,CNY,payroll,Original',
        'TXN-001,2026-10-01,OPERATING,200.00,CNY,payroll,Modified',
      ].join('\n');
      const buffer = Buffer.from(csv, 'utf-8');
      const result = validateAndMapRows(buffer, 'transactions');

      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          field: 'externalId',
          message: expect.stringContaining('Duplicate ID "TXN-001" with different content'),
        }),
      );
    });

    it('caps errors at 200 and marks truncated: true', () => {
      const header = 'externalId,date,accountId,amount,currency,category,description\n';
      const rows: string[] = [];
      for (let i = 1; i <= 250; i++) {
        rows.push(`TXN-${i},invalid-date,OPERATING,100.00,CNY,payroll,Test`);
      }
      const buffer = Buffer.from(header + rows.join('\n'), 'utf-8');
      const result = validateAndMapRows(buffer, 'transactions');

      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.errors).toHaveLength(200);
      expect(result.truncated).toBe(true);
    });
  });

  describe('invoices', () => {
    it('successfully processes clean invoices fixture', () => {
      const buffer = readFileSync(join(FIXTURES_DIR, 'invoices-clean.csv'));
      const result = validateAndMapRows(buffer, 'invoices');

      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.rowCount).toBe(5);
      expect(result.rows).toHaveLength(5);
      expect(result.warnings).toHaveLength(0);

      const first = result.rows[0] as NormalizedInvoiceRow;
      expect(first.externalId).toBe('INV-001');
      expect(first.totalMinor).toBe(4_000_000);
      expect(first.outstandingMinor).toBe(4_000_000);
    });

    it('returns errors for bad invoices fixture', () => {
      const buffer = readFileSync(join(FIXTURES_DIR, 'invoices-bad.csv'));
      const result = validateAndMapRows(buffer, 'invoices');

      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('returns structured row-1 header error on column mismatch without throwing', () => {
      const wrongCsv = 'wrongColA,wrongColB\n1,2';
      const result = validateAndMapRows(Buffer.from(wrongCsv, 'utf-8'), 'invoices');

      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toMatchObject({
        row: 1,
        field: 'header',
      });
      expect(result.errors[0]?.message).toContain('Missing required columns');
    });

    it('returns structured row-1 header error on empty file without throwing', () => {
      const result = validateAndMapRows(Buffer.alloc(0), 'transactions');

      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.errors[0]).toMatchObject({
        row: 1,
        field: 'header',
        message: 'File is empty',
      });
    });

    it('successfully validates transactions CSV with MM/DD/YYYY dates', () => {
      const csv = [
        'externalId,date,accountId,amount,currency,category,description',
        'CD-2001,10/18/2026,OPERATING,45000,CNY,customer_receipt,Initial deposit',
        'CD-2002,10/19/2026,OPERATING,-18500,CNY,supplier_payment,Material procurement',
      ].join('\n');
      const result = validateAndMapRows(Buffer.from(csv, 'utf-8'), 'transactions');

      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.rowCount).toBe(2);
      expect((result.rows[0] as NormalizedTransactionRow).bookedOn).toBe('2026-10-18');
      expect((result.rows[1] as NormalizedTransactionRow).bookedOn).toBe('2026-10-19');
    });
  });
});

