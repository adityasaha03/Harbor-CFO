import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SyntheticDataBadge } from '@/components/layout/synthetic-data-badge';

describe('SyntheticDataBadge component', () => {
  it('renders synthetic demo data badge icon element', () => {
    render(<SyntheticDataBadge />);
    const el = screen.getByTestId('synthetic-data-badge');
    expect(el).toBeInTheDocument();
  });
});
