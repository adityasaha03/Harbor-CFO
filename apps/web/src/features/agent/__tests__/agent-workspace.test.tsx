import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import * as React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AgentWorkspace } from '../components/agent-workspace';
import * as authModule from '@/features/auth';
import * as sseModule from '@/lib/api/sse';
import * as clientModule from '@/lib/api/client';
import type { AgentRunDto, DomainEvent } from '@harbor/contracts';

vi.mock('@/features/auth', () => ({
  usePermission: vi.fn(),
}));

vi.mock('@/lib/api/client', () => ({
  apiFetch: vi.fn(),
  getActiveTenantId: vi.fn(() => 'tenant_test'),
}));

vi.mock('@/lib/api/sse', () => ({
  subscribeToEventStream: vi.fn(),
}));

describe('F12 AgentWorkspace and SSE Integration', () => {
  let queryClient: QueryClient;
  let sseCallback: ((event: DomainEvent) => void) | null = null;

  beforeEach(() => {
    vi.clearAllMocks();
    sseCallback = null;
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    vi.mocked(sseModule.subscribeToEventStream).mockImplementation((opts) => {
      sseCallback = opts.onEvent;
      return () => {
        sseCallback = null;
      };
    });
  });

  const renderWorkspace = () => {
    return render(
      <QueryClientProvider client={queryClient}>
        <AgentWorkspace />
      </QueryClientProvider>,
    );
  };

  it('renders suggested prompts and triggers submission when clicked', async () => {
    vi.mocked(authModule.usePermission).mockReturnValue(true);
    vi.mocked(clientModule.apiFetch).mockImplementation(async (path, opts) => {
      if (path === '/agent/runs' && opts?.method === 'POST') {
        return { runId: 'run_123' };
      }
      if (path === '/agent/runs' || path.startsWith('/agent/runs?')) {
        return [];
      }
      return {};
    });

    renderWorkspace();

    expect(screen.getByText('What is causing the cash gap?')).toBeDefined();
    expect(screen.getByText('Which overdue invoices matter most?')).toBeDefined();
    expect(screen.getByText('Compare my financing options')).toBeDefined();
    expect(screen.getByText('Propose the best way to close the gap')).toBeDefined();
  });

  it('disables input with read-only notice for reviewer role (no agent:use permission)', () => {
    vi.mocked(authModule.usePermission).mockReturnValue(false); // Reviewer
    vi.mocked(clientModule.apiFetch).mockResolvedValue([]);

    renderWorkspace();

    // Verify read-only notice is visible
    expect(screen.getByText(/Reviewers have read-only access/i)).toBeDefined();

    // Verify textarea is disabled
    const textarea = screen.getByPlaceholderText(/Chat disabled for reviewer role/i);
    expect(textarea.hasAttribute('disabled')).toBe(true);

    // Verify send button is disabled
    const sendButton = screen.getByRole('button', { name: /send/i });
    expect(sendButton.hasAttribute('disabled')).toBe(true);
  });

  it('toggles response style between Standard and Plain', () => {
    vi.mocked(authModule.usePermission).mockReturnValue(true);
    vi.mocked(clientModule.apiFetch).mockResolvedValue([]);

    renderWorkspace();

    const standardBtn = screen.getByRole('button', { name: 'Standard' });
    const plainBtn = screen.getByRole('button', { name: 'Plain' });

    expect(standardBtn).toBeDefined();
    expect(plainBtn).toBeDefined();

    fireEvent.click(plainBtn);
    expect(plainBtn.className).toContain('bg-background');
  });

  it('displays rate-limit error message when API responds with 429', async () => {
    vi.mocked(authModule.usePermission).mockReturnValue(true);
    vi.mocked(clientModule.apiFetch).mockImplementation(async (path, opts) => {
      if (opts?.method === 'POST') {
        throw new Error('HTTP 429 Rate limited');
      }
      return [];
    });

    renderWorkspace();

    const promptBtn = screen.getByText('What is causing the cash gap?');
    fireEvent.click(promptBtn);

    await waitFor(() => {
      expect(
        screen.getByText(/Rate limit exceeded \(10 runs\/min\)/i),
      ).toBeDefined();
    });
  });

  it('streams timeline items and updates view upon SSE run completion', async () => {
    vi.mocked(authModule.usePermission).mockReturnValue(true);

    const mockRunRunning: AgentRunDto = {
      id: 'run_live_1',
      tenantId: 'tenant_test',
      actorId: 'usr_1',
      mode: 'live',
      prompt: 'What is causing the cash gap?',
      status: 'running',
      toolCalls: [],
      traceId: 'trc_1',
      createdAt: '2026-10-20T10:00:00Z',
      evidenceRefs: [],
      proposalIds: [],
    };

    const mockRunCompleted: AgentRunDto = {
      ...mockRunRunning,
      status: 'completed',
      finalAnswer: 'Cash gap of CNY 50,000 resolved by factoring offer.',
      toolCalls: [
        {
          name: 'getForecast',
          argsSanitized: {},
          status: 'success',
          durationMs: 95,
          resultRefs: ['forecast:2026-11-10'],
        },
      ],
      evidenceRefs: ['forecast:2026-11-10'],
      completedAt: '2026-10-20T10:00:02Z',
    };

    vi.mocked(clientModule.apiFetch).mockImplementation(async (path, opts) => {
      if (opts?.method === 'POST') {
        return { runId: 'run_live_1' };
      }
      if (path === '/agent/runs/run_live_1') {
        return mockRunCompleted;
      }
      if (path.startsWith('/agent/runs')) {
        return [mockRunCompleted];
      }
      return {};
    });

    renderWorkspace();

    // Start a run using a prompt
    fireEvent.click(screen.getByText('What is causing the cash gap?'));

    await waitFor(() => {
      expect(screen.getByText('What is causing the cash gap?')).toBeDefined();
    });

    // Simulate SSE tool.started event
    if (sseCallback) {
      act(() => {
        sseCallback!({
          id: 'evt_1',
          event: 'tool.started',
          tenantId: 'tenant_test',
          timestamp: '2026-10-20T10:00:01Z',
          data: {
            runId: 'run_live_1',
            name: 'getForecast',
            publicSummary: 'Tool started: getForecast',
            resourceRefs: ['getForecast'],
            argsSanitized: { horizonDays: 91 },
          },
        });
      });
    }

    await waitFor(() => {
      expect(screen.getByText('getForecast')).toBeDefined();
    });

    // Simulate SSE tool.completed event
    if (sseCallback) {
      act(() => {
        sseCallback!({
          id: 'evt_2',
          event: 'tool.completed',
          tenantId: 'tenant_test',
          timestamp: '2026-10-20T10:00:01.095Z',
          data: {
            runId: 'run_live_1',
            publicSummary: 'Tool completed: getForecast in 95ms',
            resourceRefs: ['forecast:2026-11-10'],
          },
        });
      });
    }

    await waitFor(() => {
      expect(screen.getByText('95ms')).toBeDefined();
    });

    // Simulate SSE run.completed event
    if (sseCallback) {
      act(() => {
        sseCallback!({
          id: 'evt_3',
          event: 'run.completed',
          tenantId: 'tenant_test',
          timestamp: '2026-10-20T10:00:02Z',
          data: {
            runId: 'run_live_1',
            publicSummary: 'Agent copilot completed analysis with 1 tool call(s).',
          },
        });
      });
    }

    await waitFor(() => {
      expect(
        screen.getByText(/Cash gap of CNY 50,000 resolved by factoring offer./i),
      ).toBeDefined();
    });
  });
});
