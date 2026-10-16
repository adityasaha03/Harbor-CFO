import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import * as React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as alertsApiModule from '../api/use-alerts';
import { AlertsPanel } from '../components/alerts-panel';
import { AlertCard } from '../components/alert-card';
import { sortAlerts } from '../lib/sort-alerts';
import type { Alert } from '@harbor/contracts';

const mockMixedAlerts: Alert[] = [
  {
    id: 'alt_info_1',
    ruleId: 'stale_data',
    severity: 'info',
    status: 'open',
    title: 'Financial data freshness warning',
    summary: 'Last bank statement imported 15 days ago.',
    evidence: [],
    firstSeenAt: '2026-10-18T10:00:00Z',
    lastSeenAt: '2026-10-18T10:00:00Z',
  },
  {
    id: 'alt_crit_1',
    ruleId: 'negative_cash',
    severity: 'critical',
    status: 'open',
    title: 'Projected negative closing balance on Day 21',
    summary: 'Cash dips to -CNY 20,000.00 on 2026-11-10.',
    evidence: [
      {
        type: 'forecast',
        id: '2026-11-10',
        label: 'Projected negative closing balance on 2026-11-10',
        amountMinor: -2000000,
      },
    ],
    firstSeenAt: '2026-10-20T08:00:00Z',
    lastSeenAt: '2026-10-20T09:00:00Z',
  },
  {
    id: 'alt_high_1',
    ruleId: 'floor_breach',
    severity: 'high',
    status: 'open',
    title: 'Cash drops below CNY 30,000 policy floor',
    summary: 'Gap to floor is CNY 50,000.00.',
    evidence: [
      {
        type: 'forecast',
        id: '2026-10-29',
        label: 'First below floor date',
        amountMinor: 2800000,
      },
    ],
    firstSeenAt: '2026-10-20T08:00:00Z',
    lastSeenAt: '2026-10-20T08:30:00Z',
  },
  {
    id: 'alt_med_1',
    ruleId: 'customer_concentration',
    severity: 'medium',
    status: 'open',
    title: 'Customer concentration exceeds policy threshold',
    summary: 'Apex Distribution holds 66.7% of receivables.',
    evidence: [
      {
        type: 'counterparty',
        id: 'CUST-APEX',
        label: 'Apex Distribution concentration',
      },
    ],
    firstSeenAt: '2026-10-20T08:00:00Z',
    lastSeenAt: '2026-10-20T08:00:00Z',
  },
  {
    id: 'alt_resolved_1',
    ruleId: 'overdue_receivable',
    severity: 'high',
    status: 'resolved',
    title: 'Overdue invoice settled',
    summary: 'Invoice INV-2026-001 has been collected.',
    evidence: [
      {
        type: 'invoice',
        id: 'INV-2026-001',
        label: 'Collected receivable',
        amountMinor: 1000000,
      },
    ],
    firstSeenAt: '2026-10-10T08:00:00Z',
    lastSeenAt: '2026-10-15T08:00:00Z',
    resolvedAt: '2026-10-16T08:00:00Z',
  },
];

describe('F08 Alerts Workspace and Components', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
  });

  const renderWithClient = (ui: React.ReactElement) => {
    return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
  };

  it('sorts alerts strictly by severity: critical > high > medium > info', () => {
    const sorted = sortAlerts(mockMixedAlerts);
    expect(sorted.map((a) => a.severity)).toEqual([
      'critical',
      'high',
      'high',
      'medium',
      'info',
    ]);
  });

  it('renders open alerts sorted by severity and shows filter counts', () => {
    vi.spyOn(alertsApiModule, 'useAlerts').mockReturnValue({
      data: mockMixedAlerts,
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
      isRefetching: false,
    } as never);

    renderWithClient(<AlertsPanel />);

    // Count badges: 4 open, 1 resolved
    expect(screen.getByTestId('filter-open-tab')).toHaveTextContent('4');
    expect(screen.getByTestId('filter-resolved-tab')).toHaveTextContent('1');

    // List rendering order
    const list = screen.getByTestId('alerts-list');
    const cards = within(list).getAllByTestId(/^alert-card-/);
    expect(cards).toHaveLength(4);

    // Top card is critical negative cash
    expect(cards[0]).toHaveTextContent('Projected negative closing balance on Day 21');
    expect(cards[1]).toHaveTextContent('Cash drops below CNY 30,000 policy floor');
    expect(cards[2]).toHaveTextContent('Customer concentration exceeds policy threshold');
    expect(cards[3]).toHaveTextContent('Financial data freshness warning');
  });

  it('filters by resolved alerts when the Resolved tab is clicked', () => {
    vi.spyOn(alertsApiModule, 'useAlerts').mockReturnValue({
      data: mockMixedAlerts,
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
      isRefetching: false,
    } as never);

    renderWithClient(<AlertsPanel />);

    const resolvedTab = screen.getByTestId('filter-resolved-tab');
    fireEvent.click(resolvedTab);

    const list = screen.getByTestId('alerts-list');
    const cards = within(list).getAllByTestId(/^alert-card-/);
    expect(cards).toHaveLength(1);
    expect(cards[0]).toHaveTextContent('Overdue invoice settled');
    expect(cards[0]).toHaveTextContent('Resolved');
  });

  it('renders empty state when there are no open alerts', () => {
    vi.spyOn(alertsApiModule, 'useAlerts').mockReturnValue({
      data: [mockMixedAlerts[4]], // only resolved alert
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
      isRefetching: false,
    } as never);

    renderWithClient(<AlertsPanel />);

    expect(screen.getByTestId('alerts-empty-state')).toBeInTheDocument();
    expect(screen.getByText('No open alerts')).toBeInTheDocument();
    expect(screen.getByText(/All liquidity floor, cash runway/i)).toBeInTheDocument();
  });

  it('renders supporting evidence with forecast drilldown link', () => {
    const alert = mockMixedAlerts[1]!;
    renderWithClient(<AlertCard alert={alert} />);

    expect(screen.getByTestId('alert-evidence-list')).toBeInTheDocument();
    expect(screen.getByText('FORECAST: 2026-11-10')).toBeInTheDocument();
    expect(screen.getByText('-¥20,000.00')).toBeInTheDocument();

    const link = screen.getByTestId('evidence-forecast-link');
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', '/forecast?date=2026-11-10');
  });

  it('renders invoice and counterparty evidence types properly', () => {
    const invoiceAlert = mockMixedAlerts[4]!;
    renderWithClient(<AlertCard alert={invoiceAlert} />);

    expect(screen.getByText('INVOICE: INV-2026-001')).toBeInTheDocument();
    expect(screen.getByText('¥10,000.00')).toBeInTheDocument();
  });

  it('does NOT contain dismiss or acknowledge buttons (out of scope)', () => {
    vi.spyOn(alertsApiModule, 'useAlerts').mockReturnValue({
      data: mockMixedAlerts,
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
      isRefetching: false,
    } as never);

    renderWithClient(<AlertsPanel />);

    expect(screen.queryByRole('button', { name: /dismiss/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /acknowledge/i })).not.toBeInTheDocument();
  });
});
