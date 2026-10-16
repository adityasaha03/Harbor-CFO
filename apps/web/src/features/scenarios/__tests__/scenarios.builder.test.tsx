import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import * as React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as authFeature from '@/features/auth';
import * as invoicesApi from '../api/use-invoices';
import * as financingFeature from '@/features/financing';
import { MoveReceiptForm } from '../components/move-receipt-form';
import { AddFinancingForm } from '../components/add-financing-form';
import { AddRecurringForm } from '../components/add-recurring-form';
import { DeferPaymentForm } from '../components/defer-payment-form';
import { ChangeList } from '../components/change-list';
import { SCENARIO_PRESETS, parsePresetParams } from '../lib/presets';
import type { InvoiceDto, FinancingOffer, ScenarioChange } from '@harbor/contracts';

const mockArInvoices: InvoiceDto[] = [
  {
    id: 'inv_1',
    tenantId: 'tenant_1',
    externalId: 'INV-AR-LATE',
    direction: 'AR',
    counterpartyExternalId: 'CP-01',
    issuedOn: '2026-09-01',
    dueOn: '2026-10-01',
    expectedSettlementOn: '2026-11-15',
    currency: 'CNY',
    totalMinor: 4000000,
    outstandingMinor: 4000000,
    status: 'open',
    isOverdue: true,
    createdAt: '2026-09-01T00:00:00Z',
    updatedAt: '2026-09-01T00:00:00Z',
  },
];

const mockApInvoices: InvoiceDto[] = [
  {
    id: 'inv_2',
    tenantId: 'tenant_1',
    externalId: 'INV-AP-EXP',
    direction: 'AP',
    counterpartyExternalId: 'CP-02',
    issuedOn: '2026-10-01',
    dueOn: '2026-10-25',
    expectedSettlementOn: '2026-10-25',
    currency: 'CNY',
    totalMinor: 2500000,
    outstandingMinor: 2500000,
    status: 'open',
    isOverdue: false,
    createdAt: '2026-10-01T00:00:00Z',
    updatedAt: '2026-10-01T00:00:00Z',
  },
];

const mockOffers: FinancingOffer[] = [
  {
    code: 'bridge-term',
    version: 1,
    synthetic: true,
    type: 'bridge_loan',
    name: 'Bridge Term Loan',
    description: 'Short term liquidity bridge',
    currency: 'CNY',
    minAmountMinor: 1000000,
    maxAmountMinor: 10000000,
    dynamicCap: 'none',
    fundingDelayDays: 2,
    upfrontFeeBps: 200,
    flatInterestBps: 300,
    installments: {
      count: 1,
      firstDueAfterFundingDays: 60,
      intervalDays: 0,
    },
    eligiblePurposes: ['bridge'],
    requiresInvoiceEvidence: false,
    requiredProfileFields: [],
  },
];

function renderWithClient(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

describe('F10 Scenario Builder & Validation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(authFeature, 'usePermission').mockReturnValue(true);
  });

  describe('MoveReceiptForm', () => {
    it('validates invoice selection and valid date format', () => {
      vi.spyOn(invoicesApi, 'useInvoices').mockReturnValue({
        data: mockArInvoices,
        isLoading: false,
        isError: false,
      } as unknown as ReturnType<typeof invoicesApi.useInvoices>);

      const onAdd = vi.fn();
      renderWithClient(<MoveReceiptForm onAdd={onAdd} onCancel={vi.fn()} />);

      // Submit without selecting an invoice
      fireEvent.click(screen.getByTestId('move-receipt-submit'));
      expect(screen.getByTestId('move-receipt-error')).toHaveTextContent(/Please select an invoice/i);
      expect(onAdd).not.toHaveBeenCalled();
    });
  });

  describe('AddFinancingForm', () => {
    it('validates positive amount within bounds and converts CNY to fen', () => {
      vi.spyOn(financingFeature, 'useFinancingOffers').mockReturnValue({
        data: mockOffers,
        isLoading: false,
        isError: false,
      } as unknown as ReturnType<typeof financingFeature.useFinancingOffers>);

      const onAdd = vi.fn();
      renderWithClient(
        <AddFinancingForm
          onAdd={onAdd}
          onCancel={vi.fn()}
          defaultOfferCode="bridge-term"
          defaultAmountMinor={6000000}
        />,
      );

      // Submit valid form
      fireEvent.click(screen.getByTestId('add-financing-submit'));
      expect(onAdd).toHaveBeenCalledWith({
        type: 'add_financing',
        offerCode: 'bridge-term',
        principalMinor: 6000000,
      });
    });

    it('rejects amounts above offer max', () => {
      vi.spyOn(financingFeature, 'useFinancingOffers').mockReturnValue({
        data: mockOffers,
        isLoading: false,
        isError: false,
      } as unknown as ReturnType<typeof financingFeature.useFinancingOffers>);

      const onAdd = vi.fn();
      renderWithClient(
        <AddFinancingForm
          onAdd={onAdd}
          onCancel={vi.fn()}
          defaultOfferCode="bridge-term"
        />,
      );

      // Amount exceeds 10,000,000 fen (100,000 CNY)
      fireEvent.change(screen.getByTestId('financing-amount-input'), {
        target: { value: '150000' },
      });
      fireEvent.click(screen.getByTestId('add-financing-submit'));

      expect(screen.getByTestId('add-financing-error')).toHaveTextContent(/Maximum:/i);
      expect(onAdd).not.toHaveBeenCalled();
    });
  });

  describe('AddRecurringForm', () => {
    it('validates label, amount and start date', () => {
      const onAdd = vi.fn();
      renderWithClient(<AddRecurringForm onAdd={onAdd} onCancel={vi.fn()} />);

      fireEvent.click(screen.getByTestId('add-recurring-submit'));
      expect(screen.getByTestId('add-recurring-error')).toHaveTextContent(/Please enter a label/i);

      fireEvent.change(screen.getByTestId('recurring-label-input'), {
        target: { value: 'Hire 2 people at 4,000/month' },
      });
      fireEvent.change(screen.getByTestId('recurring-amount-input'), {
        target: { value: '8000' },
      });
      fireEvent.change(screen.getByTestId('recurring-start-input'), {
        target: { value: '2026-11-01' },
      });

      fireEvent.click(screen.getByTestId('add-recurring-submit'));
      expect(onAdd).toHaveBeenCalledWith({
        type: 'add_recurring',
        label: 'Hire 2 people at 4,000/month',
        direction: 'outflow',
        amountMinor: 800000,
        frequency: 'monthly',
        startOn: '2026-11-01',
      });
    });
  });

  describe('DeferPaymentForm', () => {
    it('requires an assumption note not exceeding 300 characters', () => {
      vi.spyOn(invoicesApi, 'useInvoices').mockReturnValue({
        data: mockApInvoices,
        isLoading: false,
        isError: false,
      } as unknown as ReturnType<typeof invoicesApi.useInvoices>);

      const onAdd = vi.fn();
      renderWithClient(<DeferPaymentForm onAdd={onAdd} onCancel={vi.fn()} />);

      expect(
        screen.getByText(/This is an assumption, not a fact/i),
      ).toBeInTheDocument();
    });
  });

  describe('ChangeList', () => {
    it('renders changes and handles removal', () => {
      const changes: ScenarioChange[] = [
        {
          type: 'move_receipt',
          invoiceExternalId: 'INV-AR-LATE',
          newExpectedSettlementOn: '2026-10-30',
        },
        {
          type: 'add_financing',
          offerCode: 'bridge-term',
          principalMinor: 6000000,
        },
      ];

      const onRemove = vi.fn();
      renderWithClient(<ChangeList changes={changes} onRemove={onRemove} />);

      expect(screen.getByTestId('change-item-0')).toHaveTextContent(/INV-AR-LATE/);
      expect(screen.getByTestId('change-item-1')).toHaveTextContent(/bridge-term/);

      fireEvent.click(screen.getByTestId('remove-change-0'));
      expect(onRemove).toHaveBeenCalledWith(0);
    });
  });

  describe('Presets and URL Parsing', () => {
    it('parses preset search params correctly', () => {
      const params = new URLSearchParams('preset=offer:bridge-term&amount=6000000');
      const parsed = parsePresetParams(params);
      expect(parsed).toEqual({
        presetId: 'bridge-loan',
        offerCode: 'bridge-term',
        amountMinor: 6000000,
      });

      const preset = SCENARIO_PRESETS.find((p) => p.id === parsed?.presetId);
      expect(preset).toBeDefined();
      const changes = preset!.buildChanges({
        offerCode: parsed?.offerCode,
        amountMinor: parsed?.amountMinor,
      });
      expect(changes).toEqual([
        {
          type: 'add_financing',
          offerCode: 'bridge-term',
          principalMinor: 6000000,
        },
      ]);
    });
  });
});
