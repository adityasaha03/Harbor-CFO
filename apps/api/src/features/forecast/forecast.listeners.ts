import type { EventDto } from '@harbor/contracts';
import { logger } from '../../core/logging/logger';
import { eventsBus } from '../events/events.bus';
import { eventsService } from '../events/events.service';
import { forecastService } from './forecast.service';

/**
 * Handles domain events that invalidate the baseline forecast.
 * Recomputes baseline and emits forecast.updated.
 */
export async function handleForecastEvent(event: EventDto): Promise<void> {
  if (event.kind !== 'import.committed' && event.kind !== 'action.committed') {
    return;
  }

  try {
    const result = await forecastService.getBaseline(event.tenantId);
    await eventsService.publish(event.tenantId, {
      kind: 'forecast.updated',
      publicSummary: `Forecast baseline updated (inputVersion ${result.inputVersion})`,
      resourceRefs: [result.run.id],
    });
  } catch (err) {
    logger.error(
      { err, tenantId: event.tenantId, eventKind: event.kind },
      'Failed to recompute forecast baseline on domain event',
    );
  }
}

let isRegistered = false;

/**
 * Registers the forecast domain event listener on eventsBus.
 * Idempotent: returns an unsubscribe function.
 */
export function registerForecastListeners(): () => void {
  if (isRegistered) {
    return () => undefined;
  }
  isRegistered = true;

  const listener = (event: EventDto): void => {
    void handleForecastEvent(event);
  };

  eventsBus.on('event', listener);

  return () => {
    eventsBus.off('event', listener);
    isRegistered = false;
  };
}
