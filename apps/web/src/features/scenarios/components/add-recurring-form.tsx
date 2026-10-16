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
import type { AddRecurringChange } from '@harbor/contracts';

const FREQUENCY_OPTIONS = [
  { value: 'once', label: 'Once' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'biweekly', label: 'Biweekly' },
  { value: 'monthly', label: 'Monthly' },
] as const;

interface AddRecurringFormProps {
  onAdd: (change: AddRecurringChange) => void;
  onCancel: () => void;
}

export function AddRecurringForm({ onAdd, onCancel }: AddRecurringFormProps) {
  const [label, setLabel] = React.useState('');
  const [direction, setDirection] = React.useState<'inflow' | 'outflow'>('outflow');
  const [amountCny, setAmountCny] = React.useState('');
  const [frequency, setFrequency] = React.useState<'once' | 'weekly' | 'biweekly' | 'monthly'>(
    'monthly',
  );
  const [startOn, setStartOn] = React.useState('');
  const [error, setError] = React.useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!label.trim()) {
      setError('Please enter a label.');
      return;
    }

    const amount = parseFloat(amountCny);
    if (isNaN(amount) || amount <= 0) {
      setError('Please enter a positive amount in CNY.');
      return;
    }

    const amountMinor = Math.round(amount * 100);
    if (!Number.isSafeInteger(amountMinor)) {
      setError('Amount is too large.');
      return;
    }

    if (!startOn || !/^\d{4}-\d{2}-\d{2}$/.test(startOn)) {
      setError('Please enter a valid start date (YYYY-MM-DD).');
      return;
    }

    onAdd({
      type: 'add_recurring',
      label: label.trim(),
      direction,
      amountMinor,
      frequency,
      startOn,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4" data-testid="add-recurring-form">
      <div className="space-y-2">
        <Label htmlFor="recurring-label">Label</Label>
        <Input
          id="recurring-label"
          placeholder="e.g. Hire 2 people at 4,000/month"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          maxLength={100}
          data-testid="recurring-label-input"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="recurring-direction">Direction</Label>
          <Select
            value={direction}
            onValueChange={(v) => setDirection(v as 'inflow' | 'outflow')}
          >
            <SelectTrigger id="recurring-direction" data-testid="recurring-direction-select">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="outflow">Outflow (expense)</SelectItem>
              <SelectItem value="inflow">Inflow (income)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="recurring-frequency">Frequency</Label>
          <Select
            value={frequency}
            onValueChange={(v) =>
              setFrequency(v as 'once' | 'weekly' | 'biweekly' | 'monthly')
            }
          >
            <SelectTrigger id="recurring-frequency" data-testid="recurring-frequency-select">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {FREQUENCY_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="recurring-amount">Amount (CNY)</Label>
        <Input
          id="recurring-amount"
          type="number"
          step="0.01"
          min="0"
          placeholder="e.g. 4000"
          value={amountCny}
          onChange={(e) => setAmountCny(e.target.value)}
          data-testid="recurring-amount-input"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="recurring-start">Start Date</Label>
        <Input
          id="recurring-start"
          type="date"
          value={startOn}
          onChange={(e) => setStartOn(e.target.value)}
          data-testid="recurring-start-input"
        />
      </div>

      {error && (
        <p className="text-xs text-destructive" data-testid="add-recurring-error">
          {error}
        </p>
      )}

      <div className="flex gap-2 justify-end">
        <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" size="sm" data-testid="add-recurring-submit">
          Add Change
        </Button>
      </div>
    </form>
  );
}
