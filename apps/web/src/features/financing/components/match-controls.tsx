'use client';

import { useState } from 'react';
import { Filter, RotateCcw } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toMinor, type FinancingPurpose, type FinancingMatchInput } from '@harbor/contracts';
import { toast } from 'sonner';

interface MatchControlsProps {
  value: FinancingMatchInput;
  onChange: (value: FinancingMatchInput) => void;
  isLoading?: boolean;
}

export function MatchControls({ value, onChange, isLoading }: MatchControlsProps) {
  const [cnyAmountInput, setCnyAmountInput] = useState<string>(
    value.desiredAmountMinor ? (value.desiredAmountMinor / 100).toFixed(2) : '',
  );
  const [inputError, setInputError] = useState<string | null>(null);

  const handlePurposeChange = (purposeStr: string) => {
    const purpose = purposeStr as FinancingPurpose;
    onChange({ ...value, purpose });
    toast.info(`Updated financing purpose to ${purpose.replace('_', ' ')}`);
  };

  const handleAmountBlur = () => {
    const trimmed = cnyAmountInput.trim();
    if (!trimmed) {
      setInputError(null);
      if (value.desiredAmountMinor !== undefined) {
        onChange({ ...value, desiredAmountMinor: undefined });
      }
      return;
    }

    try {
      const minor = toMinor(trimmed);
      if (minor <= 0) {
        setInputError('Amount must be greater than zero');
        return;
      }
      setInputError(null);
      onChange({ ...value, desiredAmountMinor: minor });
      toast.info(`Updated requested facility amount to ¥${trimmed}`);
    } catch {
      setInputError('Enter a valid amount (e.g. 60000.00)');
    }
  };

  const handleReset = () => {
    setCnyAmountInput('');
    setInputError(null);
    onChange({
      purpose: 'working_capital',
      desiredAmountMinor: undefined,
    });
    toast.info('Financing match filters reset to defaults');
  };

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4 p-4 rounded-xl border bg-card/60 backdrop-blur-sm shadow-xs">
      <div className="flex flex-col sm:flex-row items-start sm:items-end gap-4 w-full sm:w-auto">
        {/* Purpose Selector */}
        <div className="w-full sm:w-56 space-y-1.5">
          <Label htmlFor="purpose-select" className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
            <Filter className="h-3.5 w-3.5 text-primary" />
            Financing Purpose
          </Label>
          <Select
            value={value.purpose}
            onValueChange={handlePurposeChange}
            disabled={isLoading}
          >
            <SelectTrigger id="purpose-select" className="h-9 text-sm">
              <SelectValue placeholder="Select purpose" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="working_capital">Working Capital</SelectItem>
              <SelectItem value="bridge">Bridge Loan</SelectItem>
              <SelectItem value="equipment">Equipment Finance</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Optional Amount Override */}
        <div className="w-full sm:w-52 space-y-1.5">
          <Label htmlFor="amount-override" className="text-xs font-medium text-muted-foreground">
            Custom Amount (CNY, optional)
          </Label>
          <div className="relative">
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-semibold">
              ¥
            </span>
            <Input
              id="amount-override"
              type="text"
              placeholder="e.g. 60,000.00"
              value={cnyAmountInput}
              onChange={(e) => {
                setCnyAmountInput(e.target.value);
                if (inputError) setInputError(null);
              }}
              onBlur={handleAmountBlur}
              disabled={isLoading}
              className={`h-9 pl-7 text-sm font-mono ${inputError ? 'border-destructive focus-visible:ring-destructive' : ''}`}
            />
          </div>
          {inputError && (
            <p className="text-[11px] text-destructive mt-0.5">{inputError}</p>
          )}
        </div>
      </div>

      {/* Action / Reset Button */}
      <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
        {(value.purpose !== 'working_capital' || value.desiredAmountMinor !== undefined) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleReset}
            disabled={isLoading}
            className="h-9 text-xs text-muted-foreground hover:text-foreground"
          >
            <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
            Reset to Auto
          </Button>
        )}
      </div>
    </div>
  );
}
