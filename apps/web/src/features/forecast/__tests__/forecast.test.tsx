import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import * as React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as forecastHooks from '../api/use-latest-forecast';
import * as forecastDayHooks from '../api/use-forecast-day';
import {
  ForecastView,
  ANCHOR_FORECAST_MOCK,
  getAnchorDayDrilldown,
  type LatestForecastResponse,
} from '../index';

const mockPush = vi.fn();
let mockSearchParams = new URLSearchParams();

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    refresh: vi.fn(),
  }),
  usePathname: () => '/forecast',
  useSearchParams: () => mockSearchParams,
}));

global.ResizeObserver = class ResizeObserver {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
};

describe('Forecast Page and Components (F07)', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    mockSearchParams = new URLSearchParams();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });
  });

  const renderWithClient = (ui: React.ReactElement) => {
    return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
  };

  it('renders anchor breach metrics: first below floor 2026-10-29, first negative 2026-11-03, trough -20,000.00, gap 50,000.00', async () => {
    vi.spyOn(forecastHooks, 'useLatestForecast').mockReturnValue({
      data: ANCHOR_FORECAST_MOCK,
      isLoading: false,
      isPending: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    } as never);

    vi.spyOn(forecastDayHooks, 'useForecastDay').mockReturnValue({
      data: undefined,
      isLoading: false,
      isPending: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    } as never);

    renderWithClient(<ForecastView />);

    // Assert breach summary cards within its container
    const breachContainer = screen.getByTestId('breach-summary-breached');
    expect(breachContainer).toBeInTheDocument();
    expect(within(breachContainer).getByText('2026-10-29')).toBeInTheDocument();
    expect(within(breachContainer).getByText('2026-11-03')).toBeInTheDocument();
    expect(within(breachContainer).getByText('2026-11-10')).toBeInTheDocument();

    // Assert money amounts in breach summary
    expect(within(breachContainer).getByText('-¥20,000.00')).toBeInTheDocument();
    expect(within(breachContainer).getByText('¥50,000.00')).toBeInTheDocument();

    // Assert 13 weekly rows in accessible table
    expect(screen.getByTestId('weekly-forecast-table')).toBeInTheDocument();
    expect(screen.getByTestId('weekly-row-1')).toBeInTheDocument();
    expect(screen.getByTestId('weekly-row-13')).toBeInTheDocument();

    // Assert assumptions panel items
    expect(screen.getByTestId('assumptions-panel')).toBeInTheDocument();
    expect(
      screen.getByText(/Conservative variant: delays overdue receivables by 14 days/i),
    ).toBeInTheDocument();
  });

  it('renders healthy empty-state banner when there is no breach within the horizon', async () => {
    const healthyMock: LatestForecastResponse = {
      ...ANCHOR_FORECAST_MOCK,
      summary: {
        minCashMinor: 4_500_000,
        minCashDate: '2026-11-15',
        firstBelowFloorDate: null,
        firstNegativeDate: null,
        liquidityGapMinor: 0,
        conservativeMinCashMinor: 3_500_000,
      },
    };

    vi.spyOn(forecastHooks, 'useLatestForecast').mockReturnValue({
      data: healthyMock,
      isLoading: false,
      isPending: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    } as never);

    renderWithClient(<ForecastView />);

    expect(screen.getByTestId('breach-summary-healthy')).toBeInTheDocument();
    expect(screen.getByText(/No Liquidity Breach Projected/i)).toBeInTheDocument();
    expect(screen.queryByTestId('breach-summary-breached')).not.toBeInTheDocument();
  });

  it('renders stale warning badge and notice box when isStale is true', async () => {
    const staleMock: LatestForecastResponse = {
      ...ANCHOR_FORECAST_MOCK,
      isStale: true,
      inputVersion: 2,
    };

    vi.spyOn(forecastHooks, 'useLatestForecast').mockReturnValue({
      data: staleMock,
      isLoading: false,
      isPending: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    } as never);

    renderWithClient(<ForecastView />);

    expect(screen.getByTestId('stale-warning-badge')).toBeInTheDocument();
    expect(screen.getByTestId('stale-warning-box')).toBeInTheDocument();
    expect(screen.getByText(/Recent ledger entries or invoice changes have occurred/i)).toBeInTheDocument();
  });

  it('on anchor data the drawer for 2026-11-07 shows the 8,000.00 overhead payment and ends at -20,000.00', async () => {
    mockSearchParams = new URLSearchParams('date=2026-11-07');

    const dayAnchorData = getAnchorDayDrilldown('2026-11-07');

    vi.spyOn(forecastHooks, 'useLatestForecast').mockReturnValue({
      data: ANCHOR_FORECAST_MOCK,
      isLoading: false,
      isPending: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    } as never);

    vi.spyOn(forecastDayHooks, 'useForecastDay').mockReturnValue({
      data: dayAnchorData,
      isLoading: false,
      isPending: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    } as never);

    renderWithClient(<ForecastView />);

    // Drawer is open because URL has date=2026-11-07
    expect(screen.getByTestId('day-drilldown-drawer')).toBeInTheDocument();

    // Closing cash ends at -20,000.00 (-¥20,000.00)
    const closingEl = screen.getByTestId('drilldown-closing-cash');
    expect(closingEl.textContent).toContain('20,000.00');
    expect(closingEl.textContent).toContain('-¥20,000.00');

    // Shows the 8,000.00 overhead payment (¥8,000.00)
    const sourceEl = screen.getByTestId('drilldown-source-COMM-OVERHEAD');
    expect(sourceEl).toBeInTheDocument();
    expect(sourceEl.textContent).toContain('Quarterly overhead');
    expect(sourceEl.textContent).toContain('8,000.00');
    expect(sourceEl.textContent).toContain('COMM-OVERHEAD');
  });

  it('updates URL when user clicks a date drilldown button in the weekly table', async () => {
    vi.spyOn(forecastHooks, 'useLatestForecast').mockReturnValue({
      data: ANCHOR_FORECAST_MOCK,
      isLoading: false,
      isPending: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    } as never);

    renderWithClient(<ForecastView />);

    const drillButton = screen.getByRole('button', {
      name: /Drill down to week 1 ending 2026-10-26/i,
    });
    fireEvent.click(drillButton);

    expect(mockPush).toHaveBeenCalledWith('/forecast?date=2026-10-26');
  });
});
