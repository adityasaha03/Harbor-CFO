import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import * as React from 'react';
import { ActivityTimeline } from '../components/activity-timeline';
import type { AgentToolCallRecord } from '@harbor/contracts';

describe('F12 ActivityTimeline Component', () => {
  it('renders tool calls in order with name, duration, and status icon', () => {
    const persistedCalls: AgentToolCallRecord[] = [
      {
        name: 'getCashPosition',
        argsSanitized: {},
        status: 'success',
        durationMs: 45,
        resultRefs: ['account:MAIN'],
      },
      {
        name: 'getForecast',
        argsSanitized: { scenarioId: 'base' },
        status: 'success',
        durationMs: 120,
        resultRefs: ['forecast:latest'],
      },
    ];

    render(
      <ActivityTimeline
        liveEvents={[]}
        persistedToolCalls={persistedCalls}
        status="completed"
      />,
    );

    expect(screen.getByText('getCashPosition')).toBeDefined();
    expect(screen.getByText('45ms')).toBeDefined();
    expect(screen.getByText('getForecast')).toBeDefined();
    expect(screen.getByText('120ms')).toBeDefined();
  });

  it('collapses sanitized args by default and expands on click', () => {
    const persistedCalls: AgentToolCallRecord[] = [
      {
        name: 'matchFinancing',
        argsSanitized: { desiredAmountMinor: 5000000, purpose: 'payroll' },
        status: 'success',
        durationMs: 80,
        resultRefs: [],
      },
    ];

    render(
      <ActivityTimeline
        liveEvents={[]}
        persistedToolCalls={persistedCalls}
        status="completed"
      />,
    );

    // Collapsed by default
    expect(screen.getByText('View parameters')).toBeDefined();
    expect(screen.queryByText(/"purpose": "payroll"/i)).toBeNull();

    // Click to expand
    fireEvent.click(screen.getByText('View parameters'));
    expect(screen.getByText('Hide parameters')).toBeDefined();
    expect(screen.getByText(/"purpose": "payroll"/i)).toBeDefined();
  });

  it('displays empty state when no items and not running', () => {
    render(<ActivityTimeline liveEvents={[]} isRunning={false} />);
    expect(screen.getByText('No tool executions')).toBeDefined();
  });

  it('displays analyzing state when running without items yet', () => {
    render(<ActivityTimeline liveEvents={[]} isRunning={true} />);
    expect(screen.getByText('Initializing reasoning engine...')).toBeDefined();
  });
});
