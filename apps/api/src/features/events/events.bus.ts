import { EventEmitter } from 'node:events';
import type { EventDto } from '@harbor/contracts';

/**
 * In-process EventEmitter for distributing domain events to live SSE listeners.
 * Single API instance limitation: events are distributed to streams on this Node process.
 */
class EventsBus extends EventEmitter {
  constructor() {
    super();
    // Allow high number of concurrent SSE connections without warning
    this.setMaxListeners(1000);
  }

  /**
   * Broadcasts an event to global and tenant-specific subscribers.
   */
  emitEvent(event: EventDto): void {
    this.emit('event', event);
    this.emit(`tenant:${event.tenantId}`, event);
  }

  /**
   * Subscribes to events for a specific tenant.
   * Returns an unsubscribe function to remove the listener.
   */
  onTenantEvent(tenantId: string, listener: (event: EventDto) => void): () => void {
    const channel = `tenant:${tenantId}`;
    this.on(channel, listener);
    return () => {
      this.off(channel, listener);
    };
  }
}

export const eventsBus = new EventsBus();

