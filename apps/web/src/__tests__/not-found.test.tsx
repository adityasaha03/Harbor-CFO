import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import NotFound from '../app/not-found';

describe('NotFound component', () => {
  it('renders the 404 message and navigation links', () => {
    render(<NotFound />);

    expect(screen.getByText(/error 404/i)).toBeInTheDocument();
    expect(screen.getByText(/page not found/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /sign in/i })).toHaveAttribute('href', '/sign-in');
    expect(screen.getByRole('link', { name: /go to dashboard/i })).toHaveAttribute('href', '/dashboard');
  });
});

