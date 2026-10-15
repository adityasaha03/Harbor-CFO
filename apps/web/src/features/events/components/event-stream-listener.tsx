'use client';

import { useEventStream } from '../hooks/use-event-stream';

export function EventStreamListener() {
  useEventStream();
  return null;
}
