import * as React from 'react';
import { Database } from 'lucide-react';
import { cn } from '@/lib/utils';

export type SyntheticDataBadgeProps = React.HTMLAttributes<HTMLDivElement>;

export function SyntheticDataBadge({
  className,
  ...props
}: SyntheticDataBadgeProps) {
  return (
    <div
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border border-amber-500/20 bg-amber-500/10 px-2.5 py-0.5 text-xs font-medium text-amber-700 dark:border-amber-400/20 dark:bg-amber-400/10 dark:text-amber-300',
        className,
      )}
      data-testid="synthetic-data-badge"
      {...props}
    >
      <Database className="h-3 w-3" />
    </div>
  );
}
