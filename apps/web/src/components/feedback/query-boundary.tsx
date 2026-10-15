import * as React from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from './empty-state';
import { ErrorState } from './error-state';

export interface QueryLikeResult<TData = unknown> {
  isLoading?: boolean;
  isPending?: boolean;
  isError?: boolean;
  error?: Error | unknown | null;
  data?: TData;
  refetch?: () => void | Promise<unknown>;
}

export interface QueryBoundaryProps<TData> {
  query: QueryLikeResult<TData>;
  children: React.ReactNode | ((data: TData) => React.ReactNode);
  loadingFallback?: React.ReactNode;
  emptyFallback?: React.ReactNode;
  emptyTitle?: string;
  emptyDescription?: string;
  isEmpty?: (data: TData) => boolean;
}

export function QueryBoundary<TData>({
  query,
  children,
  loadingFallback,
  emptyFallback,
  emptyTitle,
  emptyDescription,
  isEmpty,
}: QueryBoundaryProps<TData>) {
  const isLoading = query.isLoading ?? query.isPending;

  if (isLoading) {
    if (loadingFallback) {
      return <>{loadingFallback}</>;
    }
    return (
      <div className="space-y-3 p-4" data-testid="query-loading">
        <Skeleton className="h-8 w-1/3" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  if (query.isError) {
    const message =
      query.error instanceof Error
        ? query.error.message
        : 'Failed to load data';
    return (
      <ErrorState
        message={message}
        onRetry={query.refetch ? () => void query.refetch?.() : undefined}
      />
    );
  }

  const data = query.data;

  const isDataEmpty =
    data === undefined ||
    data === null ||
    (Array.isArray(data) && data.length === 0) ||
    (isEmpty ? isEmpty(data as TData) : false);

  if (isDataEmpty) {
    if (emptyFallback) {
      return <>{emptyFallback}</>;
    }
    return <EmptyState title={emptyTitle} description={emptyDescription} />;
  }

  return (
    <>
      {typeof children === 'function'
        ? (children as (data: TData) => React.ReactNode)(data as TData)
        : children}
    </>
  );
}
