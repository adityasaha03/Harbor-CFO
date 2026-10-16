'use client';

import * as React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { formatMinor } from '@harbor/contracts';
import type { MoveReceiptChange, InvoiceDto } from '@harbor/contracts';
import { useInvoices } from '../api/use-invoices';

interface MoveReceiptFormProps {
  onAdd: (change: MoveReceiptChange) => void;
  onCancel: () => void;
}

export function MoveReceiptForm({ onAdd, onCancel }: MoveReceiptFormProps) {
  const { data: invoices = [], isLoading } = useInvoices({
    direction: 'AR',
    status: 'open',
  });

  const [selectedInvoiceId, setSelectedInvoiceId] = React.useState('');
  const [newDate, setNewDate] = React.useState('');
  const [error, setError] = React.useState('');

  const selectedInvoice = invoices.find(
    (inv: InvoiceDto) => inv.externalId === selectedInvoiceId,
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!selectedInvoiceId) {
      setError('Please select an invoice.');
      return;
    }
    if (!newDate || !/^\d{4}-\d{2}-\d{2}$/.test(newDate)) {
      setError('Please enter a valid date (YYYY-MM-DD).');
      return;
    }

    onAdd({
      type: 'move_receipt',
      invoiceExternalId: selectedInvoiceId,
      newExpectedSettlementOn: newDate,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4" data-testid="move-receipt-form">
      <div className="space-y-2">
        <Label htmlFor="move-receipt-invoice">Open AR Invoice</Label>
        {isLoading ? (
          <p className="text-xs text-muted-foreground">Loading invoices…</p>
        ) : invoices.length === 0 ? (
          <p className="text-xs text-muted-foreground">No open AR invoices found.</p>
        ) : (
          <Select value={selectedInvoiceId} onValueChange={setSelectedInvoiceId}>
            <SelectTrigger id="move-receipt-invoice" data-testid="move-receipt-invoice-select">
              <SelectValue placeholder="Select an invoice" />
            </SelectTrigger>
            <SelectContent>
              {invoices.map((inv: InvoiceDto) => (
                <SelectItem key={inv.externalId} value={inv.externalId}>
                  {inv.externalId} — {formatMinor(inv.outstandingMinor)} due {inv.dueOn}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        {selectedInvoice && (
          <p className="text-xs text-muted-foreground">
            Currently expected: {selectedInvoice.expectedSettlementOn}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="move-receipt-date">New Expected Settlement Date</Label>
        <Input
          id="move-receipt-date"
          type="date"
          value={newDate}
          onChange={(e) => setNewDate(e.target.value)}
          data-testid="move-receipt-date-input"
        />
      </div>

      {error && (
        <p className="text-xs text-destructive" data-testid="move-receipt-error">
          {error}
        </p>
      )}

      <div className="flex gap-2 justify-end">
        <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" size="sm" data-testid="move-receipt-submit">
          Add Change
        </Button>
      </div>
    </form>
  );
}
