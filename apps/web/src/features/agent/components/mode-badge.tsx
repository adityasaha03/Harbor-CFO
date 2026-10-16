import * as React from 'react';
import { Badge } from '@/components/ui/badge';
import { Sparkles, PlayCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ModeBadgeProps {
  mode?: 'live' | 'replay' | string;
  className?: string;
}

/**
 * Mode badge on each agent run.
 * Explicitly displays "Live model" or "Scripted replay". Never hides replay.
 */
export function ModeBadge({ mode, className }: ModeBadgeProps) {
  if (mode === 'live') {
    return (
      <Badge
        variant="outline"
        className={cn(
          'border-emerald-500/30 bg-emerald-50/50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 font-medium text-xs gap-1',
          className,
        )}
      >
        <Sparkles className="h-3 w-3" />
        Live model
      </Badge>
    );
  }

  // Fallback or explicit replay
  return (
    <Badge
      variant="secondary"
      className={cn(
        'border-amber-500/30 bg-amber-50/60 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400 font-medium text-xs gap-1',
        className,
      )}
    >
      <PlayCircle className="h-3 w-3" />
      Scripted replay
    </Badge>
  );
}
