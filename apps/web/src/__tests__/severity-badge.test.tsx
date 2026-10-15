import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SeverityBadge } from '@/components/data/severity-badge';

describe('SeverityBadge component', () => {
  it('renders critical severity with correct styling', () => {
    render(<SeverityBadge severity="critical" data-testid="crit-badge" />);
    const el = screen.getByTestId('crit-badge');
    expect(el.textContent).toBe('critical');
    expect(el.className).toContain('text-red-800');
  });

  it('renders high severity with correct styling', () => {
    render(<SeverityBadge severity="high" data-testid="high-badge" />);
    const el = screen.getByTestId('high-badge');
    expect(el.textContent).toBe('high');
    expect(el.className).toContain('text-orange-800');
  });

  it('renders medium severity with correct styling', () => {
    render(<SeverityBadge severity="medium" data-testid="med-badge" />);
    const el = screen.getByTestId('med-badge');
    expect(el.textContent).toBe('medium');
    expect(el.className).toContain('text-amber-800');
  });

  it('renders info severity with custom label', () => {
    render(
      <SeverityBadge severity="info" data-testid="info-badge">
        Information
      </SeverityBadge>,
    );
    const el = screen.getByTestId('info-badge');
    expect(el.textContent).toBe('Information');
    expect(el.className).toContain('text-sky-800');
  });
});
