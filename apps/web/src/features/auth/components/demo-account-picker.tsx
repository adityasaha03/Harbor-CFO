'use client';

import * as React from 'react';
import { DEMO_EMAILS } from '@harbor/contracts';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export interface DemoAccountPickerProps {
  onSelectEmail: (email: string) => void;
}

const DEMO_PRESETS = [
  { label: 'Harbor Owner', role: 'owner', email: DEMO_EMAILS.HARBOR_OWNER },
  { label: 'Harbor Employee', role: 'employee', email: DEMO_EMAILS.HARBOR_EMPLOYEE },
  { label: 'Harbor Reviewer', role: 'reviewer', email: DEMO_EMAILS.HARBOR_REVIEWER },
  { label: 'Pearl Owner', role: 'owner', email: DEMO_EMAILS.PEARL_OWNER },
] as const;

export function DemoAccountPicker({ onSelectEmail }: DemoAccountPickerProps) {
  const isDemo = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';

  if (!isDemo) {
    return null;
  }

  return (
    <div className="rounded-lg border border-dashed border-primary/40 bg-primary/5 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold tracking-wider uppercase text-primary">
          Synthetic Demo Accounts
        </span>
        <Badge variant="secondary" className="text-[10px] uppercase font-mono">
          Demo Mode
        </Badge>
      </div>
      <p className="text-xs text-muted-foreground">
        Click to autofill a demo role email. Passwords must be entered manually.
      </p>
      <div className="grid grid-cols-2 gap-2">
        {DEMO_PRESETS.map((preset) => (
          <Button
            key={preset.email}
            type="button"
            variant="outline"
            size="sm"
            className="flex items-center justify-between text-xs font-medium h-auto py-1.5 px-2.5 bg-background hover:bg-accent"
            onClick={() => onSelectEmail(preset.email)}
          >
            <span className="truncate">{preset.label}</span>
            <span className="text-[10px] text-muted-foreground uppercase ml-1">
              {preset.role}
            </span>
          </Button>
        ))}
      </div>
    </div>
  );
}
