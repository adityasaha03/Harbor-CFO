'use client';

import * as React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface StaleBannerProps {
  onRegenerate: () => void;
  isRegenerating?: boolean;
}

export function StaleBanner({ onRegenerate, isRegenerating }: StaleBannerProps) {
  return (
    <div
      role="alert"
      className="flex items-center justify-between gap-3 p-3.5 rounded-lg border border-amber-300 dark:border-amber-700/60 bg-amber-50/90 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 text-xs shadow-xs"
      data-testid="stale-banner"
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
        <div>
          <span className="font-semibold">Scenario data is stale.</span>
          <span className="ml-1 text-amber-800/90 dark:text-amber-300/90">
            Baseline figures have changed since this scenario was calculated.
          </span>
        </div>
      </div>
      <Button
        variant="outline"
        size="sm"
        className="h-7 text-xs shrink-0 border-amber-400/60 dark:border-amber-600/60 hover:bg-amber-100 dark:hover:bg-amber-900/40 gap-1.5"
        onClick={onRegenerate}
        disabled={isRegenerating}
        data-testid="regenerate-scenario-btn"
      >
        <RefreshCw className={`h-3 w-3 ${isRegenerating ? 'animate-spin' : ''}`} />
        {isRegenerating ? 'Regenerating…' : 'Regenerate'}
      </Button>
    </div>
  );
}
