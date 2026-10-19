import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { CreateCompanyForm } from '../components/create-company-form';
import type * as AuthModule from '@/features/auth';
import { authClient } from '@/features/auth';

const mockPush = vi.fn();
const mockRefresh = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    refresh: mockRefresh,
  }),
}));

vi.mock('@/features/auth', async (importOriginal) => {
  const actual = await importOriginal<typeof AuthModule>();
  return {
    ...actual,
    clearApiToken: vi.fn(),
    authClient: {
      ...actual.authClient,
      organization: {
        create: vi.fn(),
        setActive: vi.fn(),
      },
    },
  };
});

describe('CreateCompanyForm', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient();
  });

  const renderForm = () =>
    render(
      <QueryClientProvider client={queryClient}>
        <CreateCompanyForm />
      </QueryClientProvider>
    );

  it('renders company name and slug inputs and submit button', () => {
    renderForm();

    expect(screen.getByLabelText(/company legal or trade name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/workspace identifier/i)).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /create company workspace/i })
    ).toBeInTheDocument();
  });

  it('validates minimum length for name and slug format', async () => {
    const user = userEvent.setup();
    renderForm();

    const submitBtn = screen.getByRole('button', { name: /create company workspace/i });
    await user.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText(/company name must be at least 2 characters/i)).toBeInTheDocument();
    });
    expect(authClient.organization.create).not.toHaveBeenCalled();
  });

  it('auto-generates slug when typing company name', async () => {
    const user = userEvent.setup();
    renderForm();

    const nameInput = screen.getByLabelText(/company legal or trade name/i);
    const slugInput = screen.getByLabelText(/workspace identifier/i);

    await user.type(nameInput, 'Acme Global 100');

    expect(slugInput).toHaveValue('acme-global-100');
  });

  it('creates organization, sets active, and redirects to dashboard', async () => {
    const user = userEvent.setup();
    vi.mocked(authClient.organization.create).mockResolvedValueOnce({
      data: { id: 'org_acme', name: 'Acme Corp', slug: 'acme-corp' },
      error: null,
    } as never);
    vi.mocked(authClient.organization.setActive).mockResolvedValueOnce({
      data: { id: 'org_acme' },
      error: null,
    } as never);

    renderForm();

    const nameInput = screen.getByLabelText(/company legal or trade name/i);
    await user.type(nameInput, 'Acme Corp');

    const submitBtn = screen.getByRole('button', { name: /create company workspace/i });
    await user.click(submitBtn);

    await waitFor(() => {
      expect(authClient.organization.create).toHaveBeenCalledWith({
        name: 'Acme Corp',
        slug: 'acme-corp',
      });
      expect(authClient.organization.setActive).toHaveBeenCalledWith({
        organizationId: 'org_acme',
      });
      expect(mockPush).toHaveBeenCalledWith('/dashboard');
      expect(mockRefresh).toHaveBeenCalled();
    });
  });

  it('displays error if organization creation fails', async () => {
    const user = userEvent.setup();
    vi.mocked(authClient.organization.create).mockResolvedValueOnce({
      data: null as never,
      error: { message: 'Slug already taken', status: 400 } as never,
    });

    renderForm();

    const nameInput = screen.getByLabelText(/company legal or trade name/i);
    await user.type(nameInput, 'Acme Corp');

    const submitBtn = screen.getByRole('button', { name: /create company workspace/i });
    await user.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText(/slug already taken/i)).toBeInTheDocument();
    });
  });
});
