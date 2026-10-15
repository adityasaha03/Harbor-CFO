import * as React from 'react';
import { Inbox } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface EmptyStateProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string;
  description?: string;
  action?: React.ReactNode;
  icon?: React.ReactNode;
}

export function EmptyState({
  title = 'No data available',
  description = 'There are no records to display at this time.',
  action,
  icon,
  className,
  ...props
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex min-h-[220px] flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center animate-in fade-in-50',
        className,
      )}
      {...props}
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
        {icon ?? <Inbox className="h-6 w-6" />}
      </div>
      <h3 className="mt-4 text-base font-semibold">{title}</h3>
      <p className="mb-4 mt-1 max-w-sm text-sm text-muted-foreground">
        {description}
      </p>
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
