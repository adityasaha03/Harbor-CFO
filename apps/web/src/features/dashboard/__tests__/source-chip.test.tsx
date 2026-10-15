import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { SourceChip } from '../components/source-chip';
import { METRIC_FORMULAS } from '@/lib/formulas';

describe('SourceChip', () => {
  it('renders an accessible trigger button for a defined formula', () => {
    render(<SourceChip formulaKey="cash" />);
    const button = screen.getByRole('button', {
      name: /inspect calculation for current cash balance/i,
    });
    expect(button).toBeInTheDocument();
  });

  it('opens a dialog detailing the formula and provenance when clicked', async () => {
    const user = userEvent.setup();
    render(<SourceChip formulaKey="floorGap" />);

    const button = screen.getByRole('button', {
      name: /inspect calculation for liquidity floor gap/i,
    });
    await user.click(button);

    // Dialog contents
    expect(await screen.findByText('Deterministic Provenance')).toBeInTheDocument();
    expect(screen.getByText('Liquidity Floor Gap')).toBeInTheDocument();
    expect(screen.getByText(METRIC_FORMULAS.floorGap.formula)).toBeInTheDocument();
    expect(screen.getByText(METRIC_FORMULAS.floorGap.sourceDescription)).toBeInTheDocument();
  });

  it('renders nothing if formulaKey is not found', () => {
    // @ts-expect-error - testing invalid key
    const { container } = render(<SourceChip formulaKey="nonexistent" />);
    expect(container.firstChild).toBeNull();
  });
});
