'use client';

import * as React from 'react';
import { QueryClientProvider, type QueryClient } from '@tanstack/react-query';
import { createQueryClient } from '@/lib/query/query-client';

let browserQueryClient: QueryClient | undefined = undefined;

function getQueryClient(): QueryClient {
  if (typeof window === 'undefined') {
    return createQueryClient();
  }
  if (!browserQueryClient) {
    browserQueryClient = createQueryClient();
  }
  return browserQueryClient;
}

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const queryClient = getQueryClient();

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}
