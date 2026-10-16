import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import * as React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as authFeature from '@/features/auth';
import * as createScenarioApi from '../api/use-create-scenario';
import { RepaymentWarning } from '../components/repayment-warning';
import { StaleBanner } from '../components/stale-banner';
import { ComparisonMetrics } from '../components/comparison-metrics';
import { ScenarioStudio } from '../components/scenario-studio';
import type { ScenarioComparison, CreateScenarioResponse } from '@harbor/contracts';

// Mock useRouter and useSearchParams from next/navigation
const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
  useSearchParams: () => new URLSearchParams(''),
}));

// Mock ResizeObserver for Recharts
class MockResizeObserver {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
}
window.ResizeObserver = MockResizeObserver;

const mockBridgeComparison: ScenarioComparison = {
  baselineSummary: {
    minCashMinor: -2000000,
    minCashDate: '2026-11-07',
    liquidityGapMinor: 3000000,
    firstBelowFloorDate: '2026-10-28',
    firstNegativeDate: '2026-11-05',
    conservativeMinCashMinor: -3500000,
  },
  scenarioSummary: {
    minCashMinor: 880000,
    minCashDate: '2026-12-08',
    liquidityGapMinor: 0,
    firstBelowFloorDate: '2026-12-08',
    firstNegativeDate: null,
    conservativeMinCashMinor: 0,
  },
  cashAtDays: [
    { day: 7, date: '2026-10-23', baselineClosingMinor: 2500000, scenarioClosingMinor: 2500000, deltaMinor: 0 },
    { day: 14, date: '2026-10-30', baselineClosingMinor: 1500000, scenarioClosingMinor: 1500000, deltaMinor: 0 },
    { day: 21, date: '2026-11-06', baselineClosingMinor: -120000, scenarioClosingMinor: 3880000, deltaMinor: 4000000 },
    { day: 30, date: '2026-11-15', baselineClosingMinor: 500000, scenarioClosingMinor: 4500000, deltaMinor: 4000000 },
    { day: 60, date: '2026-12-15', baselineClosingMinor: 2000000, scenarioClosingMinor: 1820000, deltaMinor: -180000 },
    { day: 90, date: '2027-01-14', baselineClosingMinor: 3000000, scenarioClosingMinor: 2820000, deltaMinor: -180000 },
  ],
  deltas: {
    minCashMinor: 2880000,
    day21CashMinor: 4000000,
    liquidityGapMinor: -3000000,
  },
  changedDates: {
    firstBelowFloorDate: '2026-12-08',
    firstNegativeDate: null,
    minCashDate: '2026-12-08',
    firstBelowFloorChanged: true,
    firstNegativeChanged: true,
    minCashDateChanged: true,
  },
  financing: {
    principalMinor: 6000000,
    netProceedsMinor: 5880000,
    totalCostMinor: 300000,
    repaymentsTotalMinor: 6180000,
    repaymentWarnings: [
      {
        date: '2026-12-08',
        type: 'floor_breach',
        closingMinor: 880000,
        message: 'Near-term cash improves, but repayments cause a shortfall on 2026-12-08',
      },
    ],
  },
  anyNegativeCash: false,
  points: [
    { date: '2026-10-16', dayIndex: 0, baselineClosingMinor: 2000000, scenarioClosingMinor: 2000000, floorMinor: 1000000 },
    { date: '2026-11-06', dayIndex: 21, baselineClosingMinor: -120000, scenarioClosingMinor: 3880000, floorMinor: 1000000 },
  ],
};

const mockCreateScenarioResponse: CreateScenarioResponse = {
  ...mockBridgeComparison,
  scenarioId: 'scen_bridge_01',
  isStale: false,
  scenario: {
    id: 'scen_bridge_01',
    tenantId: 'tenant_1',
    name: 'Bridge loan',
    baseInputVersion: 1,
    changes: [{ type: 'add_financing', offerCode: 'bridge-term', principalMinor: 6000000 }],
    scenarioHash: 'hash123',
    comparison: mockBridgeComparison,
    isStale: false,
    createdBy: 'usr_owner',
    expiresAt: '2026-10-17T00:00:00Z',
    createdAt: '2026-10-16T00:00:00Z',
    updatedAt: '2026-10-16T00:00:00Z',
  },
};

function renderWithClient(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

describe('F10 Scenario Results, Metrics & Warnings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(authFeature, 'usePermission').mockReturnValue(true);
  });

  describe('RepaymentWarning', () => {
    it('renders warning banner with exact anchor message and date', () => {
      render(
        <RepaymentWarning
          warnings={[
            {
              date: '2026-12-08',
              type: 'floor_breach',
              closingMinor: 880000,
              message: 'Near-term cash improves, but repayments cause a shortfall on 2026-12-08',
            },
          ]}
        />,
      );

      expect(screen.getByTestId('repayment-warning')).toBeInTheDocument();
      expect(screen.getByTestId('repayment-warning-message')).toHaveTextContent(
        'Near-term cash improves, but repayments cause a shortfall on 2026-12-08',
      );
      expect(screen.getAllByText(/2026-12-08/)[0]).toBeInTheDocument();
    });

    it('renders nothing when warnings array is empty', () => {
      const { container } = render(<RepaymentWarning warnings={[]} />);
      expect(container.firstChild).toBeNull();
    });
  });

  describe('StaleBanner', () => {
    it('renders and invokes onRegenerate callback', () => {
      const onRegenerate = vi.fn();
      render(<StaleBanner onRegenerate={onRegenerate} isRegenerating={false} />);

      expect(screen.getByTestId('stale-banner')).toHaveTextContent(/Scenario data is stale/i);
      fireEvent.click(screen.getByTestId('regenerate-scenario-btn'));
      expect(onRegenerate).toHaveBeenCalledTimes(1);
    });
  });

  describe('ComparisonMetrics (Anchor Numbers)', () => {
    it('shows Bridge remedy anchor values: day-21 cash ¥38,800.00 and cost ¥3,000.00', () => {
      render(<ComparisonMetrics comparison={mockBridgeComparison} />);

      const day21Row = screen.getByTestId('metric-day21-cash');
      expect(day21Row).toHaveTextContent('38,800.00');

      const financingCostRow = screen.getByTestId('metric-financing-cost');
      expect(financingCostRow).toHaveTextContent('3,000.00');

      const milestoneRow21 = screen.getByTestId('milestone-row-21');
      expect(milestoneRow21).toHaveTextContent('38,800.00');
    });

    it('highlights changed dates with badge', () => {
      render(<ComparisonMetrics comparison={mockBridgeComparison} />);

      expect(screen.getByTestId('changed-date-badge-min-cash')).toHaveTextContent('Date Shifted');
      expect(screen.getByTestId('changed-date-badge-floor')).toHaveTextContent('Changed');
    });
  });

  describe('ScenarioStudio Integration', () => {
    it('displays reviewer read-only notice and disables simulate button when scenarios:write is false', () => {
      vi.spyOn(authFeature, 'usePermission').mockImplementation((perm) => {
        if (perm === 'scenarios:write') return false;
        return true;
      });

      renderWithClient(<ScenarioStudio />);

      expect(screen.getByTestId('reviewer-readonly-notice')).toHaveTextContent(
        'Reviewers have read-only access and cannot create scenarios.',
      );
      expect(screen.getByTestId('run-scenario-btn')).toBeDisabled();
    });

    it('simulates scenario and displays action proposal button when financing remedy is simulated', async () => {
      const mutateAsync = vi.fn().mockResolvedValue(mockCreateScenarioResponse);
      vi.spyOn(createScenarioApi, 'useCreateScenario').mockReturnValue({
        mutateAsync,
        isPending: false,
      } as unknown as ReturnType<typeof createScenarioApi.useCreateScenario>);

      renderWithClient(<ScenarioStudio />);

      // Select Bridge Loan preset
      fireEvent.click(screen.getByTestId('preset-btn-bridge-loan'));
      expect(screen.getByTestId('change-list')).toHaveTextContent('bridge-term');

      // Click Simulate Scenario
      fireEvent.click(screen.getByTestId('run-scenario-btn'));

      await waitFor(() => {
        expect(mutateAsync).toHaveBeenCalled();
        expect(screen.getByTestId('scenario-results')).toBeInTheDocument();
      });

      // Shows action proposal button
      const proposalBtn = screen.getByTestId('create-action-proposal-btn');
      expect(proposalBtn).toBeInTheDocument();
      fireEvent.click(proposalBtn);
      expect(mockPush).toHaveBeenCalledWith('/actions?scenarioId=scen_bridge_01');
    });
  });
});
