import { describe, it, expect } from 'vitest';
import { mapInvoiceRow } from '../invoices.mapper';
import { type NumberedRow } from '../types';

function makeRow(data: Record<string, string>, lineNumber = 2): NumberedRow {
  return { lineNumber, data };
}

describe('mapInvoiceRow', () => {
  describe('valid rows', () => {
    it('maps a valid AR open invoice with exact minor units', () => {
      const result = mapInvoiceRow(
        makeRow({
          invoiceid: 'INV-101',
          direction: 'AR',
          counterpartyid: 'CUST-001',
          total: '40000.00',
          outstanding: '40000.00',
          currency: 'CNY',
          duedate: '2026-11-10',
          expectedsettlementdate: '2026-11-13',
          status: 'open',
        }),
      );

      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.row).toEqual({
        externalId: 'INV-101',
        direction: 'AR',
        counterpartyExternalId: 'CUST-001',
        totalMinor: 4_000_000,
        outstandingMinor: 4_000_000,
        currency: 'CNY',
        dueOn: '2026-11-10',
        expectedSettlementOn: '2026-11-13',
        status: 'open',
      });
    });

    it('maps an AP partially paid invoice', () => {
      const result = mapInvoiceRow(
        makeRow({
          invoiceid: 'INV-102',
          direction: 'AP',
          counterpartyid: 'VEND-001',
          total: '55000.50',
          outstanding: '25000.50',
          currency: 'CNY',
          duedate: '2026-10-28',
          expectedsettlementdate: '2026-10-28',
          status: 'partially_paid',
        }),
      );

      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.row.direction).toBe('AP');
      expect(result.row.totalMinor).toBe(5_500_050);
      expect(result.row.outstandingMinor).toBe(2_500_050);
      expect(result.row.status).toBe('partially_paid');
    });

    it('maps a paid invoice with 0.00 outstanding', () => {
      const result = mapInvoiceRow(
        makeRow({
          invoiceid: 'INV-103',
          direction: 'AR',
          counterpartyid: 'CUST-002',
          total: '1000.00',
          outstanding: '0.00',
          currency: 'CNY',
          duedate: '2026-10-01',
          expectedsettlementdate: '2026-10-05',
          status: 'paid',
        }),
      );

      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.row.outstandingMinor).toBe(0);
      expect(result.row.status).toBe('paid');
    });
  });

  describe('invalid rows', () => {
    it('rejects invalid invoice ID format', () => {
      const result = mapInvoiceRow(
        makeRow({
          invoiceid: 'INVALID ID WITH SPACES',
          direction: 'AR',
          counterpartyid: 'CUST-001',
          total: '100.00',
          outstanding: '100.00',
          currency: 'CNY',
          duedate: '2026-11-10',
          expectedsettlementdate: '2026-11-13',
          status: 'open',
        }),
      );

      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.errors).toContainEqual(
        expect.objectContaining({ field: 'invoiceId' }),
      );
    });

    it('rejects invalid direction', () => {
      const result = mapInvoiceRow(
        makeRow({
          invoiceid: 'INV-101',
          direction: 'INFLOW',
          counterpartyid: 'CUST-001',
          total: '100.00',
          outstanding: '100.00',
          currency: 'CNY',
          duedate: '2026-11-10',
          expectedsettlementdate: '2026-11-13',
          status: 'open',
        }),
      );

      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.errors).toContainEqual(
        expect.objectContaining({ field: 'direction' }),
      );
    });

    it('rejects invalid counterparty ID', () => {
      const result = mapInvoiceRow(
        makeRow({
          invoiceid: 'INV-101',
          direction: 'AR',
          counterpartyid: '',
          total: '100.00',
          outstanding: '100.00',
          currency: 'CNY',
          duedate: '2026-11-10',
          expectedsettlementdate: '2026-11-13',
          status: 'open',
        }),
      );

      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.errors).toContainEqual(
        expect.objectContaining({ field: 'counterpartyId' }),
      );
    });

    it('rejects non-positive total', () => {
      const result = mapInvoiceRow(
        makeRow({
          invoiceid: 'INV-101',
          direction: 'AR',
          counterpartyid: 'CUST-001',
          total: '0.00',
          outstanding: '0.00',
          currency: 'CNY',
          duedate: '2026-11-10',
          expectedsettlementdate: '2026-11-13',
          status: 'open',
        }),
      );

      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.errors).toContainEqual(
        expect.objectContaining({ field: 'total' }),
      );
    });

    it('rejects negative outstanding', () => {
      const result = mapInvoiceRow(
        makeRow({
          invoiceid: 'INV-101',
          direction: 'AR',
          counterpartyid: 'CUST-001',
          total: '100.00',
          outstanding: '-10.00',
          currency: 'CNY',
          duedate: '2026-11-10',
          expectedsettlementdate: '2026-11-13',
          status: 'open',
        }),
      );

      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.errors).toContainEqual(
        expect.objectContaining({ field: 'outstanding' }),
      );
    });

    it('rejects non-CNY currency', () => {
      const result = mapInvoiceRow(
        makeRow({
          invoiceid: 'INV-101',
          direction: 'AR',
          counterpartyid: 'CUST-001',
          total: '100.00',
          outstanding: '100.00',
          currency: 'USD',
          duedate: '2026-11-10',
          expectedsettlementdate: '2026-11-13',
          status: 'open',
        }),
      );

      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.errors).toContainEqual(
        expect.objectContaining({ field: 'currency' }),
      );
    });

    it('rejects invalid due date and expected settlement date', () => {
      const result = mapInvoiceRow(
        makeRow({
          invoiceid: 'INV-101',
          direction: 'AR',
          counterpartyid: 'CUST-001',
          total: '100.00',
          outstanding: '100.00',
          currency: 'CNY',
          duedate: '2026-02-31',
          expectedsettlementdate: 'not-a-date',
          status: 'open',
        }),
      );

      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.errors).toContainEqual(
        expect.objectContaining({ field: 'dueDate' }),
      );
      expect(result.errors).toContainEqual(
        expect.objectContaining({ field: 'expectedSettlementDate' }),
      );
    });

    it('rejects unknown status', () => {
      const result = mapInvoiceRow(
        makeRow({
          invoiceid: 'INV-101',
          direction: 'AR',
          counterpartyid: 'CUST-001',
          total: '100.00',
          outstanding: '100.00',
          currency: 'CNY',
          duedate: '2026-11-10',
          expectedsettlementdate: '2026-11-13',
          status: 'archived',
        }),
      );

      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.errors).toContainEqual(
        expect.objectContaining({ field: 'status' }),
      );
    });

    it('cross-field: rejects outstanding > total', () => {
      const result = mapInvoiceRow(
        makeRow({
          invoiceid: 'INV-101',
          direction: 'AR',
          counterpartyid: 'CUST-001',
          total: '1000.00',
          outstanding: '1200.00',
          currency: 'CNY',
          duedate: '2026-11-10',
          expectedsettlementdate: '2026-11-13',
          status: 'open',
        }),
      );

      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          field: 'outstanding',
          message: 'Outstanding must not exceed total',
        }),
      );
    });

    it('cross-field: rejects paid status when outstanding is non-zero', () => {
      const result = mapInvoiceRow(
        makeRow({
          invoiceid: 'INV-101',
          direction: 'AR',
          counterpartyid: 'CUST-001',
          total: '1000.00',
          outstanding: '100.00',
          currency: 'CNY',
          duedate: '2026-11-10',
          expectedsettlementdate: '2026-11-13',
          status: 'paid',
        }),
      );

      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          field: 'outstanding',
          message: 'Outstanding must be 0 when status is paid',
        }),
      );
    });
  });
});

