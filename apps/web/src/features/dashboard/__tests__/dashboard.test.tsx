import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DashboardView } from '../components/dashboard-view';
import * as forecastFeature from '@/features/forecast';
import * as analyticsFeature from '@/features/analytics';
import * as alertsFeature from '@/features/alerts';

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
  }),
}));

// Mock ResizeObserver for Recharts in JSDOM
global.ResizeObserver = class ResizeObserver {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
};

describe('DashboardView', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });
  });

  const renderWithClient = (ui: React.ReactElement) => {
    return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
  };

  it('renders anchor demo values: dipping to -20,000.00, floor 30,000.00, gap 50,000.00, concentration 66.7%', async () => {
    vi.spyOn(forecastFeature, 'useLatestForecast').mockReturnValue({
      data: forecastFeature.ANCHOR_FORECAST_MOCK,
      isLoading: false,
      isPending: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    } as never);

    vi.spyOn(analyticsFeature, 'useAnalyticsSummary').mockReturnValue({
      data: analyticsFeature.ANCHOR_ANALYTICS_MOCK,
      isLoading: false,
      isPending: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    } as never);

    vi.spyOn(alertsFeature, 'useAlerts').mockReturnValue({
      data: alertsFeature.ANCHOR_ALERTS_MOCK,
      isLoading: false,
      isPending: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    } as never);

    renderWithClient(<DashboardView />);

    // Check top alert banner
    expect(
      screen.getByText('Severe cash floor breach projected on Day 21'),
    ).toBeInTheDocument();

    // Check Current Cash (¥80,000.00)
    expect(screen.getByText('¥80,000.00')).toBeInTheDocument();

    // Check Liquidity Floor (¥30,000.00)
    expect(screen.getByText('¥30,000.00')).toBeInTheDocument();

    // Check Day 21 Lowest projected cash (-¥20,000.00) and date
    expect(screen.getByText('-¥20,000.00')).toBeInTheDocument();
    expect(screen.getByText(/Projected on 2026-11-10/i)).toBeInTheDocument();

    // Check Liquidity Gap (¥50,000.00)
    expect(screen.getByText('¥50,000.00')).toBeInTheDocument();

    // Check Concentration 66.7% and Top Customer
    expect(screen.getAllByText('66.7%').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Apex Distribution Ltd')).toBeInTheDocument();
    expect(screen.getByText(/Exceeds 40% Threshold/i)).toBeInTheDocument();

    // Verify synthetic badge is removed
    expect(screen.queryByText(/Synthetic Demo Data/i)).not.toBeInTheDocument();
  });

  it('renders "No breach within 91 days" when in healthy condition (never "infinite runway")', () => {
    const noBreachForecast: forecastFeature.LatestForecastResponse = {
      ...forecastFeature.ANCHOR_FORECAST_MOCK,
      openingCashMinor: 10000000,
      floorMinor: 3000000,
      summary: {
        minCashMinor: 4500000,
        minCashDate: '2026-11-20',
        firstBelowFloorDate: null,
        firstNegativeDate: null,
        liquidityGapMinor: 0,
      },
    };

    vi.spyOn(forecastFeature, 'useLatestForecast').mockReturnValue({
      data: noBreachForecast,
      isLoading: false,
      isPending: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    } as never);

    vi.spyOn(analyticsFeature, 'useAnalyticsSummary').mockReturnValue({
      data: analyticsFeature.ANCHOR_ANALYTICS_MOCK,
      isLoading: false,
      isPending: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    } as never);

    vi.spyOn(alertsFeature, 'useAlerts').mockReturnValue({
      data: [],
      isLoading: false,
      isPending: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    } as never);

    renderWithClient(<DashboardView />);

    // Should display "No breach within 91 days"
    const noBreachElements = screen.getAllByText('No breach within 91 days');
    expect(noBreachElements.length).toBeGreaterThanOrEqual(1);

    // Invariant: never say "infinite runway"
    expect(screen.queryByText(/infinite runway/i)).toBeNull();
  });

  it('renders loading skeletons while queries are in-flight', () => {
    vi.spyOn(forecastFeature, 'useLatestForecast').mockReturnValue({
      data: undefined,
      isLoading: true,
      isPending: true,
      isError: false,
      error: null,
      refetch: vi.fn(),
    } as never);

    vi.spyOn(analyticsFeature, 'useAnalyticsSummary').mockReturnValue({
      data: undefined,
      isLoading: true,
      isPending: true,
      isError: false,
      error: null,
      refetch: vi.fn(),
    } as never);

    vi.spyOn(alertsFeature, 'useAlerts').mockReturnValue({
      data: undefined,
      isLoading: true,
      isPending: true,
      isError: false,
      error: null,
      refetch: vi.fn(),
    } as never);

    renderWithClient(<DashboardView />);

    expect(screen.getByTestId('dashboard-loading')).toBeInTheDocument();
  });

  it('renders error state on query failure', () => {
    vi.spyOn(forecastFeature, 'useLatestForecast').mockReturnValue({
      data: undefined,
      isLoading: false,
      isPending: false,
      isError: true,
      error: new Error('Network timeout'),
      refetch: vi.fn(),
    } as never);

    vi.spyOn(analyticsFeature, 'useAnalyticsSummary').mockReturnValue({
      data: undefined,
      isLoading: false,
      isPending: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    } as never);

    vi.spyOn(alertsFeature, 'useAlerts').mockReturnValue({
      data: [],
      isLoading: false,
      isPending: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    } as never);

    renderWithClient(<DashboardView />);

    expect(screen.getByText('Failed to load dashboard')).toBeInTheDocument();
    expect(screen.getByText('Network timeout')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
  });

  it('renders "Awaiting Data Import" empty state for health score when zero data is committed', () => {
    const zeroDataAnalytics = {
      ...analyticsFeature.ANCHOR_ANALYTICS_MOCK,
      lastImportAt: null,
      arAging: { currentMinor: 0, days1to30Minor: 0, days31to60Minor: 0, days61to90Minor: 0, daysOver90Minor: 0, totalMinor: 0 },
      apAging: { currentMinor: 0, days1to30Minor: 0, days31to60Minor: 0, days61to90Minor: 0, daysOver90Minor: 0, totalMinor: 0 },
      dataCompleteness: {
        lastImportAt: null,
        invoiceCount: 0,
        ledgerCount: 0,
        warnings: ['No invoices on file.', 'No ledger entries on file.'],
      },
    };

    vi.spyOn(forecastFeature, 'useLatestForecast').mockReturnValue({
      data: forecastFeature.ANCHOR_FORECAST_MOCK,
      isLoading: false,
      isPending: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    } as never);

    vi.spyOn(analyticsFeature, 'useAnalyticsSummary').mockReturnValue({
      data: zeroDataAnalytics,
      isLoading: false,
      isPending: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    } as never);

    vi.spyOn(alertsFeature, 'useAlerts').mockReturnValue({
      data: [],
      isLoading: false,
      isPending: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    } as never);

    renderWithClient(<DashboardView />);

    expect(screen.getByText('Awaiting Data Import')).toBeInTheDocument();
    expect(screen.getByText(/Upload bank ledger transactions or invoices/i)).toBeInTheDocument();
  });
});
