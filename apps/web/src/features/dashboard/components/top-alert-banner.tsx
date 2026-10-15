'use client';

import * as React from 'react';
import Link from 'next/link';
import { AlertTriangle, ArrowRight, ShieldAlert } from 'lucide-react';
import type { Alert, AlertSeverity } from '@harbor/contracts';
import { SeverityBadge } from '@/components/data/severity-badge';
import { Button } from '@/components/ui/button';
import { useAlerts } from '@/features/alerts';

const SEVERITY_RANK: Record<AlertSeverity, number> = {
  critical: 4,
  high: 3,
  medium: 2,
  info: 1,
};

export interface TopAlertBannerProps {
  alerts?: Alert[];
}

export function TopAlertBanner({ alerts: propAlerts }: TopAlertBannerProps) {
  const query = useAlerts();
  const alertsList = propAlerts ?? query.data ?? [];

  const topAlert = React.useMemo(() => {
    const openAlerts = alertsList.filter((a) => a.status === 'open');
    if (openAlerts.length === 0) return null;

    return [...openAlerts].sort(
      (a, b) => (SEVERITY_RANK[b.severity] ?? 0) - (SEVERITY_RANK[a.severity] ?? 0),
    )[0];
  }, [alertsList]);

  if (!topAlert) {
    return null;
  }

  const isCritical = topAlert.severity === 'critical';

  return (
    <div
      role="alert"
      data-testid="top-alert-banner"
      className={`rounded-lg border p-4 transition-colors ${
        isCritical
          ? 'border-red-500/40 bg-red-500/10 text-red-950 dark:text-red-100'
          : 'border-amber-500/40 bg-amber-500/10 text-amber-950 dark:text-amber-100'
      }`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-start gap-3">
          {isCritical ? (
            <ShieldAlert className="h-5 w-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
          ) : (
            <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          )}
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <SeverityBadge severity={topAlert.severity} />
              <h3 className="text-sm font-semibold leading-tight text-foreground">
                {topAlert.title}
              </h3>
            </div>
            <p className="text-xs text-muted-foreground line-clamp-2">{topAlert.summary}</p>
          </div>
        </div>

        <div className="shrink-0 self-end sm:self-center">
          <Button asChild size="sm" variant={isCritical ? 'destructive' : 'outline'} className="text-xs">
            <Link href="/alerts" className="inline-flex items-center gap-1.5">
              <span>View Alerts</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
