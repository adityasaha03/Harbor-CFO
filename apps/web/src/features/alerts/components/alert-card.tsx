import * as React from 'react';
import type { Alert } from '@harbor/contracts';
import { SeverityBadge } from '@/components/data/severity-badge';
import { Badge } from '@/components/ui/badge';
import { AlertEvidenceList } from './alert-evidence-list';
import { Clock, CheckCircle2 } from 'lucide-react';

export interface AlertCardProps {
  alert: Alert;
}

export function AlertCard({ alert }: AlertCardProps) {
  const isResolved = alert.status === 'resolved';

  return (
    <div
      className={`rounded-lg border p-4 transition-all shadow-xs space-y-3 bg-card ${
        isResolved
          ? 'opacity-75 border-border/60 bg-muted/20'
          : alert.severity === 'critical'
            ? 'border-red-500/40 dark:border-red-900/60'
            : alert.severity === 'high'
              ? 'border-orange-500/40 dark:border-orange-900/60'
              : alert.severity === 'medium'
                ? 'border-amber-500/40 dark:border-amber-900/60'
                : 'border-border'
      }`}
      data-testid={`alert-card-${alert.id}`}
    >
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/50 pb-2.5">
        <div className="flex items-center gap-2">
          <SeverityBadge severity={alert.severity} />
          <Badge variant="outline" className="text-[11px] font-mono font-normal">
            {formatRuleName(alert.ruleId)}
          </Badge>
          {isResolved && (
            <Badge variant="secondary" className="text-[10px] gap-1 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="h-3 w-3" />
              Resolved
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1" title={`First detected: ${alert.firstSeenAt}`}>
            <Clock className="h-3 w-3" />
            <span>Last seen: {formatTime(alert.lastSeenAt)}</span>
          </span>
        </div>
      </div>

      {/* Title & Summary (strictly plain text rendering) */}
      <div className="space-y-1">
        <h3 className="text-sm font-semibold text-foreground leading-snug">
          {alert.title}
        </h3>
        <p className="text-xs text-muted-foreground leading-relaxed">
          {alert.summary}
        </p>
      </div>

      {/* Supporting Evidence */}
      {alert.evidence && alert.evidence.length > 0 && (
        <AlertEvidenceList evidence={alert.evidence} ruleId={alert.ruleId} />
      )}
    </div>
  );
}

function formatRuleName(ruleId: string): string {
  return ruleId.replace(/_/g, ' ');
}

function formatTime(iso: string): string {
  try {
    const date = new Date(iso);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}
