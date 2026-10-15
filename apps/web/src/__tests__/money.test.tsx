import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Money } from '@/components/data/money';

describe('Money component', () => {
  it('formats positive minor units correctly (1250000 -> 12,500.00)', () => {
    render(<Money minor={1250000} data-testid="money" />);
    const el = screen.getByTestId('money');
    // In zh-CN currency format, 1250000 is ¥12,500.00
    expect(el.textContent).toContain('12,500.00');
    expect(el.textContent).toContain('¥');
    expect(el).toHaveClass('tabular-nums font-mono');
  });

  it('applies critical severity styling for negative cash balance', () => {
    render(<Money minor={-2000000} data-testid="negative-money" />);
    const el = screen.getByTestId('negative-money');
    expect(el.textContent).toContain('20,000.00');
    expect(el).toHaveClass('text-severity-critical');
  });

  it('formats zero balance correctly', () => {
    render(<Money minor={0} data-testid="zero-money" />);
    const el = screen.getByTestId('zero-money');
    expect(el.textContent).toContain('0.00');
  });
});
