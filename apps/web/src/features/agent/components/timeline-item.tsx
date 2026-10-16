'use client';

import * as React from 'react';
import { Loader2, CheckCircle2, AlertCircle, ChevronDown, ChevronRight, Terminal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export interface TimelineItemProps {
  name: string;
  status: 'running' | 'success' | 'error';
  durationMs?: number;
  argsSanitized?: Record<string, unknown>;
  resultRefs?: string[];
  publicSummary?: string;
  isLast?: boolean;
}

/**
 * Individual tool execution item in the live activity timeline.
 * Shows tool name, execution status icon, duration, and collapsible sanitized arguments.
 */
export function TimelineItem({
  name,
  status,
  durationMs,
  argsSanitized,
  resultRefs,
  publicSummary,
  isLast = false,
}: TimelineItemProps) {
  const [isExpanded, setIsExpanded] = React.useState(false);

  const hasArgs = Boolean(
    argsSanitized && Object.keys(argsSanitized).length > 0,
  );

  return (
    <div className="relative flex gap-3 pb-6 group">
      {/* Vertical timeline line connecting items */}
      {!isLast && (
        <span
          className="absolute left-[15px] top-[26px] bottom-0 w-[2px] bg-border"
          aria-hidden="true"
        />
      )}

      {/* Status icon badge */}
      <div
        className={cn(
          'relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border bg-background shadow-xs',
          status === 'running' && 'border-blue-500/40 text-blue-500',
          status === 'success' && 'border-emerald-500/40 text-emerald-500',
          status === 'error' && 'border-destructive/40 text-destructive',
        )}
      >
        {status === 'running' && <Loader2 className="h-4 w-4 animate-spin" />}
        {status === 'success' && <CheckCircle2 className="h-4 w-4" />}
        {status === 'error' && <AlertCircle className="h-4 w-4" />}
      </div>

      {/* Content card */}
      <div className="flex-1 rounded-lg border bg-card/60 p-3 shadow-2xs">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Terminal className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="font-mono text-xs font-semibold text-foreground">
              {name}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {typeof durationMs === 'number' && (
              <Badge variant="outline" className="text-[10px] font-mono py-0 px-1.5 h-5">
                {durationMs}ms
              </Badge>
            )}
            {status === 'running' && (
              <Badge variant="secondary" className="text-[10px] py-0 px-1.5 h-5 animate-pulse">
                Running...
              </Badge>
            )}
          </div>
        </div>

        {publicSummary && (
          <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
            {publicSummary}
          </p>
        )}

        {/* Collapsible Arguments */}
        {hasArgs && (
          <div className="mt-2 pt-2 border-t border-border/50">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded((prev) => !prev)}
              className="h-6 px-1 text-[11px] text-muted-foreground hover:text-foreground gap-1 -ml-1"
            >
              {isExpanded ? (
                <ChevronDown className="h-3 w-3" />
              ) : (
                <ChevronRight className="h-3 w-3" />
              )}
              <span>{isExpanded ? 'Hide parameters' : 'View parameters'}</span>
            </Button>

            {isExpanded && (
              <pre className="mt-1.5 max-h-40 overflow-auto rounded bg-muted/70 p-2 font-mono text-[11px] text-foreground leading-normal whitespace-pre-wrap">
                {JSON.stringify(argsSanitized, null, 2)}
              </pre>
            )}
          </div>
        )}

        {/* Result Evidence references */}
        {resultRefs && resultRefs.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {resultRefs.map((ref) => (
              <span
                key={ref}
                className="inline-block rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground"
              >
                {ref}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
