import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DemoAccountPicker } from '../components/demo-account-picker';
import { DEMO_EMAILS } from '@harbor/contracts';

describe('DemoAccountPicker', () => {
  const originalEnv = process.env.NEXT_PUBLIC_DEMO_MODE;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    process.env.NEXT_PUBLIC_DEMO_MODE = originalEnv;
  });

  it('renders nothing when NEXT_PUBLIC_DEMO_MODE is not true', () => {
    process.env.NEXT_PUBLIC_DEMO_MODE = 'false';
    const { container } = render(<DemoAccountPicker onSelectEmail={vi.fn()} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders demo accounts when NEXT_PUBLIC_DEMO_MODE is true', async () => {
    process.env.NEXT_PUBLIC_DEMO_MODE = 'true';
    const mockSelect = vi.fn();
    const user = userEvent.setup();

    render(<DemoAccountPicker onSelectEmail={mockSelect} />);

    expect(screen.getByText(/synthetic demo accounts/i)).toBeInTheDocument();
    expect(screen.getByText(/harbor owner/i)).toBeInTheDocument();
    expect(screen.getByText(/harbor employee/i)).toBeInTheDocument();

    const ownerButton = screen.getByRole('button', { name: /harbor owner/i });
    await user.click(ownerButton);

    expect(mockSelect).toHaveBeenCalledWith(DEMO_EMAILS.HARBOR_OWNER);
  });
});
