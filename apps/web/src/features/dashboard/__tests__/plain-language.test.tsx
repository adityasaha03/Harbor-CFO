import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import {
  PlainLanguageProvider,
  usePlainLanguage,
} from '../components/plain-language-context';
import { PlainLanguageToggle } from '../components/plain-language-toggle';

function TestConsumer() {
  const { translate } = usePlainLanguage();
  return (
    <div>
      <p data-testid="term-floor">{translate('liquidity_floor', 'Liquidity Floor')}</p>
      <p data-testid="term-gap">{translate('liquidity_gap', 'Gap to Floor')}</p>
    </div>
  );
}

describe('PlainLanguageContext and PlainLanguageToggle', () => {
  it('toggles plain language terminology across components', () => {
    render(
      <PlainLanguageProvider>
        <PlainLanguageToggle />
        <TestConsumer />
      </PlainLanguageProvider>,
    );

    // Initial state: standard financial terms
    expect(screen.getByTestId('term-floor')).toHaveTextContent('Liquidity Floor');
    expect(screen.getByTestId('term-gap')).toHaveTextContent('Gap to Floor');
    expect(screen.getByTestId('plain-language-toggle')).toHaveTextContent('Plain Language: OFF');

    // Click toggle to turn ON plain language
    fireEvent.click(screen.getByTestId('plain-language-toggle'));

    // Terms translated to plain language
    expect(screen.getByTestId('term-floor')).toHaveTextContent('Emergency Cash Buffer');
    expect(screen.getByTestId('term-gap')).toHaveTextContent('Cash Shortage to Cover');
    expect(screen.getByTestId('plain-language-toggle')).toHaveTextContent('Plain Language: ON');

    // Click toggle again to turn OFF
    fireEvent.click(screen.getByTestId('plain-language-toggle'));
    expect(screen.getByTestId('term-floor')).toHaveTextContent('Liquidity Floor');
    expect(screen.getByTestId('term-gap')).toHaveTextContent('Gap to Floor');
  });
});

