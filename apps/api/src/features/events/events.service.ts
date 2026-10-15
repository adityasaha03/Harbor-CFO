import type { ClientSession } from 'mongoose';
import {
  publishEventInputSchema,
  eventsReplayQuerySchema,
  type EventDto,
  type PublishEventInput,
  type EventsReplayQuery,
} from '@harbor/contracts';
import { eventsRepository } from './events.repository';
import { eventsBus } from './events.bus';

export const eventsService = {
  /**
   * Publishes a new domain event.
   * Assigns an atomic sequence, persists the event, and broadcasts it on the in-process bus.
   */
  async publish(
    tenantId: string,
    input: PublishEventInput,
    session?: ClientSession,
  ): Promise<EventDto> {
    const validated = publishEventInputSchema.parse(input);

    const sequence = await eventsRepository.nextSequence(tenantId, session);
    const event = await eventsRepository.create(tenantId, sequence, validated, session);

    // If participating in an active transaction, emit once the transaction session ends
    if (session && typeof session.inTransaction === 'function' && session.inTransaction()) {
      session.once('ended', () => {
        eventsBus.emitEvent(event);
      });
    } else {
      eventsBus.emitEvent(event);
    }

    return event;
  },

  /**
   * Replays historical events strictly after the given sequence.
   */
  async replay(
    tenantId: string,
    query: EventsReplayQuery = {},
  ): Promise<EventDto[]> {
    const parsed = eventsReplayQuerySchema.parse(query);
    const after = parsed.after ?? 0;
    const limit = parsed.limit ?? 50;

    return eventsRepository.listAfter(tenantId, after, limit);
  },
};
