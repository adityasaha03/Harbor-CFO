import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import * as React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as authFeature from '@/features/auth';
import * as createApi from '../api/use-create-proposal';
import * as approveApi from '../api/use-approve-proposal';
import { ApprovalDialog } from '../components/approval-dialog';
import { ProposalCard } from '../components/proposal-card';
import type { ActionProposalDto } from '@harbor/contracts';

const mockProposal: ActionProposalDto = {
  id: 'prop_02',
  tenantId: 'tenant_harbor_01',
  proposerId: 'usr_emp_01',
  source: 'agent',
  actionType: 'sandbox_financing_draw',
  canonicalPayload: {
    offerCode: 'revolving-credit',
    offerVersion: 1,
    principalMinor: 1200000,
    fundingOn: '2026-10-25',
    upfrontFeeMinor: 24000,
    interestMinor: 18000,
    schedule: [{ dueOn: '2026-11-25', amountMinor: 1218000 }],
  },
  payloadHash: 'b2c3d4e5f6a17890123456789012345678901234567890123456789012345678',
  baseInputVersion: 1,
  scenarioId: null,
  status: 'pending',
  expiresAt: '2026-10-16T15:00:00Z',
  operationId: null,
  createdAt: '2026-10-16T14:00:00Z',
  updatedAt: '2026-10-16T14:00:00Z',
};

function renderWithClient(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

describe('F11 Action Approval Flow — Role Permissions & Stale State', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders ProposalCard with agent badge and formatted principal', () => {
    const onReview = vi.fn();
    renderWithClient(<ProposalCard proposal={mockProposal} onReview={onReview} />);

    expect(screen.getByTestId('proposal-source-badge')).toHaveTextContent('Agent Proposed');
    expect(screen.getByTestId('proposal-principal-text')).toHaveTextContent('12,000.00');

    fireEvent.click(screen.getByTestId('review-proposal-btn-prop_02'));
    expect(onReview).toHaveBeenCalledWith(mockProposal);
  });

  it('enforces read-only mode for non-owners (actions:approve is false)', () => {
    // Non-owner role (employee or reviewer)
    vi.spyOn(authFeature, 'usePermission').mockImplementation((perm) => {
      if (perm === 'actions:approve') return false;
      return true;
    });

    renderWithClient(
      <ApprovalDialog proposal={mockProposal} open={true} onOpenChange={vi.fn()} />,
    );

    // Read-only notice is displayed
    expect(screen.getByTestId('reviewer-approval-notice')).toHaveTextContent(
      'Only an Owner can approve and execute actions.',
    );

    // Buttons are disabled
    expect(screen.getByTestId('approve-proposal-btn')).toBeDisabled();
    expect(screen.getByTestId('reject-proposal-btn')).toBeDisabled();
  });

  it('handles 409 stale data error by showing regenerate banner and creates a fresh proposal', async () => {
    vi.spyOn(authFeature, 'usePermission').mockReturnValue(true);

    // Approve fails with 409 Conflict (e.g. dataset was bumped)
    const approveMutate = vi.fn().mockRejectedValue(new Error('409 Stale dataset version'));
    vi.spyOn(approveApi, 'useApproveProposal').mockReturnValue({
      mutateAsync: approveMutate,
      isPending: false,
    } as unknown as ReturnType<typeof approveApi.useApproveProposal>);

    const newFreshProposal: ActionProposalDto = {
      ...mockProposal,
      id: 'prop_03_fresh',
      baseInputVersion: 2,
    };
    const createMutate = vi.fn().mockResolvedValue(newFreshProposal);
    vi.spyOn(createApi, 'useCreateProposal').mockReturnValue({
      mutateAsync: createMutate,
      isPending: false,
    } as unknown as ReturnType<typeof createApi.useCreateProposal>);

    const onRegenerated = vi.fn();

    renderWithClient(
      <ApprovalDialog
        proposal={mockProposal}
        open={true}
        onOpenChange={vi.fn()}
        onProposalRegenerated={onRegenerated}
      />,
    );

    // Click Approve
    fireEvent.click(screen.getByTestId('approve-proposal-btn'));

    // Stale alert banner appears
    await waitFor(() => {
      expect(screen.getByTestId('stale-proposal-alert')).toBeInTheDocument();
      expect(screen.getByTestId('stale-proposal-alert')).toHaveTextContent(
        'Your data changed. Regenerate this proposal.',
      );
    });

    // Click Regenerate
    fireEvent.click(screen.getByTestId('regenerate-proposal-btn'));

    await waitFor(() => {
      expect(createMutate).toHaveBeenCalledWith({
        actionType: 'sandbox_financing_draw',
        offerCode: 'revolving-credit',
        principalMinor: 1200000,
        scenarioId: undefined,
      });
      expect(onRegenerated).toHaveBeenCalledWith(newFreshProposal);
    });
  });
});
