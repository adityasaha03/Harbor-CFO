import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { useEventStream } from '../hooks/use-event-stream';
import * as sseModule from '@/lib/api/sse';
import { toast } from 'sonner';
import { queryKeys } from '@/lib/query/keys';
import type { DomainEvent } from '@harbor/contracts';

vi.mock('sonner', () => ({
  toast: {
    warning: vi.fn(),
  },
}));

describe('useEventStream', () => {
  let queryClient: QueryClient;
  let emitMockEvent: (event: DomainEvent) => void;
  const mockUnsubscribe = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient();

    vi.spyOn(sseModule, 'subscribeToEventStream').mockImplementation(({ onEvent }) => {
      emitMockEvent = onEvent;
      return mockUnsubscribe;
    });
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  it('subscribes to stream on mount and unsubscribes on unmount', () => {
    const { unmount } = renderHook(() => useEventStream(), { wrapper });

    expect(sseModule.subscribeToEventStream).toHaveBeenCalledTimes(1);

    unmount();
    expect(mockUnsubscribe).toHaveBeenCalledTimes(1);
  });

  it('invalidates mapped queries on import.committed event', () => {
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    renderHook(() => useEventStream(), { wrapper });

    emitMockEvent({
      id: 'ev_1',
      event: 'import.committed',
      tenantId: 'org_1',
      data: { importId: 'imp_1' },
      timestamp: new Date().toISOString(),
    });

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: queryKeys.forecast.all });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: queryKeys.analytics.all });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: queryKeys.alerts.all });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: queryKeys.imports.all });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: queryKeys.ledger.all });
  });

  it('triggers sonner toast.warning and invalidates alerts cache on alert.raised event', () => {
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    renderHook(() => useEventStream(), { wrapper });

    emitMockEvent({
      id: 'ev_2',
      event: 'alert.raised',
      tenantId: 'org_1',
      data: {
        title: 'Cash short on day 21',
        description: 'Projected balance is negative CNY 20,000.',
      },
      timestamp: new Date().toISOString(),
    });

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: queryKeys.alerts.all });
    expect(toast.warning).toHaveBeenCalledWith('Cash short on day 21', {
      description: 'Projected balance is negative CNY 20,000.',
    });
  });
});
