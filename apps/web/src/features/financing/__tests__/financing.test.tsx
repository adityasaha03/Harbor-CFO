import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import * as React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GapHeader } from '../components/gap-header';
import { OfferCard } from '../components/offer-card';
import { ExcludedOffers, formatEligibilityReason } from '../components/excluded-offers';
import { CannotAssessOffers } from '../components/cannot-assess-offers';
import { MatchControls } from '../components/match-controls';
import { FinancingWorkspace } from '../components/financing-workspace';
import { ANCHOR_FINANCING_MATCH } from '../lib/anchor-financing';

// Mock forecast hook
vi.mock('@/features/forecast', () => ({
  useLatestForecast: () => ({
    data: {
      asOfDate: '2026-10-20',
      openingCashMinor: 8_000_000,
      floorMinor: 3_000_000,
      summary: {
        minCashMinor: -2_000_000,
        minCashDate: '2026-11-07',
        firstBelowFloorDate: '2026-10-29',
        firstNegativeDate: '2026-11-03',
        liquidityGapMinor: 5_000_000,
      },
    },
    isLoading: false,
  }),
}));

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
}

function renderWithClient(ui: React.ReactElement) {
  const queryClient = createTestQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>,
  );
}

describe('F09 Financing UI Components & Anchor Verifications', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('formatEligibilityReason mapping', () => {
    it('maps standard code reasons to plain language sentences', () => {
      expect(formatEligibilityReason('FUNDS_TOO_LATE', '')).toContain('Funds arrive after cash first falls below the floor');
      expect(formatEligibilityReason('PURPOSE_NOT_SUPPORTED', '')).toContain('Facility does not support the selected purpose');
      expect(formatEligibilityReason('INVOICE_EVIDENCE_REQUIRED', '')).toContain('requires at least one open, verified accounts receivable');
      expect(formatEligibilityReason('AMOUNT_OUT_OF_RANGE', '')).toContain('falls outside the allowable borrowing range');
      expect(formatEligibilityReason('CURRENCY_UNSUPPORTED', '')).toContain('CNY only');
      expect(formatEligibilityReason('MIN_YEARS_NOT_MET', '')).toContain('minimum operating tenure');
    });
  });

  describe('GapHeader Component', () => {
    it('renders "No Cash Gap to Cover" state when requiredGapMinor is 0', () => {
      render(
        <GapHeader
          requiredGapMinor={0}
          breachDate={null}
          floorMinor={3_000_000}
          openingCashMinor={8_000_000}
        />,
      );

      expect(screen.getByText('No Cash Gap to Cover')).toBeInTheDocument();
      expect(screen.getByText('Healthy Liquidity')).toBeInTheDocument();
      expect(screen.getByText(/Current projected cash balance stays above the operating floor/i)).toBeInTheDocument();
    });

    it('renders gap and breach date when liquidity deficit exists', () => {
      render(
        <GapHeader
          requiredGapMinor={5_000_000}
          breachDate="2026-10-29"
          floorMinor={3_000_000}
        />,
      );

      expect(screen.getByText('Required Liquidity Gap')).toBeInTheDocument();
      expect(screen.getByText('¥50,000.00')).toBeInTheDocument();
      expect(screen.getByText('2026-10-29')).toBeInTheDocument();
      expect(screen.getByText('¥30,000.00')).toBeInTheDocument();
    });
  });

  describe('OfferCard Component & Warning Badges', () => {
    const bridgeOffer = ANCHOR_FINANCING_MATCH.eligible[0]!;
    const revolverOffer = ANCHOR_FINANCING_MATCH.eligible[2]!; // Has anyNegativeCash warning

    it('renders bridge-term with suggested 60,000.00 CNY and total cost 3,000.00 CNY without APR', () => {
      render(<OfferCard ranked={bridgeOffer} rankIndex={0} />);

      expect(screen.getByText('Bridge Term Loan')).toBeInTheDocument();
      expect(screen.getByText('Best Recommended Match')).toBeInTheDocument();
      expect(screen.getByText('¥60,000.00')).toBeInTheDocument(); // Principal
      expect(screen.getByText('¥3,000.00')).toBeInTheDocument(); // Total borrowing cost
      expect(screen.getByText('¥58,800.00')).toBeInTheDocument(); // Net proceeds

      // Invariant: Never display APR
      expect(screen.queryByText(/APR/i)).toBeNull();

      // Compare link
      const compareLink = screen.getByRole('link', { name: /Compare in Scenario Studio/i });
      expect(compareLink).toHaveAttribute(
        'href',
        '/scenarios?preset=offer:bridge-term&amount=6000000',
      );
    });

    it('displays Repayment Caution Notice when anyNegativeCash is true', () => {
      render(<OfferCard ranked={revolverOffer} rankIndex={1} />);

      expect(screen.getByText('Repayment Caution Notice')).toBeInTheDocument();
      expect(screen.getByText(/Projected closing balance dips below zero/i)).toBeInTheDocument();
    });

    it('toggles installment schedule table expansion on click', () => {
      render(<OfferCard ranked={bridgeOffer} rankIndex={0} />);

      // Initially schedule table is collapsed
      expect(screen.queryByText('Total Scheduled Repayments')).toBeNull();

      // Click toggle button
      const toggleBtn = screen.getByText(/Repayment Schedule Details/i);
      fireEvent.click(toggleBtn);

      // Now installments table is visible
      expect(screen.getByText('Total Scheduled Repayments')).toBeInTheDocument();
      expect(screen.getByText('#1')).toBeInTheDocument();
      expect(screen.getByText('2026-11-24')).toBeInTheDocument();
    });
  });

  describe('Excluded and CannotAssess Components', () => {
    it('renders excluded section with plain language reasons', () => {
      render(<ExcludedOffers excluded={ANCHOR_FINANCING_MATCH.excluded} />);

      expect(screen.getByText(/Excluded Facilities/i)).toBeInTheDocument();
      expect(screen.getByText('Traditional Commercial Term Loan')).toBeInTheDocument();
      expect(screen.getByText('Equipment Financing Lease')).toBeInTheDocument();
      expect(screen.getByText(/Funds arrive after cash first falls below the floor/i)).toBeInTheDocument();
      expect(screen.getByText(/Facility does not support the selected purpose/i)).toBeInTheDocument();
    });

    it('renders cannot assess section with link to settings', () => {
      render(<CannotAssessOffers cannotAssess={ANCHOR_FINANCING_MATCH.cannotAssess} />);

      expect(screen.getByText(/Pending Profile Attributes/i)).toBeInTheDocument();
      expect(screen.getByText('Merchant Card Advance')).toBeInTheDocument();
      expect(screen.getByText(/Card Settlement Velocity/i)).toBeInTheDocument();

      const settingsLink = screen.getByRole('link', { name: /Configure in Settings/i });
      expect(settingsLink).toHaveAttribute('href', '/settings');
    });
  });

  describe('MatchControls Component', () => {
    it('triggers callback on purpose selection and amount override blur', () => {
      const onChange = vi.fn();
      render(
        <MatchControls
          value={{ purpose: 'working_capital' }}
          onChange={onChange}
        />,
      );

      const amountInput = screen.getByPlaceholderText('e.g. 60,000.00');
      fireEvent.change(amountInput, { target: { value: '75000.00' } });
      fireEvent.blur(amountInput);

      expect(onChange).toHaveBeenCalledWith({
        purpose: 'working_capital',
        desiredAmountMinor: 7_500_000,
      });
    });
  });

  describe('FinancingWorkspace Anchor End-to-End', () => {
    it('renders full workspace matching anchor tenant expectations', async () => {
      renderWithClient(<FinancingWorkspace />);

      // Header metrics
      expect(screen.getByText('Required Liquidity Gap')).toBeInTheDocument();
      expect(screen.getByText('¥50,000.00')).toBeInTheDocument();

      // Eligible cards (loaded via query)
      expect(await screen.findByText('Bridge Term Loan')).toBeInTheDocument();
      expect(screen.getByText('Revolver Flex')).toBeInTheDocument();
      expect(screen.getByText('Invoice Advance Facility')).toBeInTheDocument();

      // Excluded & Cannot assess
      expect(screen.getByText('Traditional Commercial Term Loan')).toBeInTheDocument();
      expect(screen.getByText('Merchant Card Advance')).toBeInTheDocument();

      // Disclaimer
      expect(screen.getByText('Synthetic Decision Support Notice')).toBeInTheDocument();
    });
  });
});
