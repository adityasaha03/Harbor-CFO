import * as React from 'react';
import { cn } from '@/lib/utils';

export interface DateLabelProps extends React.HTMLAttributes<HTMLSpanElement> {
  date: string;
}

export function DateLabel({ date, className, ...props }: DateLabelProps) {
  // If it's a full ISO string, take the YYYY-MM-DD part or show it cleanly
  const dateString = date.includes('T') ? date.split('T')[0] : date;

  return (
    <time
      dateTime={date}
      className={cn('tabular-nums font-mono text-sm', className)}
      {...props}
    >
      {dateString}
    </time>
  );
}
