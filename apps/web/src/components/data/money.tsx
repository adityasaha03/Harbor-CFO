import * as React from 'react';
import { formatMinor } from '@harbor/contracts';
import { cn } from '@/lib/utils';

export interface MoneyProps extends React.HTMLAttributes<HTMLSpanElement> {
  minor: number;
  currency?: string;
  tabular?: boolean;
}

export function Money({
  minor,
  currency = 'CNY',
  tabular = true,
  className,
  ...props
}: MoneyProps) {
  const formatted = formatMinor(minor, currency);

  return (
    <span
      className={cn(
        tabular && 'tabular-nums font-mono',
        minor < 0 && 'text-severity-critical',
        className,
      )}
      {...props}
    >
      {formatted}
    </span>
  );
}
