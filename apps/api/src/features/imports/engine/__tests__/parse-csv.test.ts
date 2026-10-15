import { describe, it, expect } from 'vitest';
import { parseCsv } from '../parse-csv';
import { TRANSACTION_CSV_HEADERS, INVOICE_CSV_HEADERS } from '@harbor/contracts';

function toBuffer(content: string): Buffer {
  return Buffer.from(content, 'utf-8');
}

describe('parseCsv', () => {
  describe('valid input', () => {
    it('parses a valid CSV with correct headers', () => {
      const csv = [
        'externalId,date,accountId,amount,currency,category,description',
        'TXN-001,2026-10-01,OPERATING,100.00,CNY,payroll,Test',
      ].join('\n');

      const rows = parseCsv(toBuffer(csv), TRANSACTION_CSV_HEADERS);
      expect(rows).toHaveLength(1);
      expect(rows[0]!.lineNumber).toBe(2);
      expect(rows[0]!.data['externalid']).toBe('TXN-001');
      expect(rows[0]!.data['amount']).toBe('100.00');
    });

    it('handles case-insensitive headers', () => {
      const csv = [
        'ExternalId,Date,AccountId,Amount,Currency,Category,Description',
        'TXN-001,2026-10-01,OPERATING,100.00,CNY,payroll,Test',
      ].join('\n');

      const rows = parseCsv(toBuffer(csv), TRANSACTION_CSV_HEADERS);
      expect(rows).toHaveLength(1);
      expect(rows[0]!.data['externalid']).toBe('TXN-001');
    });

    it('strips UTF-8 BOM and parses normally', () => {
      const bom = Buffer.from([0xef, 0xbb, 0xbf]);
      const csv = 'externalId,date,accountId,amount,currency,category,description\nTXN-001,2026-10-01,OPERATING,100.00,CNY,payroll,Test';
      const buffer = Buffer.concat([bom, Buffer.from(csv, 'utf-8')]);

      const rows = parseCsv(buffer, TRANSACTION_CSV_HEADERS);
      expect(rows).toHaveLength(1);
    });
  });

  describe('limit violations', () => {
    it('rejects an empty file', () => {
      expect(() => parseCsv(Buffer.alloc(0), TRANSACTION_CSV_HEADERS)).toThrow('File is empty');
    });

    it('rejects a BOM-only file', () => {
      const bom = Buffer.from([0xef, 0xbb, 0xbf]);
      expect(() => parseCsv(bom, TRANSACTION_CSV_HEADERS)).toThrow('BOM and no data');
    });

    it('rejects an oversize file', () => {
      const oversize = Buffer.alloc(5 * 1024 * 1024 + 1, 'a');
      expect(() => parseCsv(oversize, TRANSACTION_CSV_HEADERS)).toThrow('exceeds maximum size');
    });

    it('rejects a file with too many rows', () => {
      const header = 'externalId,date,accountId,amount,currency,category,description';
      const row = 'TXN-001,2026-10-01,OPERATING,100.00,CNY,payroll,Test';
      const lines = [header];
      for (let i = 0; i < 10001; i++) {
        lines.push(row.replace('TXN-001', `TXN-${i}`));
      }
      const csv = lines.join('\n');

      expect(() => parseCsv(toBuffer(csv), TRANSACTION_CSV_HEADERS)).toThrow('exceeds maximum');
    });

    it('rejects a file with a cell exceeding max length', () => {
      const longDesc = 'x'.repeat(2001);
      const csv = [
        'externalId,date,accountId,amount,currency,category,description',
        `TXN-001,2026-10-01,OPERATING,100.00,CNY,payroll,${longDesc}`,
      ].join('\n');

      expect(() => parseCsv(toBuffer(csv), TRANSACTION_CSV_HEADERS)).toThrow('exceeds maximum length');
    });
  });

  describe('invalid UTF-8', () => {
    it('rejects invalid UTF-8 bytes', () => {
      const header = Buffer.from('externalId,date,accountId,amount,currency,category,description\n');
      const invalid = Buffer.from([0x80, 0x81, 0x82]);
      const buffer = Buffer.concat([header, invalid]);

      expect(() => parseCsv(buffer, TRANSACTION_CSV_HEADERS)).toThrow('not valid UTF-8');
    });
  });

  describe('header validation', () => {
    it('rejects unknown columns', () => {
      const csv = [
        'externalId,date,accountId,amount,currency,category,description,extraCol',
        'TXN-001,2026-10-01,OPERATING,100.00,CNY,payroll,Test,extra',
      ].join('\n');

      expect(() => parseCsv(toBuffer(csv), TRANSACTION_CSV_HEADERS)).toThrow('Unknown columns: extracol');
    });

    it('rejects missing required columns', () => {
      const csv = [
        'externalId,date',
        'TXN-001,2026-10-01',
      ].join('\n');

      expect(() => parseCsv(toBuffer(csv), TRANSACTION_CSV_HEADERS)).toThrow('Missing required columns');
    });

    it('rejects a header-only file (no data rows)', () => {
      const csv = 'externalId,date,accountId,amount,currency,category,description\n';

      expect(() => parseCsv(toBuffer(csv), TRANSACTION_CSV_HEADERS)).toThrow('no data rows');
    });
  });

  describe('invoice headers', () => {
    it('parses a valid invoice CSV', () => {
      const csv = [
        'invoiceId,direction,counterpartyId,total,outstanding,currency,dueDate,expectedSettlementDate,status',
        'INV-001,AR,CUST-A,40000.00,40000.00,CNY,2026-11-10,2026-11-13,open',
      ].join('\n');

      const rows = parseCsv(toBuffer(csv), INVOICE_CSV_HEADERS);
      expect(rows).toHaveLength(1);
      expect(rows[0]!.data['invoiceid']).toBe('INV-001');
      expect(rows[0]!.data['direction']).toBe('AR');
    });
  });
});

