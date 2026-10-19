import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { DemoGuide } from '../components/demo-guide';

describe('DemoGuide', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('can be restored and dismissed', () => {
    render(<DemoGuide />);

    // Initially collapsed with restore button
    const restoreBtn = screen.getByTestId('show-demo-guide-btn');
    expect(restoreBtn).toBeInTheDocument();

    // Click restore button to expand panel
    fireEvent.click(restoreBtn);

    // Panel is opened
    expect(screen.getByTestId('demo-guide-panel')).toBeInTheDocument();
    expect(screen.getByText('Competition Demo & Story Guide')).toBeInTheDocument();

    // Renders the 5 story steps
    expect(screen.getByText('1. Observe')).toBeInTheDocument();
    expect(screen.getByText('2. Diagnose')).toBeInTheDocument();
    expect(screen.getByText('3. Plan')).toBeInTheDocument();
    expect(screen.getByText('4. Approve')).toBeInTheDocument();
    expect(screen.getByText('5. Verify')).toBeInTheDocument();

    // Click dismiss button
    const dismissBtn = screen.getByLabelText('Dismiss demo guide');
    fireEvent.click(dismissBtn);

    // Main panel is hidden and restore button is displayed again
    expect(screen.queryByTestId('demo-guide-panel')).not.toBeInTheDocument();
    expect(screen.getByTestId('show-demo-guide-btn')).toBeInTheDocument();
  });
});

