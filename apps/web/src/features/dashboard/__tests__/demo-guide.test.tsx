import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { DemoGuide } from '../components/demo-guide';

describe('DemoGuide', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('renders closed-loop story steps and the three demo accounts', () => {
    render(<DemoGuide />);

    // Renders title and competition badge
    expect(screen.getByText('Competition Demo & Story Guide')).toBeInTheDocument();
    expect(screen.getByText('Topic E')).toBeInTheDocument();

    // Renders the 5 story steps
    expect(screen.getByText('1. Observe')).toBeInTheDocument();
    expect(screen.getByText('2. Diagnose')).toBeInTheDocument();
    expect(screen.getByText('3. Plan')).toBeInTheDocument();
    expect(screen.getByText('4. Approve')).toBeInTheDocument();
    expect(screen.getByText('5. Verify')).toBeInTheDocument();

    // Renders the 3 demo accounts
    expect(screen.getByText('owner@harbor.local')).toBeInTheDocument();
    expect(screen.getByText('employee@harbor.local')).toBeInTheDocument();
    expect(screen.getByText('reviewer@harbor.local')).toBeInTheDocument();
  });

  it('can be dismissed and restored', () => {
    render(<DemoGuide />);

    // Initially open
    expect(screen.getByTestId('demo-guide-panel')).toBeInTheDocument();

    // Click dismiss button
    const dismissBtn = screen.getByLabelText('Dismiss demo guide');
    fireEvent.click(dismissBtn);

    // Main panel is hidden and restore button is displayed
    expect(screen.queryByTestId('demo-guide-panel')).not.toBeInTheDocument();
    const restoreBtn = screen.getByTestId('show-demo-guide-btn');
    expect(restoreBtn).toBeInTheDocument();

    // Click restore button
    fireEvent.click(restoreBtn);

    // Panel is restored
    expect(screen.getByTestId('demo-guide-panel')).toBeInTheDocument();
  });

  it('copies email to clipboard when copy button is clicked', async () => {
    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, {
      clipboard: {
        writeText: writeTextMock,
      },
    });

    render(<DemoGuide />);

    const copyOwnerBtn = screen.getByLabelText('Copy owner@harbor.local');
    fireEvent.click(copyOwnerBtn);

    expect(writeTextMock).toHaveBeenCalledWith('owner@harbor.local');
  });
});

