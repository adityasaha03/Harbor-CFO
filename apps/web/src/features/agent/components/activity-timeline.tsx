'use client';

import * as React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Activity, Clock, Loader2 } from 'lucide-react';
import { TimelineItem } from './timeline-item';
import type { LiveToolEvent } from '../hooks/use-run-events';
import type { AgentToolCallRecord, AgentRunStatus } from '@harbor/contracts';

export interface ActivityTimelineProps {
  liveEvents: LiveToolEvent[];
  persistedToolCalls?: AgentToolCallRecord[];
  status?: AgentRunStatus;
  isRunning?: boolean;
}

interface MergedTimelineItem {
  id: string;
  name: string;
  status: 'running' | 'success' | 'error';
  durationMs?: number;
  argsSanitized?: Record<string, unknown>;
  resultRefs?: string[];
  publicSummary?: string;
}

/**
 * Live Activity Timeline displaying the step-by-step tool execution history of the copilot.
 * Integrates real-time SSE tool events with fallback to persisted run tool calls.
 */
export function ActivityTimeline({
  liveEvents,
  persistedToolCalls,
  status,
  isRunning = false,
}: ActivityTimelineProps) {
  // Merge or prefer persistedToolCalls if run has finalized, otherwise use liveEvents
  const items: MergedTimelineItem[] = React.useMemo(() => {
    if (persistedToolCalls && persistedToolCalls.length > 0) {
      return persistedToolCalls.map((call, index) => ({
        id: `tool-${index}-${call.name}`,
        name: call.name,
        status: call.status === 'success' ? 'success' : 'error',
        durationMs: call.durationMs,
        argsSanitized: call.argsSanitized,
        resultRefs: call.resultRefs,
        publicSummary: `Executed ${call.name} in ${call.durationMs}ms`,
      }));
    }

    return liveEvents.map((event, index) => ({
      id: event.id ? `${event.id}-${index}` : `live-${index}`,
      name: event.name,
      status: event.status,
      durationMs: event.durationMs,
      argsSanitized: event.argsSanitized,
      resultRefs: event.resultRefs,
      publicSummary: event.publicSummary,
    }));
  }, [persistedToolCalls, liveEvents]);

  const hasItems = items.length > 0;

  return (
    <Card className="h-full flex flex-col border shadow-xs">
      <CardHeader className="py-3.5 px-4 border-b bg-muted/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary" />
            <CardTitle className="text-sm font-semibold">
              Live Activity Timeline
            </CardTitle>
          </div>
          {isRunning && (
            <div className="flex items-center gap-1.5 text-xs text-blue-600 dark:text-blue-400 font-medium animate-pulse">
              <Loader2 className="h-3 w-3 animate-spin" />
              <span>Analyzing</span>
            </div>
          )}
          {!isRunning && status && status !== 'running' && (
            <span className="text-xs text-muted-foreground capitalize">
              {status}
            </span>
          )}
        </div>
      </CardHeader>

      <CardContent className="flex-1 p-4 overflow-y-auto min-h-[300px]">
        {!hasItems && !isRunning && (
          <div className="flex h-full flex-col items-center justify-center text-center p-6 text-muted-foreground">
            <Clock className="h-8 w-8 mb-2 opacity-40" />
            <p className="text-sm font-medium">No tool executions</p>
            <p className="text-xs text-muted-foreground/80 mt-1 max-w-[240px]">
              Every tool call, query parameter, and timing duration will be streamed here in real time.
            </p>
          </div>
        )}

        {!hasItems && isRunning && (
          <div className="flex h-full flex-col items-center justify-center text-center p-6 text-muted-foreground">
            <Loader2 className="h-7 w-7 mb-2 text-primary animate-spin" />
            <p className="text-sm font-medium text-foreground">
              Initializing reasoning engine...
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Selecting appropriate financial tools and querying telemetry.
            </p>
          </div>
        )}

        {hasItems && (
          <div className="flex flex-col">
            {items.map((item, index) => (
              <TimelineItem
                key={`${item.id}-${index}`}
                name={item.name}
                status={item.status}
                durationMs={item.durationMs}
                argsSanitized={item.argsSanitized}
                resultRefs={item.resultRefs}
                publicSummary={item.publicSummary}
                isLast={index === items.length - 1 && !isRunning}
              />
            ))}

            {isRunning && (
              <div className="flex gap-3 pb-2 items-center text-xs text-muted-foreground">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-dashed border-primary/50 text-primary">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                </div>
                <span className="italic">Running next step...</span>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
