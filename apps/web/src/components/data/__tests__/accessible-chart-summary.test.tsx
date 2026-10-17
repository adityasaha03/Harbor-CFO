import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { AccessibleChartSummary } from '../accessible-chart-summary';
import type { WeeklyBucket } from '@harbor/contracts';

const MOCK_WEEKLY_BUCKETS: WeeklyBucket[] = [
  {
    startDate: '2026-10-20',
    endDate: '2026-10-27',
    closingMinor: 6_000_000,
    minMinor: 6_000_000,
    receiptsMinor: 2_000_000,
    paymentsMinor: 4_000_000,
    financingMinor: 0,
    feesMinor: 0,
    repaymentsMinor: 0,
  },
  {
    startDate: '2026-10-28',
    endDate: '2026-11-03',
    closingMinor: 2_000_000,
    minMinor: 2_000_000,
    receiptsMinor: 1_000_000,
    paymentsMinor: 5_000_000,
    financingMinor: 0,
    feesMinor: 0,
    repaymentsMinor: 0,
  },
  {
    startDate: '2026-11-04',
    endDate: '2026-11-10',
    closingMinor: -2_000_000,
    minMinor: -2_000_000,
    receiptsMinor: 0,
    paymentsMinor: 4_000_000,
    financingMinor: 0,
    feesMinor: 0,
    repaymentsMinor: 0,
  },
];

describe('AccessibleChartSummary', () => {
  it('renders narrative summary with start, low point, and floor breach information', () => {
    render(
      <AccessibleChartSummary
        weeklyBuckets={MOCK_WEEKLY_BUCKETS}
        floorMinor={3_000_000}
        chartTitle="13-Week Cash Trajectory"
      />,
    );

    expect(screen.getByText(/Screen Reader & Accessible Summary/i)).toBeInTheDocument();
    expect(screen.getByText(/Forecast begins at ¥80,000\.00 on 2026-10-20/i)).toBeInTheDocument();
    expect(screen.getByText(/Projected low point is -¥20,000\.00 on week ending 2026-11-10/i)).toBeInTheDocument();
    expect(screen.getByText(/Policy floor of ¥30,000\.00 is breached across 2 weekly periods/i)).toBeInTheDocument();
  });

  it('toggles accessible tabular alternative table with columns and formatting', () => {
    render(
      <AccessibleChartSummary
        weeklyBuckets={MOCK_WEEKLY_BUCKETS}
        floorMinor={3_000_000}
        chartTitle="13-Week Cash Trajectory"
      />,
    );

    const toggleBtn = screen.getByRole('button', { name: /view tabular alternative/i });
    expect(screen.queryByRole('table')).not.toBeInTheDocument();

    // Click toggle to reveal table
    fireEvent.click(toggleBtn);

    const table = screen.getByRole('table', { name: /13-Week Cash Trajectory Accessible Data Table/i });
    expect(table).toBeInTheDocument();
    expect(screen.getByText('Deficit')).toBeInTheDocument();
    expect(screen.getByText('Below Floor')).toBeInTheDocument();
    expect(screen.getByText('Healthy')).toBeInTheDocument();

    // Click again to hide table
    fireEvent.click(screen.getByRole('button', { name: /hide tabular alternative/i }));
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });
});
