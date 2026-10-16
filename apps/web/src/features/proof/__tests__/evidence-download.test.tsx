import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import * as React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { EvidenceDownload } from '../components/evidence-download';
import * as authFeature from '@/features/auth';
import * as downloadHelper from '../api/download-evidence';

function renderWithClient(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

describe('F13 Evidence Download Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('disables export button when user lacks audit:export permission', () => {
    vi.spyOn(authFeature, 'usePermission').mockReturnValue(false);

    renderWithClient(<EvidenceDownload />);

    const button = screen.getByRole('button', { name: /Export Evidence/i });
    expect(button).toBeDisabled();
    expect(
      screen.getByText(/Evidence bundle export is restricted to/i)
    ).toBeInTheDocument();
  });

  it('enables export button and invokes download when user has audit:export permission', async () => {
    vi.spyOn(authFeature, 'usePermission').mockReturnValue(true);
    const downloadSpy = vi.spyOn(downloadHelper, 'downloadEvidenceBundle').mockResolvedValue();

    renderWithClient(<EvidenceDownload />);

    const button = screen.getByRole('button', { name: /Export Evidence/i });
    expect(button).not.toBeDisabled();

    fireEvent.click(button);

    await React.act(async () => {
      await Promise.resolve();
    });

    expect(downloadSpy).toHaveBeenCalledTimes(1);
  });
});
