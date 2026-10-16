'use client';

import * as React from 'react';
import { Plus, ArrowRightLeft, Landmark, Repeat, CalendarClock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { ScenarioChange } from '@harbor/contracts';
import { MoveReceiptForm } from './move-receipt-form';
import { AddFinancingForm } from './add-financing-form';
import { AddRecurringForm } from './add-recurring-form';
import { DeferPaymentForm } from './defer-payment-form';

type ChangeType = 'move_receipt' | 'add_financing' | 'add_recurring' | 'defer_payment';

interface ChangeBuilderProps {
  onAdd: (change: ScenarioChange) => void;
  defaultOfferCode?: string;
  defaultAmountMinor?: number;
}

export function ChangeBuilder({ onAdd, defaultOfferCode, defaultAmountMinor }: ChangeBuilderProps) {
  const [activeForm, setActiveForm] = React.useState<ChangeType | null>(null);

  const handleAdd = (change: ScenarioChange) => {
    onAdd(change);
    setActiveForm(null);
  };

  const handleCancel = () => {
    setActiveForm(null);
  };

  return (
    <div className="space-y-3" data-testid="change-builder">
      {activeForm === 'move_receipt' && (
        <MoveReceiptForm onAdd={handleAdd} onCancel={handleCancel} />
      )}
      {activeForm === 'add_financing' && (
        <AddFinancingForm
          onAdd={handleAdd}
          onCancel={handleCancel}
          defaultOfferCode={defaultOfferCode}
          defaultAmountMinor={defaultAmountMinor}
        />
      )}
      {activeForm === 'add_recurring' && (
        <AddRecurringForm onAdd={handleAdd} onCancel={handleCancel} />
      )}
      {activeForm === 'defer_payment' && (
        <DeferPaymentForm onAdd={handleAdd} onCancel={handleCancel} />
      )}

      {!activeForm && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="w-full gap-1.5"
              data-testid="add-change-menu-trigger"
            >
              <Plus className="h-3.5 w-3.5" />
              Add Change
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
            <DropdownMenuItem
              onClick={() => setActiveForm('move_receipt')}
              data-testid="add-change-move-receipt"
            >
              <ArrowRightLeft className="h-4 w-4 mr-2 text-blue-500" />
              Move Receipt Earlier
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => setActiveForm('add_financing')}
              data-testid="add-change-add-financing"
            >
              <Landmark className="h-4 w-4 mr-2 text-emerald-500" />
              Add Financing
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => setActiveForm('add_recurring')}
              data-testid="add-change-add-recurring"
            >
              <Repeat className="h-4 w-4 mr-2 text-purple-500" />
              Add Recurring Expense
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => setActiveForm('defer_payment')}
              data-testid="add-change-defer-payment"
            >
              <CalendarClock className="h-4 w-4 mr-2 text-amber-500" />
              Defer Payment
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}
