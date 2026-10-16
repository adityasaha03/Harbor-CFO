import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { CompanySettingsForm } from '../components/company-settings-form';
import { BusinessProfileForm } from '../components/business-profile-form';
import { CommitmentsTable } from '../components/commitments-table';
import * as updateSettingsModule from '../api/use-update-settings';
import * as commitmentsModule from '../api/use-commitments';
import type { TenantSettingsDto, CommitmentDto } from '@harbor/contracts';

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

const mockSettings: TenantSettingsDto = {
  id: 'sett_1',
  tenantId: 'org_1',
  reportingCurrency: 'CNY',
  minimumCashMinor: 3000000, // 30,000.00 CNY
  businessTimezone: 'Asia/Shanghai',
  datasetVersion: 1,
  overdueAlertDays: 7,
  concentrationThresholdPct: 40,
  staleDataDays: 14,
  profile: {
    yearsInOperation: 5,
    employeeCount: 20,
    industry: 'Logistics',
    monthlyRevenueMinor: 25000000, // 250,000.00 CNY
    monthlyCardSalesMinor: 8000000, // 80,000.00 CNY
  },
  isDemo: false,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

const mockCommitments: CommitmentDto[] = [
  {
    id: 'comm_1',
    tenantId: 'org_1',
    label: 'Office Rent',
    direction: 'outflow',
    category: 'rent',
    amountMinor: 1200000, // 12,000.00 CNY
    frequency: 'monthly',
    anchorOn: '2026-10-01',
    endOn: '2027-10-01',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'comm_2',
    label: 'Bi-weekly Payroll',
    tenantId: 'org_1',
    direction: 'outflow',
    category: 'payroll',
    amountMinor: 4500000, // 45,000.00 CNY
    frequency: 'biweekly',
    anchorOn: '2026-10-05',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
];

describe('Settings and Profile Forms', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('CompanySettingsForm', () => {
    it('renders formatted major currency amounts from minor units', () => {
      render(<CompanySettingsForm settings={mockSettings} isReadOnly={false} />, {
        wrapper: createWrapper(),
      });

      const floorInput = screen.getByLabelText(/liquidity floor/i) as HTMLInputElement;
      expect(floorInput.value).toBe('30000.00');

      const overdueInput = screen.getByLabelText(/overdue alert/i) as HTMLInputElement;
      expect(overdueInput.value).toBe('7');

      const concentrationInput = screen.getByLabelText(/customer concentration/i) as HTMLInputElement;
      expect(concentrationInput.value).toBe('40');
    });

    it('submits correctly converted minor units on change', async () => {
      const user = userEvent.setup();
      const mutateAsync = vi.fn().mockResolvedValue(mockSettings);
      vi.spyOn(updateSettingsModule, 'useUpdateSettings').mockReturnValue({
        mutateAsync,
        isPending: false,
      } as never);

      render(<CompanySettingsForm settings={mockSettings} isReadOnly={false} />, {
        wrapper: createWrapper(),
      });

      const floorInput = screen.getByLabelText(/liquidity floor/i);
      await user.clear(floorInput);
      await user.type(floorInput, '50000.50');

      const submitButton = screen.getByRole('button', { name: /save changes/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mutateAsync).toHaveBeenCalledWith(
          expect.objectContaining({
            minimumCashMinor: 5000050,
          })
        );
      });
    });

    it('renders in read-only mode for non-owners with disabled inputs and notice', () => {
      render(<CompanySettingsForm settings={mockSettings} isReadOnly={true} />, {
        wrapper: createWrapper(),
      });

      expect(screen.getByText(/you have read-only access/i)).toBeInTheDocument();
      const floorInput = screen.getByLabelText(/liquidity floor/i);
      expect(floorInput).toBeDisabled();
      expect(screen.queryByRole('button', { name: /save changes/i })).not.toBeInTheDocument();
    });
  });

  describe('BusinessProfileForm', () => {
    it('renders profile values and converts revenue to minor units on submit', async () => {
      const user = userEvent.setup();
      const mutateAsync = vi.fn().mockResolvedValue(mockSettings);
      vi.spyOn(updateSettingsModule, 'useUpdateSettings').mockReturnValue({
        mutateAsync,
        isPending: false,
      } as never);

      render(<BusinessProfileForm settings={mockSettings} isReadOnly={false} />, {
        wrapper: createWrapper(),
      });

      const revenueInput = screen.getByLabelText(/average monthly revenue/i) as HTMLInputElement;
      expect(revenueInput.value).toBe('250000.00');

      await user.clear(revenueInput);
      await user.type(revenueInput, '300000.00');

      const submitButton = screen.getByRole('button', { name: /save profile/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mutateAsync).toHaveBeenCalledWith(
          expect.objectContaining({
            profile: expect.objectContaining({
              monthlyRevenueMinor: 30000000,
            }),
          })
        );
      });
    });

    it('renders read-only mode with disabled inputs and no submit button', () => {
      render(<BusinessProfileForm settings={mockSettings} isReadOnly={true} />, {
        wrapper: createWrapper(),
      });

      expect(screen.getByText(/you have read-only access/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/years in operation/i)).toBeDisabled();
      expect(screen.queryByRole('button', { name: /save profile/i })).not.toBeInTheDocument();
    });
  });

  describe('CommitmentsTable', () => {
    it('renders commitments with formatted money and frequency', () => {
      vi.spyOn(commitmentsModule, 'useCommitments').mockReturnValue({
        data: mockCommitments,
        isLoading: false,
        error: null,
      } as never);

      render(<CommitmentsTable isReadOnly={false} />, {
        wrapper: createWrapper(),
      });

      expect(screen.getByText('Office Rent')).toBeInTheDocument();
      expect(screen.getByText('Bi-weekly Payroll')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /add commitment/i })).toBeInTheDocument();
    });

    it('disables add and delete actions in read-only mode', () => {
      vi.spyOn(commitmentsModule, 'useCommitments').mockReturnValue({
        data: mockCommitments,
        isLoading: false,
        error: null,
      } as never);

      render(<CommitmentsTable isReadOnly={true} />, {
        wrapper: createWrapper(),
      });

      expect(screen.getByText(/you have read-only access/i)).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /add commitment/i })).not.toBeInTheDocument();
      expect(screen.queryByLabelText(/delete/i)).not.toBeInTheDocument();
    });
  });
});
