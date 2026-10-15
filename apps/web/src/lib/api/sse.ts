import { fetchEventSource } from '@microsoft/fetch-event-source';
import { getApiToken } from '@/features/auth';
import { getActiveTenantId } from './client';
import type { DomainEvent, EventKind } from '@harbor/contracts';

export interface EventStreamOptions {
  onEvent: (event: DomainEvent) => void;
  onError?: (error: Error) => void;
  tenantId?: string;
  signal?: AbortSignal;
}

const MIN_BACKOFF_MS = 1000;
const MAX_BACKOFF_MS = 15000;

/**
 * Subscribes to live Server-Sent Events from Express API (/api/v1/events/stream).
 * Uses @microsoft/fetch-event-source with JWT, X-Tenant-Id, and Last-Event-ID resumes.
 */
export function subscribeToEventStream(options: EventStreamOptions): () => void {
  const abortController = new AbortController();
  const activeSignal = options.signal || abortController.signal;

  let lastEventId: string | null = null;
  let backoffMs = MIN_BACKOFF_MS;

  const baseUrl = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000').replace(/\/+$/, '');
  const streamUrl = `${baseUrl}/api/v1/events/stream`;

  const connect = async () => {
    if (activeSignal.aborted) return;

    let token = '';
    try {
      token = await getApiToken();
    } catch (err) {
      options.onError?.(err instanceof Error ? err : new Error(String(err)));
      return;
    }

    const tenantId = options.tenantId || getActiveTenantId();
    const headers: Record<string, string> = {
      Authorization: `Bearer ${token}`,
      Accept: 'text/event-stream',
    };

    if (tenantId) {
      headers['X-Tenant-Id'] = tenantId;
    }
    if (lastEventId) {
      headers['Last-Event-ID'] = lastEventId;
    }

    try {
      await fetchEventSource(streamUrl, {
        method: 'GET',
        headers,
        signal: activeSignal,
        openWhenHidden: true,
        async onopen(response) {
          if (response.ok && response.status === 200) {
            // Reset backoff upon successful connection
            backoffMs = MIN_BACKOFF_MS;
            return;
          }
          if (response.status === 401) {
            // Re-acquire fresh token before reconnecting
            await getApiToken({ forceRefresh: true });
          }
          throw new Error(`SSE stream connection failed with HTTP ${response.status}`);
        },
        onmessage(event) {
          if (event.id) {
            lastEventId = event.id;
          }
          if (!event.data) return;

          try {
            const parsedData = JSON.parse(event.data) as Record<string, unknown>;
            const domainEvent: DomainEvent = {
              id: event.id || String(parsedData.id || Date.now()),
              event: (event.event || parsedData.event) as EventKind,
              tenantId: String(parsedData.tenantId || tenantId || ''),
              data: (parsedData.data as Record<string, unknown>) || parsedData,
              timestamp: String(parsedData.timestamp || new Date().toISOString()),
            };
            options.onEvent(domainEvent);
          } catch {
            // Non-JSON or comment events ignored
          }
        },
        onclose() {
          // Server closed (e.g., token expired). fetchEventSource will reconnect.
        },
        onerror(err) {
          options.onError?.(err instanceof Error ? err : new Error(String(err)));
          // Exponential backoff
          const delay = backoffMs;
          backoffMs = Math.min(backoffMs * 2, MAX_BACKOFF_MS);
          return delay;
        },
      });
    } catch (error) {
      if (!activeSignal.aborted) {
        options.onError?.(error instanceof Error ? error : new Error(String(error)));
      }
    }
  };

  void connect();

  return () => {
    abortController.abort();
  };
}
