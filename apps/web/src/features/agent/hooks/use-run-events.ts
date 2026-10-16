'use client';

import * as React from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { subscribeToEventStream } from '@/lib/api/sse';
import { queryKeys } from '@/lib/query/keys';
import type { DomainEvent } from '@harbor/contracts';

export interface LiveToolEvent {
  id: string;
  name: string;
  status: 'running' | 'success' | 'error';
  durationMs?: number;
  argsSanitized?: Record<string, unknown>;
  resultRefs?: string[];
  startedAt: string;
  completedAt?: string;
  publicSummary: string;
}

export interface UseRunEventsReturn {
  events: LiveToolEvent[];
  isFinished: boolean;
  isFailed: boolean;
  clearEvents: () => void;
}

/**
 * Subscribes to the shared live SSE event stream and filters events for the given runId.
 * Keeps track of ordered tool.started, tool.completed, run.completed, and run.failed events.
 */
export function useRunEvents(runId: string | null | undefined): UseRunEventsReturn {
  const queryClient = useQueryClient();
  const [events, setEvents] = React.useState<LiveToolEvent[]>([]);
  const [isFinished, setIsFinished] = React.useState(false);
  const [isFailed, setIsFailed] = React.useState(false);

  // Reset when runId changes
  React.useEffect(() => {
    setEvents([]);
    setIsFinished(false);
    setIsFailed(false);
  }, [runId]);

  const clearEvents = React.useCallback(() => {
    setEvents([]);
    setIsFinished(false);
    setIsFailed(false);
  }, []);

  React.useEffect(() => {
    if (!runId) return;

    const handleDomainEvent = (domainEvent: DomainEvent) => {
      const data = domainEvent.data as Record<string, unknown> | undefined;
      const eventRunId = data?.runId ?? (domainEvent as unknown as { runId?: string }).runId;

      if (!eventRunId || eventRunId !== runId) {
        return;
      }

      const kind = domainEvent.event;

      if (kind === 'tool.started') {
        const resourceRefs = Array.isArray(data?.resourceRefs) ? data.resourceRefs : [];
        const toolName = (resourceRefs[0] as string) || (data?.name as string) || 'Tool execution';
        const argsSanitized = (data?.argsSanitized as Record<string, unknown>) || {};
        const summary = (data?.publicSummary as string) || `Tool started: ${toolName}`;

        setEvents((prev) => [
          ...prev,
          {
            id: domainEvent.id,
            name: toolName,
            status: 'running',
            argsSanitized,
            startedAt: domainEvent.timestamp,
            publicSummary: summary,
          },
        ]);
      } else if (kind === 'tool.completed') {
        const resourceRefs = Array.isArray(data?.resourceRefs) ? data.resourceRefs : [];
        const summary = (data?.publicSummary as string) || '';
        
        // Extract duration from summary if present (e.g., "in 120ms")
        const durationMatch = summary.match(/in\s+(\d+)ms/i);
        const matchedDuration = durationMatch?.[1];
        const durationMs = typeof matchedDuration === 'string'
          ? parseInt(matchedDuration, 10)
          : typeof data?.durationMs === 'number'
            ? data.durationMs
            : undefined;

        setEvents((prev) => {
          // Update the last matching running event, or append if not found
          let updated = false;
          const next = prev.map((item) => {
            if (!updated && item.status === 'running') {
              updated = true;
              return {
                ...item,
                status: 'success' as const,
                durationMs: durationMs ?? item.durationMs,
                resultRefs: resourceRefs as string[],
                completedAt: domainEvent.timestamp,
                publicSummary: summary || item.publicSummary,
              };
            }
            return item;
          });

          if (!updated) {
            const toolName = (resourceRefs[0] as string) || (data?.name as string) || 'Tool execution';
            next.push({
              id: domainEvent.id,
              name: toolName,
              status: 'success',
              durationMs,
              resultRefs: resourceRefs as string[],
              startedAt: domainEvent.timestamp,
              completedAt: domainEvent.timestamp,
              publicSummary: summary,
            });
          }

          return next;
        });

        // Trigger background invalidation for freshest run data
        void queryClient.invalidateQueries({ queryKey: queryKeys.agent.run(runId) });
      } else if (kind === 'run.completed') {
        setIsFinished(true);
        void queryClient.invalidateQueries({ queryKey: queryKeys.agent.run(runId) });
      } else if (kind === 'run.failed') {
        setIsFinished(true);
        setIsFailed(true);
        void queryClient.invalidateQueries({ queryKey: queryKeys.agent.run(runId) });
      }
    };

    const unsubscribe = subscribeToEventStream({
      onEvent: handleDomainEvent,
    });

    return () => {
      unsubscribe();
    };
  }, [runId, queryClient]);

  return {
    events,
    isFinished,
    isFailed,
    clearEvents,
  };
}
