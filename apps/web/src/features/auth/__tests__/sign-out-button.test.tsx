import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SignOutButton } from '../components/sign-out-button';
import { authClient } from '../lib/auth-client';

const mockPush = vi.fn();
const mockRefresh = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    refresh: mockRefresh,
  }),
}));

vi.mock('../lib/auth-client', () => ({
  authClient: {
    signOut: vi.fn(),
  },
}));

describe('SignOutButton', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders sign out button and triggers signOut on click', async () => {
    const user = userEvent.setup();
    vi.mocked(authClient.signOut).mockResolvedValueOnce({} as never);

    render(<SignOutButton />);

    const button = screen.getByRole('button', { name: /sign out/i });
    expect(button).toBeInTheDocument();

    await user.click(button);

    await waitFor(() => {
      expect(authClient.signOut).toHaveBeenCalled();
      expect(mockPush).toHaveBeenCalledWith('/sign-in');
      expect(mockRefresh).toHaveBeenCalled();
    });
  });
});
