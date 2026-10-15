import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryBoundary } from '@/components/feedback/query-boundary';

describe('QueryBoundary component', () => {
  it('renders loading state when isLoading is true', () => {
    render(
      <QueryBoundary query={{ isLoading: true }}>
        <div>Loaded Content</div>
      </QueryBoundary>,
    );
    expect(screen.getByTestId('query-loading')).toBeInTheDocument();
    expect(screen.queryByText('Loaded Content')).not.toBeInTheDocument();
  });

  it('renders error state with retry button when isError is true', async () => {
    const user = userEvent.setup();
    const handleRefetch = vi.fn();

    render(
      <QueryBoundary
        query={{
          isLoading: false,
          isError: true,
          error: new Error('Network error'),
          refetch: handleRefetch,
        }}
      >
        <div>Loaded Content</div>
      </QueryBoundary>,
    );

    expect(screen.getByText('Network error')).toBeInTheDocument();
    const retryBtn = screen.getByRole('button', { name: /try again/i });
    expect(retryBtn).toBeInTheDocument();

    await user.click(retryBtn);
    expect(handleRefetch).toHaveBeenCalledTimes(1);
  });

  it('renders empty state when data is empty array', () => {
    render(
      <QueryBoundary
        query={{ isLoading: false, isError: false, data: [] }}
        emptyTitle="No items"
        emptyDescription="Your list is empty."
      >
        <div>Loaded Content</div>
      </QueryBoundary>,
    );

    expect(screen.getByText('No items')).toBeInTheDocument();
    expect(screen.getByText('Your list is empty.')).toBeInTheDocument();
    expect(screen.queryByText('Loaded Content')).not.toBeInTheDocument();
  });

  it('renders data when query succeeds with data', () => {
    render(
      <QueryBoundary
        query={{ isLoading: false, isError: false, data: { name: 'Harbor Wholesale' } }}
      >
        {(data) => <div>Company: {data.name}</div>}
      </QueryBoundary>,
    );

    expect(screen.getByText('Company: Harbor Wholesale')).toBeInTheDocument();
  });
});
