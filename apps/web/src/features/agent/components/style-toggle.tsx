'use client';

import * as React from 'react';
import type { AgentStyle } from '@harbor/contracts';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface StyleToggleProps {
  value: AgentStyle;
  onChange: (style: AgentStyle) => void;
  disabled?: boolean;
}

/**
 * Toggles between 'standard' executive financial tone and 'plain' concise tone.
 */
export function StyleToggle({ value, onChange, disabled }: StyleToggleProps) {
  return (
    <div
      role="group"
      aria-label="Agent response style"
      className="inline-flex items-center rounded-lg border bg-muted/50 p-0.5 text-xs text-muted-foreground"
    >
      <Button
        type="button"
        variant="ghost"
        size="sm"
        disabled={disabled}
        onClick={() => onChange('standard')}
        className={cn(
          'h-7 px-2.5 text-xs font-medium rounded-md transition-all',
          value === 'standard'
            ? 'bg-background text-foreground shadow-sm'
            : 'hover:text-foreground text-muted-foreground',
        )}
      >
        Standard
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        disabled={disabled}
        onClick={() => onChange('plain')}
        className={cn(
          'h-7 px-2.5 text-xs font-medium rounded-md transition-all',
          value === 'plain'
            ? 'bg-background text-foreground shadow-sm'
            : 'hover:text-foreground text-muted-foreground',
        )}
      >
        Plain
      </Button>
    </div>
  );
}
