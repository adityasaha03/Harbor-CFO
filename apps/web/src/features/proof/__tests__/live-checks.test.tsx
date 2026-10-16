import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import * as React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { LiveChecks } from '../components/live-checks';
import { CheckCard } from '../components/check-card';
import { CheckResult } from '../components/check-result';
import * as authFeature from '@/features/auth';
import * as proofChecksApi from '../api/use-proof-checks';
import * as runCheckApi from '../api/use-run-proof-check';
import type { ProofCheckItem, ProofCheckRunResult } from '@harbor/contracts';

function renderWithClient(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

const mockCatalog: ProofCheckItem[] = [
  {
    id: 'employee-execute',
    title: 'Adversarial Execution Denial',
    description: 'Attempts executing a pending proposal with Employee session.',
    lastResult: {
      checkId: 'employee-execute',
      title: 'Adversarial Execution Denial',
      passed: true,
      expected: 'HTTP 403 Forbidden with unaltered ledger and approvals count',
      actual: 'HTTP 403 Forbidden',
      message: 'Execution was successfully blocked by backend permissions middleware.',
      stateBefore: {
        ledgerEntriesCount: 15,
        approvalsCount: 2,
        proposalsCount: 3,
      },
      stateAfter: {
        ledgerEntriesCount: 15,
        approvalsCount: 2,
        proposalsCount: 3,
      },
      executedAt: '2026-10-16T15:00:00Z',
    },
  },
  {
    id: 'cross-tenant-lookup',
    title: 'Multi-Tenant Data Boundary Isolation',
    description: 'Attempts looking up another tenant record ID.',
  },
  {
    id: 'injection-import',
    title: 'Prompt Injection Defense',
    description: 'Evaluates agent on prompt injection text stored as data.',
  },
];

describe('F13 Live Adversarial Checks Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders catalog of checks and passed status with before/after state diff', () => {
    vi.spyOn(authFeature, 'useMe').mockReturnValue({
      data: { role: 'employee' },
      isLoading: false,
    } as unknown as ReturnType<typeof authFeature.useMe>);

    vi.spyOn(proofChecksApi, 'useProofChecks').mockReturnValue({
      data: { checks: mockCatalog },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
      isRefetching: false,
    } as unknown as ReturnType<typeof proofChecksApi.useProofChecks>);

    vi.spyOn(runCheckApi, 'useRunProofCheck').mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    } as unknown as ReturnType<typeof runCheckApi.useRunProofCheck>);

    renderWithClient(<LiveChecks />);

    expect(screen.getByText('Live Adversarial Invariant Checks')).toBeInTheDocument();
    expect(screen.getByText('Adversarial Execution Denial')).toBeInTheDocument();
    expect(screen.getByText('Multi-Tenant Data Boundary Isolation')).toBeInTheDocument();
    expect(screen.getByText('Prompt Injection Defense')).toBeInTheDocument();

    // Check passed badge
    expect(screen.getByText('Check Passed')).toBeInTheDocument();
    expect(screen.getByText('PASSED')).toBeInTheDocument();

    // Before/After invariant diff assertions
    expect(screen.getByText('State Invariant Verification (Before vs After)')).toBeInTheDocument();
    expect(screen.getByText('ledgerEntriesCount')).toBeInTheDocument();
    expect(screen.getAllByText('Unchanged (0 diff)').length).toBeGreaterThanOrEqual(1);
  });

  it('displays note for Owner on employee-execute card', () => {
    vi.spyOn(authFeature, 'useMe').mockReturnValue({
      data: { role: 'owner' },
      isLoading: false,
    } as unknown as ReturnType<typeof authFeature.useMe>);

    renderWithClient(<CheckCard check={mockCatalog[0]!} />);

    expect(
      screen.getByText(/You are currently signed in as/i)
    ).toBeInTheDocument();
    expect(screen.getByText(/Note for Judges:/i)).toBeInTheDocument();
  });

  it('executes runCheck when Run Check button is clicked', () => {
    const mutateMock = vi.fn();
    vi.spyOn(runCheckApi, 'useRunProofCheck').mockReturnValue({
      mutate: mutateMock,
      isPending: false,
    } as unknown as ReturnType<typeof runCheckApi.useRunProofCheck>);

    vi.spyOn(authFeature, 'useMe').mockReturnValue({
      data: { role: 'employee' },
      isLoading: false,
    } as unknown as ReturnType<typeof authFeature.useMe>);

    renderWithClient(<CheckCard check={mockCatalog[1]!} />);

    const runBtn = screen.getByRole('button', { name: /Run Check/i });
    fireEvent.click(runBtn);

    expect(mutateMock).toHaveBeenCalledWith('cross-tenant-lookup', expect.any(Object));
  });

  it('renders failed check display with FAILED badge when passed is false', () => {
    const failedResult: ProofCheckRunResult = {
      checkId: 'cross-tenant-lookup',
      title: 'Multi-Tenant Data Boundary Isolation',
      passed: false,
      expected: 'HTTP 404 NOT_FOUND',
      actual: 'HTTP 200 OK',
      message: 'Tenant boundary was violated unexpectedly.',
      executedAt: '2026-10-16T15:00:00Z',
    };

    renderWithClient(<CheckResult result={failedResult} />);

    expect(screen.getByText('Check Failed')).toBeInTheDocument();
    expect(screen.getByText('FAILED')).toBeInTheDocument();
    expect(screen.getByText('HTTP 404 NOT_FOUND')).toBeInTheDocument();
    expect(screen.getByText('HTTP 200 OK')).toBeInTheDocument();
    expect(screen.getByText('Tenant boundary was violated unexpectedly.')).toBeInTheDocument();
  });
});
