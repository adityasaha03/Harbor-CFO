import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CompanySwitcher } from '../components/company-switcher';
import * as useActiveCompanyModule from '../hooks/use-active-company';

const mockRefresh = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    refresh: mockRefresh,
  }),
}));

describe('CompanySwitcher', () => {
  const mockSetActiveCompany = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders active company name, slug, and role badge', () => {
    vi.spyOn(useActiveCompanyModule, 'useActiveCompany').mockReturnValue({
      activeCompany: {
        id: 'org_1',
        name: 'Harbor Wholesale',
        slug: 'harbor-wholesale',
      },
      companies: [
        { id: 'org_1', name: 'Harbor Wholesale', slug: 'harbor-wholesale' },
        { id: 'org_2', name: 'Pacific Trade', slug: 'pacific-trade' },
      ],
      role: 'owner',
      isLoading: false,
      setActiveCompany: mockSetActiveCompany,
      refetch: vi.fn(),
    });

    render(<CompanySwitcher />);

    expect(screen.getByText('Harbor Wholesale')).toBeInTheDocument();
    expect(screen.getByText('harbor-wholesale')).toBeInTheDocument();
    expect(screen.getByText('owner')).toBeInTheDocument();
  });

  it('switches company and calls refresh when another company is clicked', async () => {
    const user = userEvent.setup();
    mockSetActiveCompany.mockResolvedValue(undefined);

    vi.spyOn(useActiveCompanyModule, 'useActiveCompany').mockReturnValue({
      activeCompany: {
        id: 'org_1',
        name: 'Harbor Wholesale',
        slug: 'harbor-wholesale',
      },
      companies: [
        { id: 'org_1', name: 'Harbor Wholesale', slug: 'harbor-wholesale' },
        { id: 'org_2', name: 'Pacific Trade', slug: 'pacific-trade' },
      ],
      role: 'owner',
      isLoading: false,
      setActiveCompany: mockSetActiveCompany,
      refetch: vi.fn(),
    });

    render(<CompanySwitcher />);

    // Open dropdown
    const trigger = screen.getByLabelText(/select company workspace/i);
    await user.click(trigger);

    // Click on Pacific Trade
    const secondOrgItem = screen.getByText('Pacific Trade');
    await user.click(secondOrgItem);

    await waitFor(() => {
      expect(mockSetActiveCompany).toHaveBeenCalledWith('org_2');
      expect(mockRefresh).toHaveBeenCalled();
    });
  });
});
