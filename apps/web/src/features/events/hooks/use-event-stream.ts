'use client';

import * as React from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { subscribeToEventStream } from '@/lib/api/sse';
import { getActiveTenantId } from '@/lib/api/client';
import { authClient } from '@/features/auth';
import { getQueryKeysForEvent } from '../lib/invalidation-map';
import type { DomainEvent } from '@harbor/contracts';

export interface UseEventStreamOptions {
  enabled?: boolean;
  tenantId?: string;
}

/**
 * Subscribes to the live SSE event stream and automatically invalidates corresponding
 * TanStack query caches when domain mutations occur. Displays toasts on critical alerts.
 */
export function useEventStream(options: UseEventStreamOptions = {}): void {
  const queryClient = useQueryClient();
  const enabled = options.enabled ?? true;
  const { data: activeOrg } = authClient.useActiveOrganization?.() ?? {};
  const activeTenantId = options.tenantId || activeOrg?.id || getActiveTenantId();

  React.useEffect(() => {
    if (!enabled) return;

    const handleEvent = (event: DomainEvent) => {
      // Invalidate relevant feature queries
      const keysToInvalidate = getQueryKeysForEvent(event.event);
      for (const queryKey of keysToInvalidate) {
        void queryClient.invalidateQueries({ queryKey });
      }

      // Display alert notification toast
      if (event.event === 'alert.raised') {
        const title = (event.data.title as string) || 'New Liquidity Alert Raised';
        const description = (event.data.message as string) || (event.data.description as string);
        toast.warning(title, {
          description,
        });
      }
    };

    const unsubscribe = subscribeToEventStream({
      tenantId: activeTenantId || undefined,
      onEvent: handleEvent,
      onError: () => {
        // Handled silently by automatic reconnection backoff
      },
    });

    return () => {
      unsubscribe();
    };
  }, [queryClient, enabled, activeTenantId]);
}
