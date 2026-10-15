import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SignInForm } from '../components/sign-in-form';
import { authClient } from '../lib/auth-client';

const mockPush = vi.fn();
const mockRefresh = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    refresh: mockRefresh,
  }),
  useSearchParams: () => ({
    get: vi.fn().mockReturnValue(null),
  }),
}));

vi.mock('../lib/auth-client', () => ({
  authClient: {
    signIn: {
      email: vi.fn(),
    },
    getSession: vi.fn(),
  },
}));

describe('SignInForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders email, password inputs, submit button, and signup link', () => {
    render(<SignInForm />);

    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /sign up/i })).toHaveAttribute('href', '/sign-up');
  });

  it('shows validation errors when fields are empty', async () => {
    const user = userEvent.setup();
    render(<SignInForm />);

    await user.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(screen.getByText(/email is required/i)).toBeInTheDocument();
      expect(screen.getByText(/password is required/i)).toBeInTheDocument();
    });
    expect(authClient.signIn.email).not.toHaveBeenCalled();
  });

  it('shows error when invalid email format is entered', async () => {
    const user = userEvent.setup();
    render(<SignInForm />);

    await user.type(screen.getByLabelText(/email address/i), 'invalid-email');
    await user.type(screen.getByLabelText(/^password/i), 'password123');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(screen.getByText(/please enter a valid email address/i)).toBeInTheDocument();
    });
    expect(authClient.signIn.email).not.toHaveBeenCalled();
  });

  it('shows generic error message on failed sign in without leaking email existence', async () => {
    const user = userEvent.setup();
    vi.mocked(authClient.signIn.email).mockResolvedValueOnce({
      data: null as never,
      error: { message: 'Invalid credentials', status: 401 } as never,
    });

    render(<SignInForm />);

    await user.type(screen.getByLabelText(/email address/i), 'user@example.com');
    await user.type(screen.getByLabelText(/^password/i), 'wrongpassword');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(screen.getByText(/invalid email or password/i)).toBeInTheDocument();
    });
  });

  it('calls authClient.signIn.email and redirects to /dashboard when active company exists', async () => {
    const user = userEvent.setup();
    vi.mocked(authClient.signIn.email).mockResolvedValueOnce({
      data: {
        user: { id: 'usr_1', email: 'owner@harbor.local' },
      } as never,
      error: null,
    });
    vi.mocked(authClient.getSession).mockResolvedValueOnce({
      data: {
        user: { id: 'usr_1', email: 'owner@harbor.local' },
        session: { id: 'sess_1', activeOrganizationId: 'org_123' },
      },
    } as never);

    render(<SignInForm />);

    await user.type(screen.getByLabelText(/email address/i), 'owner@harbor.local');
    await user.type(screen.getByLabelText(/^password/i), 'password123');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(authClient.signIn.email).toHaveBeenCalledWith({
        email: 'owner@harbor.local',
        password: 'password123',
      });
      expect(mockPush).toHaveBeenCalledWith('/dashboard');
      expect(mockRefresh).toHaveBeenCalled();
    });
  });

  it('redirects to /company when user has no active company assigned', async () => {
    const user = userEvent.setup();
    vi.mocked(authClient.signIn.email).mockResolvedValueOnce({
      data: {
        user: { id: 'usr_2', email: 'newuser@harbor.local' },
      } as never,
      error: null,
    });
    vi.mocked(authClient.getSession).mockResolvedValueOnce({
      data: {
        user: { id: 'usr_2', email: 'newuser@harbor.local' },
        session: { id: 'sess_2', activeOrganizationId: null },
      },
    } as never);

    render(<SignInForm />);

    await user.type(screen.getByLabelText(/email address/i), 'newuser@harbor.local');
    await user.type(screen.getByLabelText(/^password/i), 'password123');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/company');
    });
  });
});
