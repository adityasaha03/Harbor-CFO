'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Calendar, CalendarDays } from 'lucide-react';

export type ForecastGranularity = 'daily' | 'weekly';

export interface ViewToggleProps {
  value: ForecastGranularity;
  onChange: (value: ForecastGranularity) => void;
}

export function ViewToggle({ value, onChange }: ViewToggleProps) {
  return (
    <div
      role="group"
      aria-label="Forecast timeframe granularity"
      className="inline-flex items-center rounded-lg border border-border bg-muted/40 p-1 shadow-2xs"
      data-testid="forecast-view-toggle"
    >
      <Button
        type="button"
        variant={value === 'daily' ? 'default' : 'ghost'}
        size="sm"
        onClick={() => onChange('daily')}
        className="h-8 gap-1.5 px-3 text-xs font-medium"
        aria-pressed={value === 'daily'}
        data-testid="toggle-daily"
      >
        <Calendar className="h-3.5 w-3.5" />
        Daily (91 Days)
      </Button>

      <Button
        type="button"
        variant={value === 'weekly' ? 'default' : 'ghost'}
        size="sm"
        onClick={() => onChange('weekly')}
        className="h-8 gap-1.5 px-3 text-xs font-medium"
        aria-pressed={value === 'weekly'}
        data-testid="toggle-weekly"
      >
        <CalendarDays className="h-3.5 w-3.5" />
        Weekly (13 Weeks)
      </Button>
    </div>
  );
}
