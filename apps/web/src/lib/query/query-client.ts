import { QueryClient } from '@tanstack/react-query';
import { ApiError } from '@/lib/api/errors';

/**
 * Creates a configured QueryClient instance adhering to HarborCFO conventions:
 * - staleTime: 30s
 * - retry: 1 (no retry on 4xx)
 * - refetchOnWindowFocus: false
 */
export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30 * 1000,
        refetchOnWindowFocus: false,
        retry: (failureCount, error) => {
          if (ApiError.isApiError(error) && error.status >= 400 && error.status < 500) {
            return false;
          }
          return failureCount < 1;
        },
      },
      mutations: {
        retry: false,
      },
    },
  });
}
