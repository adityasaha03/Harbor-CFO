'use client';

import * as React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { formatMinor } from '@harbor/contracts';
import type { DeferPaymentChange, InvoiceDto } from '@harbor/contracts';
import { useInvoices } from '../api/use-invoices';

interface DeferPaymentFormProps {
  onAdd: (change: DeferPaymentChange) => void;
  onCancel: () => void;
}

export function DeferPaymentForm({ onAdd, onCancel }: DeferPaymentFormProps) {
  const { data: invoices = [], isLoading } = useInvoices({
    direction: 'AP',
    status: 'open',
  });

  const [selectedInvoiceId, setSelectedInvoiceId] = React.useState('');
  const [newDate, setNewDate] = React.useState('');
  const [assumption, setAssumption] = React.useState('');
  const [error, setError] = React.useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!selectedInvoiceId) {
      setError('Please select an AP invoice.');
      return;
    }
    if (!newDate || !/^\d{4}-\d{2}-\d{2}$/.test(newDate)) {
      setError('Please enter a valid date (YYYY-MM-DD).');
      return;
    }
    if (!assumption.trim()) {
      setError('An assumption note is required — explain why this deferral is plausible.');
      return;
    }
    if (assumption.trim().length > 300) {
      setError('Assumption text must be 300 characters or fewer.');
      return;
    }

    onAdd({
      type: 'defer_payment',
      invoiceExternalId: selectedInvoiceId,
      newExpectedSettlementOn: newDate,
      assumption: assumption.trim(),
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4" data-testid="defer-payment-form">
      <div className="space-y-2">
        <Label htmlFor="defer-payment-invoice">Open AP Invoice</Label>
        {isLoading ? (
          <p className="text-xs text-muted-foreground">Loading invoices…</p>
        ) : invoices.length === 0 ? (
          <p className="text-xs text-muted-foreground">No open AP invoices found.</p>
        ) : (
          <Select value={selectedInvoiceId} onValueChange={setSelectedInvoiceId}>
            <SelectTrigger id="defer-payment-invoice" data-testid="defer-payment-invoice-select">
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
      </div>

      <div className="space-y-2">
        <Label htmlFor="defer-payment-date">New Expected Payment Date</Label>
        <Input
          id="defer-payment-date"
          type="date"
          value={newDate}
          onChange={(e) => setNewDate(e.target.value)}
          data-testid="defer-payment-date-input"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="defer-payment-assumption">
          Assumption <span className="text-destructive">*</span>
        </Label>
        <Textarea
          id="defer-payment-assumption"
          placeholder="Explain why this deferral is plausible (e.g. supplier agreed to extended terms)"
          value={assumption}
          onChange={(e) => setAssumption(e.target.value)}
          maxLength={300}
          rows={3}
          data-testid="defer-payment-assumption-input"
        />
        <p className="text-[11px] text-amber-600 dark:text-amber-400">
          This is an assumption, not a fact. The scenario will be labelled accordingly.
        </p>
      </div>

      {error && (
        <p className="text-xs text-destructive" data-testid="defer-payment-error">
          {error}
        </p>
      )}

      <div className="flex gap-2 justify-end">
        <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" size="sm" data-testid="defer-payment-submit">
          Add Change
        </Button>
      </div>
    </form>
  );
}
