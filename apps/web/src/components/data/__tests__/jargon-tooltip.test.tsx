import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { JargonTooltip, JARGON_DICTIONARY } from '../jargon-tooltip';

describe('JargonTooltip', () => {
  it('renders term title and provides accessibility role and label', () => {
    render(<JargonTooltip term="liquidity-floor" />);

    const trigger = screen.getByRole('button');
    expect(trigger).toHaveTextContent('Liquidity Floor');
    expect(trigger).toHaveAttribute(
      'aria-label',
      expect.stringContaining('The minimum cash buffer the company must keep'),
    );
  });

  it('renders custom children with dictionary term definition', () => {
    render(
      <JargonTooltip term="ar-aging">
        <span>Overdue Invoices</span>
      </JargonTooltip>,
    );

    const trigger = screen.getByRole('button');
    expect(trigger).toHaveTextContent('Overdue Invoices');
    expect(trigger).toHaveAttribute(
      'aria-label',
      expect.stringContaining('Accounts Receivable (AR) Aging'),
    );
  });

  it('contains definitions for critical competition financial terms', () => {
    expect(JARGON_DICTIONARY['liquidity-floor']).toBeDefined();
    expect(JARGON_DICTIONARY['dso']).toBeDefined();
    expect(JARGON_DICTIONARY['ar-aging']).toBeDefined();
    expect(JARGON_DICTIONARY['customer-concentration']).toBeDefined();
    expect(JARGON_DICTIONARY['bridge-loan']).toBeDefined();
    expect(JARGON_DICTIONARY['revolver']).toBeDefined();
    expect(JARGON_DICTIONARY['fen']).toBeDefined();
  });
});

