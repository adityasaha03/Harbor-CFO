import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { QueryBoundary } from '../query-boundary';
import { ApiError } from '@/lib/api/errors';

describe('QueryBoundary four-state audit', () => {
  it('renders loading skeleton when query is pending or loading', () => {
    render(
      <QueryBoundary query={{ isLoading: true }}>
        <div>Loaded Content</div>
      </QueryBoundary>,
    );

    expect(screen.getByTestId('query-loading')).toBeInTheDocument();
    expect(screen.queryByText('Loaded Content')).not.toBeInTheDocument();
  });

  it('renders children data when query is successful', () => {
    render(
      <QueryBoundary query={{ data: { name: 'Harbor Wholesale' } }}>
        {(data) => <div>Hello {(data as { name: string }).name}</div>}
      </QueryBoundary>,
    );

    expect(screen.getByText('Hello Harbor Wholesale')).toBeInTheDocument();
  });

  it('renders empty state when data is empty array or null', () => {
    render(
      <QueryBoundary
        query={{ data: [] }}
        emptyTitle="No invoices found"
        emptyDescription="Please upload a CSV file"
      >
        <div>Content</div>
      </QueryBoundary>,
    );

    expect(screen.getByText('No invoices found')).toBeInTheDocument();
    expect(screen.getByText('Please upload a CSV file')).toBeInTheDocument();
    expect(screen.queryByText('Content')).not.toBeInTheDocument();
  });

  it('renders error state with retry button on unexpected error', () => {
    const refetchMock = vi.fn();
    render(
      <QueryBoundary
        query={{
          isError: true,
          error: new Error('Network timeout'),
          refetch: refetchMock,
        }}
      >
        <div>Content</div>
      </QueryBoundary>,
    );

    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    expect(screen.getByText('Network timeout')).toBeInTheDocument();

    const retryBtn = screen.getByRole('button', { name: /try again/i });
    fireEvent.click(retryBtn);
    expect(refetchMock).toHaveBeenCalledTimes(1);
  });

  it('renders ForbiddenState when error is 403 or FORBIDDEN', () => {
    const forbiddenError = new ApiError({
      code: 'FORBIDDEN',
      status: 403,
      message: 'Only owners can export evidence bundles',
    });

    render(
      <QueryBoundary
        query={{
          isError: true,
          error: forbiddenError,
        }}
      >
        <div>Content</div>
      </QueryBoundary>,
    );

    expect(screen.getByText('Access Restricted')).toBeInTheDocument();
    expect(screen.getByText('Only owners can export evidence bundles')).toBeInTheDocument();
    expect(screen.getByText('Return to Dashboard')).toBeInTheDocument();
  });
});

