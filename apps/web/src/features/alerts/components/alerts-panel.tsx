'use client';

import * as React from 'react';
import type { AlertStatus } from '@harbor/contracts';
import { useAlerts } from '../api/use-alerts';
import { sortAlerts } from '../lib/sort-alerts';
import { AlertCard } from './alert-card';
import { AlertFilters } from './alert-filters';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { CheckCircle2, RefreshCw, AlertCircle, ShieldCheck } from 'lucide-react';

export interface AlertsPanelProps {
  maxItems?: number;
  showFilters?: boolean;
  className?: string;
}

export function AlertsPanel({
  maxItems,
  showFilters = true,
  className = '',
}: AlertsPanelProps) {
  const [statusFilter, setStatusFilter] = React.useState<AlertStatus>('open');
  const { data: rawAlerts, isLoading, isError, error, refetch, isRefetching } = useAlerts();

  const alerts = rawAlerts ?? [];

  const openAlerts = React.useMemo(
    () => alerts.filter((a) => a.status === 'open'),
    [alerts],
  );

  const resolvedAlerts = React.useMemo(
    () => alerts.filter((a) => a.status === 'resolved'),
    [alerts],
  );

  const displayedAlerts = React.useMemo(() => {
    const list = statusFilter === 'open' ? openAlerts : resolvedAlerts;
    const sorted = sortAlerts(list);
    return typeof maxItems === 'number' ? sorted.slice(0, maxItems) : sorted;
  }, [statusFilter, openAlerts, resolvedAlerts, maxItems]);

  const lastEvaluationTime = React.useMemo(() => {
    if (alerts.length === 0) return null;
    const timestamps = alerts
      .map((a) => new Date(a.lastSeenAt).getTime())
      .filter((t) => !Number.isNaN(t));
    if (timestamps.length === 0) return null;
    const latest = Math.max(...timestamps);
    try {
      return new Date(latest).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return null;
    }
  }, [alerts]);

  return (
    <div className={`space-y-4 ${className}`} data-testid="alerts-panel">
      {/* Controls Bar */}
      {showFilters && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <AlertFilters
            status={statusFilter}
            onStatusChange={setStatusFilter}
            openCount={openAlerts.length}
            resolvedCount={resolvedAlerts.length}
          />

          <div className="flex items-center gap-2 self-end sm:self-center">
            {lastEvaluationTime && (
              <span className="text-[11px] text-muted-foreground" data-testid="last-evaluation-time">
                Evaluated: {lastEvaluationTime}
              </span>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => refetch()}
              disabled={isLoading || isRefetching}
              className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
              data-testid="refresh-alerts-btn"
            >
              <RefreshCw className={`h-3 w-3 mr-1 ${isRefetching ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      {isLoading ? (
        <div className="space-y-3" data-testid="alerts-loading">
          <Skeleton className="h-24 w-full rounded-lg" />
          <Skeleton className="h-24 w-full rounded-lg" />
          <Skeleton className="h-24 w-full rounded-lg" />
        </div>
      ) : isError ? (
        <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-6 text-center text-sm text-destructive">
          <AlertCircle className="h-6 w-6 mx-auto mb-2" />
          <p className="font-semibold">Failed to load risk alerts</p>
          <p className="text-xs text-muted-foreground mt-1">
            {error?.message || 'Unable to fetch alerts from server.'}
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            className="mt-3 text-xs"
          >
            Retry
          </Button>
        </div>
      ) : displayedAlerts.length === 0 ? (
        <div
          className="rounded-lg border border-border bg-card p-8 text-center space-y-2"
          data-testid="alerts-empty-state"
        >
          {statusFilter === 'open' ? (
            <>
              <div className="p-3 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 w-fit mx-auto">
                <ShieldCheck className="h-8 w-8" />
              </div>
              <h3 className="text-sm font-semibold text-foreground">No open alerts</h3>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                All liquidity floor, cash runway, overdue receivables, and customer concentration rules evaluated healthy.
              </p>
              {lastEvaluationTime && (
                <p className="text-[11px] text-muted-foreground/80 font-mono pt-1">
                  Last evaluated: {lastEvaluationTime}
                </p>
              )}
            </>
          ) : (
            <>
              <div className="p-3 rounded-full bg-muted text-muted-foreground w-fit mx-auto">
                <CheckCircle2 className="h-8 w-8" />
              </div>
              <h3 className="text-sm font-semibold text-foreground">No resolved alerts</h3>
              <p className="text-xs text-muted-foreground">
                Alerts will appear here once their underlying risk conditions are remediated.
              </p>
            </>
          )}
        </div>
      ) : (
        <div className="space-y-3" data-testid="alerts-list">
          {displayedAlerts.map((alert) => (
            <AlertCard key={alert.id} alert={alert} />
          ))}
        </div>
      )}
    </div>
  );
}
