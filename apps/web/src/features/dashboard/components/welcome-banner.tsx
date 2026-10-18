'use client';

import * as React from 'react';
import Link from 'next/link';
import { Sparkles } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { useSession } from '@/features/auth';

const QUICK_ACTIONS = [
  { label: '📊 Check Cash Forecast', href: '/forecast' },
  { label: '⚠️ View Alerts', href: '/alerts' },
  { label: '📁 Upload New Data', href: '/imports' },
];

export function WelcomeBanner() {
  const { user } = useSession();
  const [timeOfDay, setTimeOfDay] = React.useState('morning');

  React.useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) {
      setTimeOfDay('morning');
    } else if (hour < 17) {
      setTimeOfDay('afternoon');
    } else {
      setTimeOfDay('evening');
    }
  }, []);

  const firstName = user?.name ? user.name.split(' ')[0] : 'there';

  return (
    <Card className="border-primary/20 bg-gradient-to-r from-primary/10 via-primary/5 to-background p-5 shadow-sm">
      <div className="space-y-3">
        <div className="space-y-1">
          <h2 className="flex items-center gap-2 text-lg font-bold tracking-tight text-foreground">
            <Sparkles className="h-5 w-5 text-primary shrink-0" />
            <span>Good {timeOfDay}, {firstName}! 👋</span>
          </h2>
          <p className="text-xs text-muted-foreground">
            Here&apos;s your business financial overview. Let&apos;s keep your cash flow healthy and growing.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 pt-1">
          {QUICK_ACTIONS.map((action) => (
            <Link
              key={action.href}
              href={action.href}
              className="inline-flex items-center rounded-full bg-primary/5 px-3 py-1 text-xs font-medium text-primary transition-colors hover:bg-primary/10"
            >
              {action.label}
            </Link>
          ))}
        </div>
      </div>
    </Card>
  );
}
