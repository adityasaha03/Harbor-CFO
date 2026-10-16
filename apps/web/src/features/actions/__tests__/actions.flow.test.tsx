import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import * as React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as authFeature from '@/features/auth';
import * as approveApi from '../api/use-approve-proposal';
import * as executeApi from '../api/use-execute-proposal';
import { ApprovalDialog } from '../components/approval-dialog';
import type { ActionProposalDto, ExecuteActionProposalResponse } from '@harbor/contracts';

const mockProposal: ActionProposalDto = {
  id: 'prop_01',
  tenantId: 'tenant_harbor_01',
  proposerId: 'usr_owner_01',
  source: 'user',
  actionType: 'sandbox_financing_draw',
  canonicalPayload: {
    offerCode: 'bridge-term',
    offerVersion: 1,
    principalMinor: 6000000,
    fundingOn: '2026-10-22',
    upfrontFeeMinor: 120000,
    interestMinor: 180000,
    schedule: [{ dueOn: '2026-12-21', amountMinor: 6180000 }],
  },
  payloadHash: 'a1b2c3d4e5f67890123456789012345678901234567890123456789012345678',
  baseInputVersion: 1,
  scenarioId: 'scen_01',
  status: 'pending',
  expiresAt: '2026-10-16T15:00:00Z',
  operationId: null,
  createdAt: '2026-10-16T14:00:00Z',
  updatedAt: '2026-10-16T14:00:00Z',
};

const mockExecutionResponse: ExecuteActionProposalResponse = {
  operation: {
    id: 'op_doc_01',
    tenantId: 'tenant_harbor_01',
    operationId: 'op_bridge_01',
    proposalId: 'prop_01',
    approvalId: 'appr_01',
    idempotencyKey: 'idem-key-123',
    payloadHash: mockProposal.payloadHash,
    type: 'sandbox_financing_draw',
    inputVersion: 1,
    outputVersion: 2,
    ledgerEntryIds: ['ledg_draw_01', 'ledg_fee_01'],
    commitmentId: 'commit_01',
    forecastBeforeId: 'fc_before_01',
    forecastAfterId: 'fc_after_01',
    createdAt: '2026-10-16T14:05:00Z',
    updatedAt: '2026-10-16T14:05:00Z',
  },
  commitment: {
    id: 'commit_01',
    tenantId: 'tenant_harbor_01',
    operationId: 'op_bridge_01',
    offerCode: 'bridge-term',
    offerVersion: 1,
    principalMinor: 6000000,
    upfrontFeeMinor: 120000,
    interestMinor: 180000,
    fundedOn: '2026-10-22',
    schedule: [{ dueOn: '2026-12-21', amountMinor: 6180000 }],
    status: 'active',
    createdAt: '2026-10-16T14:05:00Z',
    updatedAt: '2026-10-16T14:05:00Z',
  },
  proposal: {
    ...mockProposal,
    status: 'executed',
    operationId: 'op_bridge_01',
  },
};

function renderWithClient(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

describe('F11 Action Approval Flow — Owner Flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: Owner with actions:approve permission
    vi.spyOn(authFeature, 'usePermission').mockImplementation((perm) => {
      if (perm === 'actions:approve') return true;
      if (perm === 'actions:propose') return true;
      return true;
    });
  });

  it('renders server-resolved payload details and hash preview', () => {
    renderWithClient(
      <ApprovalDialog proposal={mockProposal} open={true} onOpenChange={vi.fn()} />,
    );

    expect(screen.getByTestId('payload-principal')).toHaveTextContent('60,000.00');
    expect(screen.getByTestId('payload-net-proceeds')).toHaveTextContent('58,800.00');
    expect(screen.getByTestId('payload-total-cost')).toHaveTextContent('3,000.00');
    expect(screen.getByTestId('payload-total-repayment')).toHaveTextContent('61,800.00');
    expect(screen.getByTestId('simulation-notice')).toHaveTextContent(
      'Simulated action. No real money moves.',
    );
    expect(screen.getByTestId('payload-hash-preview')).toHaveTextContent('a1b2c3d4e5f6');
  });

  it('runs Approve -> Execute flow and reuses the same Idempotency-Key on retry', async () => {
    const approveMutate = vi.fn().mockResolvedValue({
      ...mockProposal,
      status: 'approved',
    });
    vi.spyOn(approveApi, 'useApproveProposal').mockReturnValue({
      mutateAsync: approveMutate,
      isPending: false,
    } as unknown as ReturnType<typeof approveApi.useApproveProposal>);

    const executeMutate = vi
      .fn()
      .mockRejectedValueOnce(new Error('Network transient error'))
      .mockResolvedValueOnce(mockExecutionResponse);

    vi.spyOn(executeApi, 'useExecuteProposal').mockReturnValue({
      mutateAsync: executeMutate,
      isPending: false,
    } as unknown as ReturnType<typeof executeApi.useExecuteProposal>);

    const { rerender } = renderWithClient(
      <ApprovalDialog proposal={mockProposal} open={true} onOpenChange={vi.fn()} />,
    );

    // 1. Click Approve Action
    const approveBtn = screen.getByTestId('approve-proposal-btn');
    fireEvent.click(approveBtn);

    await waitFor(() => {
      expect(approveMutate).toHaveBeenCalledWith({
        proposalId: 'prop_01',
        input: { payloadHash: mockProposal.payloadHash },
      });
    });

    // 2. Rerender with approved status
    const approvedProposal: ActionProposalDto = { ...mockProposal, status: 'approved' };
    rerender(
      <QueryClientProvider client={new QueryClient()}>
        <ApprovalDialog proposal={approvedProposal} open={true} onOpenChange={vi.fn()} />
      </QueryClientProvider>,
    );

    const executeBtn = screen.getByTestId('execute-proposal-btn');

    // 3. First execution attempt (fails with transient error)
    fireEvent.click(executeBtn);
    await waitFor(() => {
      expect(executeMutate).toHaveBeenCalledTimes(1);
    });
    const firstKey = executeMutate.mock.calls[0]![0].idempotencyKey;
    expect(firstKey).toBeTruthy();

    // 4. Retry execution attempt
    fireEvent.click(executeBtn);
    await waitFor(() => {
      expect(executeMutate).toHaveBeenCalledTimes(2);
    });
    const secondKey = executeMutate.mock.calls[1]![0].idempotencyKey;

    // Must be the exact same idempotency key across retries in the same dialog session
    expect(secondKey).toBe(firstKey);

    // 5. Success result view
    await waitFor(() => {
      expect(screen.getByTestId('execution-result')).toBeInTheDocument();
      expect(screen.getByTestId('result-operation-id')).toHaveTextContent('op_bridge_01');
      expect(screen.getByTestId('result-version-shift')).toHaveTextContent('v1');
      expect(screen.getByTestId('result-version-shift')).toHaveTextContent('v2');
      expect(screen.getByTestId('result-entry-draw')).toHaveTextContent('+¥60,000.00');
      expect(screen.getByTestId('result-entry-fee')).toHaveTextContent('-¥1,200.00');
    });
  });
});
