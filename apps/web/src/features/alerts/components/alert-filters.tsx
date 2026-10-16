'use client';

import * as React from 'react';
import type { AlertStatus } from '@harbor/contracts';
import { Badge } from '@/components/ui/badge';

export interface AlertFiltersProps {
  status: AlertStatus;
  onStatusChange: (status: AlertStatus) => void;
  openCount: number;
  resolvedCount: number;
}

export function AlertFilters({
  status,
  onStatusChange,
  openCount,
  resolvedCount,
}: AlertFiltersProps) {
  return (
    <div className="flex items-center gap-2" data-testid="alert-filters">
      <button
        type="button"
        role="tab"
        aria-selected={status === 'open'}
        onClick={() => onStatusChange('open')}
        className={`flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
          status === 'open'
            ? 'bg-primary text-primary-foreground border-primary shadow-xs'
            : 'bg-card text-muted-foreground border-border hover:bg-accent hover:text-foreground'
        }`}
        data-testid="filter-open-tab"
      >
        <span>Open Alerts</span>
        <Badge
          variant={status === 'open' ? 'secondary' : 'outline'}
          className="px-1.5 py-0 text-[10px] font-semibold h-4 min-w-[16px] justify-center"
        >
          {openCount}
        </Badge>
      </button>

      <button
        type="button"
        role="tab"
        aria-selected={status === 'resolved'}
        onClick={() => onStatusChange('resolved')}
        className={`flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
          status === 'resolved'
            ? 'bg-primary text-primary-foreground border-primary shadow-xs'
            : 'bg-card text-muted-foreground border-border hover:bg-accent hover:text-foreground'
        }`}
        data-testid="filter-resolved-tab"
      >
        <span>Resolved</span>
        <Badge
          variant={status === 'resolved' ? 'secondary' : 'outline'}
          className="px-1.5 py-0 text-[10px] font-semibold h-4 min-w-[16px] justify-center"
        >
          {resolvedCount}
        </Badge>
      </button>
    </div>
  );
}
