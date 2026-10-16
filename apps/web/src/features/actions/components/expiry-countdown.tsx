'use client';

import * as React from 'react';
import { Timer } from 'lucide-react';

interface ExpiryCountdownProps {
  expiresAt: string;
  isExpired?: boolean;
}

export function ExpiryCountdown({ expiresAt, isExpired }: ExpiryCountdownProps) {
  const [timeLeft, setTimeLeft] = React.useState<string>('');
  const [hasExpired, setHasExpired] = React.useState<boolean>(Boolean(isExpired));

  React.useEffect(() => {
    function update() {
      const now = Date.now();
      const target = new Date(expiresAt).getTime();
      const diff = target - now;

      if (diff <= 0) {
        setTimeLeft('Expired');
        setHasExpired(true);
        return;
      }

      const totalSeconds = Math.floor(diff / 1000);
      const minutes = Math.floor(totalSeconds / 60);
      const seconds = totalSeconds % 60;

      if (minutes >= 60) {
        const hours = Math.floor(minutes / 60);
        const remMins = minutes % 60;
        setTimeLeft(`${hours}h ${remMins}m`);
      } else {
        setTimeLeft(`${minutes}m ${seconds.toString().padStart(2, '0')}s`);
      }
      setHasExpired(false);
    }

    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [expiresAt]);

  return (
    <span
      className={`inline-flex items-center gap-1 text-[11px] font-mono ${
        hasExpired ? 'text-rose-600 dark:text-rose-400 font-semibold' : 'text-muted-foreground'
      }`}
      data-testid="expiry-countdown"
    >
      <Timer className="h-3 w-3 shrink-0" />
      {hasExpired ? 'Expired' : `Expires in ${timeLeft}`}
    </span>
  );
}
