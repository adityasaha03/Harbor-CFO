'use client';

import { X, ArrowRightLeft, Landmark, CalendarClock, Repeat } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatMinor } from '@harbor/contracts';
import type { ScenarioChange } from '@harbor/contracts';

interface ChangeListProps {
  changes: ScenarioChange[];
  onRemove: (index: number) => void;
}

function changeIcon(type: ScenarioChange['type']) {
  switch (type) {
    case 'move_receipt':
      return <ArrowRightLeft className="h-3.5 w-3.5 text-blue-500 shrink-0" />;
    case 'add_financing':
      return <Landmark className="h-3.5 w-3.5 text-emerald-500 shrink-0" />;
    case 'add_recurring':
      return <Repeat className="h-3.5 w-3.5 text-purple-500 shrink-0" />;
    case 'defer_payment':
      return <CalendarClock className="h-3.5 w-3.5 text-amber-500 shrink-0" />;
    default:
      return null;
  }
}

function changeLabel(change: ScenarioChange): string {
  switch (change.type) {
    case 'move_receipt':
      return `Move ${change.invoiceExternalId} → ${change.newExpectedSettlementOn}`;
    case 'add_financing':
      return `${change.offerCode}: ${formatMinor(change.principalMinor)}`;
    case 'add_recurring':
      return `${change.label}: ${formatMinor(change.amountMinor)} ${change.frequency}`;
    case 'defer_payment':
      return `Defer ${change.invoiceExternalId} → ${change.newExpectedSettlementOn}`;
    default:
      return 'Unknown change';
  }
}

export function ChangeList({ changes, onRemove }: ChangeListProps) {
  if (changes.length === 0) {
    return (
      <div
        className="text-center py-6 text-sm text-muted-foreground"
        data-testid="change-list-empty"
      >
        No changes added yet. Use the menu below to build your scenario.
      </div>
    );
  }

  return (
    <ul className="space-y-2" data-testid="change-list">
      {changes.map((change, index) => (
        <li
          key={`${change.type}-${index}`}
          className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg border border-border/60 bg-muted/30 text-sm"
          data-testid={`change-item-${index}`}
        >
          <div className="flex items-center gap-2 min-w-0">
            {changeIcon(change.type)}
            <span className="truncate font-medium">{changeLabel(change)}</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 shrink-0 text-muted-foreground hover:text-destructive"
            onClick={() => onRemove(index)}
            data-testid={`remove-change-${index}`}
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </li>
      ))}
    </ul>
  );
}
