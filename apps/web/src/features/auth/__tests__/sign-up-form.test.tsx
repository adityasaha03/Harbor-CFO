import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SignUpForm } from '../components/sign-up-form';
import { authClient } from '../lib/auth-client';

import { toast } from 'sonner';

const mockPush = vi.fn();
const mockRefresh = vi.fn();
const mockGetSearchParams = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    refresh: mockRefresh,
  }),
  useSearchParams: () => ({
    get: mockGetSearchParams,
  }),
}));

vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

vi.mock('../lib/auth-client', () => ({
  authClient: {
    signUp: {
      email: vi.fn(),
    },
  },
}));

describe('SignUpForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSearchParams.mockReturnValue(null);
  });

  it('renders name, email, password fields and submit button', () => {
    render(<SignUpForm />);

    expect(screen.getByLabelText(/full name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/work email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /create account/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /sign in/i })).toHaveAttribute('href', '/sign-in');
  });

  it('shows auth-required toast when visited with a valid protected callbackUrl', () => {
    mockGetSearchParams.mockImplementation((key: string) => (key === 'callbackUrl' ? '/dashboard' : null));
    render(<SignUpForm />);

    expect(toast.error).toHaveBeenCalledWith('You need to sign up to visit the page', { id: 'auth-required' });
  });

  it('does not show auth-required toast when callbackUrl is missing or invalid', () => {
    mockGetSearchParams.mockImplementation((key: string) => (key === 'callbackUrl' ? '/invalid-path' : null));
    render(<SignUpForm />);

    expect(toast.error).not.toHaveBeenCalled();
  });

  it('validates empty inputs and password length under 8 characters', async () => {
    const user = userEvent.setup();
    render(<SignUpForm />);

    await user.type(screen.getByLabelText(/full name/i), 'A');
    await user.type(screen.getByLabelText(/work email/i), 'not-an-email');
    await user.type(screen.getByLabelText(/^password/i), 'short');
    await user.click(screen.getByRole('button', { name: /create account/i }));

    await waitFor(() => {
      expect(screen.getByText(/name must be at least 2 characters/i)).toBeInTheDocument();
      expect(screen.getByText(/please enter a valid email address/i)).toBeInTheDocument();
      expect(screen.getByText(/password must be at least 8 characters long/i)).toBeInTheDocument();
    });
    expect(authClient.signUp.email).not.toHaveBeenCalled();
  });

  it('displays API error message on signup failure', async () => {
    const user = userEvent.setup();
    vi.mocked(authClient.signUp.email).mockResolvedValueOnce({
      data: null as never,
      error: { message: 'User already exists', status: 400 } as never,
    });

    render(<SignUpForm />);

    await user.type(screen.getByLabelText(/full name/i), 'Alice Doe');
    await user.type(screen.getByLabelText(/work email/i), 'alice@company.com');
    await user.type(screen.getByLabelText(/^password/i), 'securepassword123');
    await user.click(screen.getByRole('button', { name: /create account/i }));

    await waitFor(() => {
      expect(screen.getByText(/user already exists/i)).toBeInTheDocument();
    });
  });

  it('calls authClient.signUp.email and redirects to /company on success', async () => {
    const user = userEvent.setup();
    vi.mocked(authClient.signUp.email).mockResolvedValueOnce({
      data: {
        user: { id: 'usr_1', email: 'alice@company.com' },
      } as never,
      error: null,
    });

    render(<SignUpForm />);

    await user.type(screen.getByLabelText(/full name/i), 'Alice Doe');
    await user.type(screen.getByLabelText(/work email/i), 'alice@company.com');
    await user.type(screen.getByLabelText(/^password/i), 'securepassword123');
    await user.click(screen.getByRole('button', { name: /create account/i }));

    await waitFor(() => {
      expect(authClient.signUp.email).toHaveBeenCalledWith({
        name: 'Alice Doe',
        email: 'alice@company.com',
        password: 'securepassword123',
      });
      expect(mockPush).toHaveBeenCalledWith('/company');
      expect(mockRefresh).toHaveBeenCalled();
    });
  });

  it('blocks sign-up if check-email endpoint detects email is already added as employee', async () => {
    const user = userEvent.setup();
    const mockFetch = vi.spyOn(global, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => ({ exists: true, isEmployee: true }),
    } as Response);

    render(<SignUpForm />);

    await user.type(screen.getByLabelText(/full name/i), 'Employee Bob');
    await user.type(screen.getByLabelText(/work email/i), 'bob@company.com');
    await user.type(screen.getByLabelText(/^password/i), 'securepassword123');
    await user.click(screen.getByRole('button', { name: /create account/i }));

    await waitFor(() => {
      expect(screen.getByText(/registered as an employee/i)).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /sign in with bob@company.com/i })).toHaveAttribute(
        'href',
        '/sign-in?email=bob%40company.com',
      );
    });

    expect(authClient.signUp.email).not.toHaveBeenCalled();
    mockFetch.mockRestore();
  });

  it('blocks sign-up if check-email endpoint detects email is an already registered owner', async () => {
    const user = userEvent.setup();
    const mockFetch = vi.spyOn(global, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => ({ exists: true, isEmployee: false }),
    } as Response);

    render(<SignUpForm />);

    await user.type(screen.getByLabelText(/full name/i), 'Owner Charlie');
    await user.type(screen.getByLabelText(/work email/i), 'charlie@company.com');
    await user.type(screen.getByLabelText(/^password/i), 'securepassword123');
    await user.click(screen.getByRole('button', { name: /create account/i }));

    await waitFor(() => {
      expect(screen.getByText(/user already exists/i)).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /sign in with charlie@company.com/i })).toHaveAttribute(
        'href',
        '/sign-in?email=charlie%40company.com',
      );
    });

    expect(authClient.signUp.email).not.toHaveBeenCalled();
    mockFetch.mockRestore();
  });

  it('renders employee informational banner when toggling to Employee account type', async () => {
    const user = userEvent.setup();
    render(<SignUpForm />);

    await user.click(screen.getByRole('button', { name: /employee/i }));

    expect(screen.getByText(/employees do not need to sign up/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /go to sign in/i })).toHaveAttribute('href', '/sign-in');
    expect(screen.queryByLabelText(/work email/i)).not.toBeInTheDocument();
  });
});

