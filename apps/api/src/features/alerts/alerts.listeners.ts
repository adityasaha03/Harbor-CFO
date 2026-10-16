import type { EventDto } from '@harbor/contracts';
import { logger } from '../../core/logging/logger';
import { eventsBus } from '../events/events.bus';
import { alertsService } from './alerts.service';

/**
 * Handles domain events that trigger alert re-evaluation.
 * Listens for forecast.updated to recompute alerts proactively.
 */
export async function handleAlertsEvent(event: EventDto): Promise<void> {
  if (event.kind !== 'forecast.updated') {
    return;
  }

  try {
    await alertsService.evaluateAndSync(event.tenantId);
  } catch (err) {
    logger.error(
      { err, tenantId: event.tenantId, eventKind: event.kind },
      'Failed to evaluate and sync alerts on domain event',
    );
  }
}

let isRegistered = false;

/**
 * Registers the alerts domain event listener on eventsBus.
 * Idempotent: returns an unsubscribe function.
 */
export function registerAlertsListeners(): () => void {
  if (isRegistered) {
    return () => undefined;
  }
  isRegistered = true;

  const listener = (event: EventDto): void => {
    void handleAlertsEvent(event);
  };

  eventsBus.on('event', listener);

  return () => {
    eventsBus.off('event', listener);
    isRegistered = false;
  };
}
