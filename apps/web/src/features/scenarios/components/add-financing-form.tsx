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
import type { AddFinancingChange, FinancingOffer } from '@harbor/contracts';
import { useFinancingOffers } from '@/features/financing';

interface AddFinancingFormProps {
  onAdd: (change: AddFinancingChange) => void;
  onCancel: () => void;
  defaultOfferCode?: string;
  defaultAmountMinor?: number;
}

export function AddFinancingForm({
  onAdd,
  onCancel,
  defaultOfferCode,
  defaultAmountMinor,
}: AddFinancingFormProps) {
  const { data: offers = [], isLoading } = useFinancingOffers();

  const [offerCode, setOfferCode] = React.useState(defaultOfferCode ?? '');
  const [amountCny, setAmountCny] = React.useState(
    defaultAmountMinor ? String(defaultAmountMinor / 100) : '',
  );
  const [fundingOn, setFundingOn] = React.useState('');
  const [error, setError] = React.useState('');

  React.useEffect(() => {
    if (defaultOfferCode && !offerCode) setOfferCode(defaultOfferCode);
    if (defaultAmountMinor && !amountCny) setAmountCny(String(defaultAmountMinor / 100));
  }, [defaultOfferCode, defaultAmountMinor, offerCode, amountCny]);

  const selectedOffer = offers.find((o: FinancingOffer) => o.code === offerCode);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!offerCode) {
      setError('Please select a financing offer.');
      return;
    }

    const amount = parseFloat(amountCny);
    if (isNaN(amount) || amount <= 0) {
      setError('Please enter a positive amount in CNY.');
      return;
    }

    const principalMinor = Math.round(amount * 100);
    if (!Number.isSafeInteger(principalMinor)) {
      setError('Amount is too large.');
      return;
    }

    if (selectedOffer) {
      if (principalMinor < selectedOffer.minAmountMinor) {
        setError(`Minimum: ${formatMinor(selectedOffer.minAmountMinor)}`);
        return;
      }
      if (principalMinor > selectedOffer.maxAmountMinor) {
        setError(`Maximum: ${formatMinor(selectedOffer.maxAmountMinor)}`);
        return;
      }
    }

    const change: AddFinancingChange = {
      type: 'add_financing',
      offerCode,
      principalMinor,
    };

    if (fundingOn && /^\d{4}-\d{2}-\d{2}$/.test(fundingOn)) {
      change.fundingOn = fundingOn;
    }

    onAdd(change);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4" data-testid="add-financing-form">
      <div className="space-y-2">
        <Label htmlFor="financing-offer">Financing Offer</Label>
        {isLoading ? (
          <p className="text-xs text-muted-foreground">Loading offers…</p>
        ) : (
          <Select value={offerCode} onValueChange={setOfferCode}>
            <SelectTrigger id="financing-offer" data-testid="financing-offer-select">
              <SelectValue placeholder="Select an offer" />
            </SelectTrigger>
            <SelectContent>
              {offers.map((offer: FinancingOffer) => (
                <SelectItem key={offer.code} value={offer.code}>
                  {offer.name} ({offer.type.replace(/_/g, ' ')})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        {selectedOffer && (
          <p className="text-xs text-muted-foreground">
            Range: {formatMinor(selectedOffer.minAmountMinor)} – {formatMinor(selectedOffer.maxAmountMinor)}
            {' · '}Fee: {selectedOffer.upfrontFeeBps} bps · Interest: {selectedOffer.flatInterestBps} bps
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="financing-amount">Principal (CNY)</Label>
        <Input
          id="financing-amount"
          type="number"
          step="0.01"
          min="0"
          placeholder="e.g. 60000"
          value={amountCny}
          onChange={(e) => setAmountCny(e.target.value)}
          data-testid="financing-amount-input"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="financing-funding-date">Funding Date (optional)</Label>
        <Input
          id="financing-funding-date"
          type="date"
          value={fundingOn}
          onChange={(e) => setFundingOn(e.target.value)}
          data-testid="financing-funding-date-input"
        />
      </div>

      {error && (
        <p className="text-xs text-destructive" data-testid="add-financing-error">
          {error}
        </p>
      )}

      <div className="flex gap-2 justify-end">
        <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" size="sm" data-testid="add-financing-submit">
          Add Change
        </Button>
      </div>
    </form>
  );
}
