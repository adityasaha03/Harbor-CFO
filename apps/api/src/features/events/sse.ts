import type { Request, Response } from 'express';
import type { EventDto } from '@harbor/contracts';
import { RateLimitedError } from '../../core/http/app-error';
import { eventsBus } from './events.bus';
import { eventsService } from './events.service';

const MAX_CONCURRENT_STREAMS_PER_USER = 5;
const activeStreamsByUser = new Map<string, number>();

/**
 * For testing: resets active SSE stream counts.
 */
export function resetActiveStreamCountsForTesting(): void {
  activeStreamsByUser.clear();
}

/**
 * Formats and writes an individual Server-Sent Event message.
 */
export function sendSseMessage(
  res: Response,
  message: { id: number; event: string; data: unknown },
): void {
  const json = JSON.stringify(message.data);
  res.write(`id: ${message.id}\nevent: ${message.event}\ndata: ${json}\n\n`);
}

/**
 * Handles incoming SSE connections for /api/v1/events/stream.
 */
export async function handleEventsStream(req: Request, res: Response): Promise<void> {
  const userId = req.actor!.userId;
  const tenantId = req.actor!.tenantId;

  // Enforce max 5 concurrent streams per user
  const currentStreams = activeStreamsByUser.get(userId) ?? 0;
  if (currentStreams >= MAX_CONCURRENT_STREAMS_PER_USER) {
    throw new RateLimitedError('Too many concurrent event streams');
  }
  activeStreamsByUser.set(userId, currentStreams + 1);

  // Set SSE response headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders?.();

  // Track stream termination
  let isClosed = false;

  const cleanup = (): void => {
    if (isClosed) return;
    isClosed = true;

    clearInterval(heartbeatInterval);
    clearTimeout(expiryTimeout);
    unsubscribe();

    const remaining = (activeStreamsByUser.get(userId) ?? 1) - 1;
    if (remaining <= 0) {
      activeStreamsByUser.delete(userId);
    } else {
      activeStreamsByUser.set(userId, remaining);
    }
  };

  req.on('close', cleanup);
  res.on('close', cleanup);

  // 15-second heartbeat comment
  const heartbeatInterval = setInterval(() => {
    if (!isClosed) {
      res.write(': ping\n\n');
    }
  }, 15000);

  // Auto-close at JWT expiry or max 10 minutes (600,000 ms)
  const tokenExpiresAt = req.auth?.expiresAt;
  const now = Date.now();
  const maxSessionDurationMs = 10 * 60 * 1000;
  let timeoutMs = maxSessionDurationMs;

  if (tokenExpiresAt instanceof Date) {
    const timeToExpiry = tokenExpiresAt.getTime() - now;
    if (timeToExpiry < maxSessionDurationMs) {
      timeoutMs = Math.max(50, timeToExpiry);
    }
  }

  const expiryTimeout = setTimeout(() => {
    if (!isClosed) {
      res.end();
      cleanup();
    }
  }, Math.max(50, timeoutMs));

  // Determine starting sequence from Last-Event-ID or query parameter
  let afterSequence = 0;
  const lastEventId = req.headers['last-event-id'];
  if (typeof lastEventId === 'string' && lastEventId.trim().length > 0) {
    const parsed = parseInt(lastEventId.trim(), 10);
    if (!isNaN(parsed) && parsed >= 0) {
      afterSequence = parsed;
    }
  } else if (req.query.after) {
    const parsed = parseInt(String(req.query.after), 10);
    if (!isNaN(parsed) && parsed >= 0) {
      afterSequence = parsed;
    }
  }

  // Subscribe to live events for this tenant first
  const unsubscribe = eventsBus.onTenantEvent(tenantId, (event: EventDto) => {
    if (!isClosed && event.sequence > afterSequence) {
      sendSseMessage(res, {
        id: event.sequence,
        event: event.kind,
        data: event,
      });
      afterSequence = event.sequence;
    }
  });

  // Replay missed historical events
  try {
    const historical = await eventsService.replay(tenantId, {
      after: afterSequence,
      limit: 200,
    });

    for (const event of historical) {
      if (isClosed) break;
      sendSseMessage(res, {
        id: event.sequence,
        event: event.kind,
        data: event,
      });
      if (event.sequence > afterSequence) {
        afterSequence = event.sequence;
      }
    }
  } catch (error) {
    cleanup();
    throw error;
  }
}

