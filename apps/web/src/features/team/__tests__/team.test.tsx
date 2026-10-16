import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TeamTable } from '../components/team-table';
import { RoleSelect } from '../components/role-select';
import * as useMembersModule from '../api/use-members';
import type { TeamMember } from '../api/use-members';

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

const mockSingleOwnerMembers: TeamMember[] = [
  {
    id: 'mem_1',
    userId: 'usr_1',
    role: 'owner',
    createdAt: '2026-01-01',
    user: {
      id: 'usr_1',
      name: 'Alice Owner',
      email: 'alice@harbor.local',
    },
  },
  {
    id: 'mem_2',
    userId: 'usr_2',
    role: 'employee',
    createdAt: '2026-01-02',
    user: {
      id: 'usr_2',
      name: 'Bob Employee',
      email: 'bob@harbor.local',
    },
  },
];

const mockMultiOwnerMembers: TeamMember[] = [
  {
    id: 'mem_1',
    userId: 'usr_1',
    role: 'owner',
    createdAt: '2026-01-01',
    user: {
      id: 'usr_1',
      name: 'Alice Owner',
      email: 'alice@harbor.local',
    },
  },
  {
    id: 'mem_3',
    userId: 'usr_3',
    role: 'owner',
    createdAt: '2026-01-03',
    user: {
      id: 'usr_3',
      name: 'Charlie Co-Owner',
      email: 'charlie@harbor.local',
    },
  },
];

describe('Team Management', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Last-Owner Guard', () => {
    it('disables demoting and removing the last owner when only 1 owner exists', () => {
      vi.spyOn(useMembersModule, 'useMembers').mockReturnValue({
        members: mockSingleOwnerMembers,
        isLoading: false,
        error: null,
        refetch: vi.fn(),
        updateRole: vi.fn(),
        isUpdatingRole: false,
        removeMember: vi.fn(),
        isRemovingMember: false,
        ownerCount: 1,
        isLastOwner: (m: TeamMember) => m.role === 'owner',
      } as never);

      render(<TeamTable isReadOnly={false} />, {
        wrapper: createWrapper(),
      });

      // Check that (Last Owner) indicator is displayed
      expect(screen.getByText('(Last Owner)')).toBeInTheDocument();

      // Check that delete button for the owner is disabled
      const removeOwnerBtn = screen.getByLabelText('Remove Alice Owner');
      expect(removeOwnerBtn).toBeDisabled();

      // But employee delete button is enabled
      const removeEmployeeBtn = screen.getByLabelText('Remove Bob Employee');
      expect(removeEmployeeBtn).not.toBeDisabled();
    });

    it('allows demoting or removing owners when multiple owners exist', () => {
      vi.spyOn(useMembersModule, 'useMembers').mockReturnValue({
        members: mockMultiOwnerMembers,
        isLoading: false,
        error: null,
        refetch: vi.fn(),
        updateRole: vi.fn(),
        isUpdatingRole: false,
        removeMember: vi.fn(),
        isRemovingMember: false,
        ownerCount: 2,
        isLastOwner: () => false,
      } as never);

      render(<TeamTable isReadOnly={false} />, {
        wrapper: createWrapper(),
      });

      expect(screen.queryByText('(Last Owner)')).not.toBeInTheDocument();

      const removeAliceBtn = screen.getByLabelText('Remove Alice Owner');
      expect(removeAliceBtn).not.toBeDisabled();

      const removeCharlieBtn = screen.getByLabelText('Remove Charlie Co-Owner');
      expect(removeCharlieBtn).not.toBeDisabled();
    });
  });

  describe('RoleSelect component', () => {
    it('disables role select when isLastOwner is true', () => {
      const onRoleChange = vi.fn();
      render(
        <RoleSelect
          currentRole="owner"
          isLastOwner={true}
          onRoleChange={onRoleChange}
        />
      );

      const trigger = screen.getByRole('combobox');
      expect(trigger).toBeDisabled();
      expect(screen.getByText('(Last Owner)')).toBeInTheDocument();
    });

    it('enables role select when isLastOwner is false', () => {
      const onRoleChange = vi.fn();
      render(
        <RoleSelect
          currentRole="employee"
          isLastOwner={false}
          onRoleChange={onRoleChange}
        />
      );

      const trigger = screen.getByRole('combobox');
      expect(trigger).not.toBeDisabled();
    });
  });

  describe('Read-Only Rendering for Non-Owners', () => {
    it('renders roles as badges and hides action buttons when isReadOnly is true', () => {
      vi.spyOn(useMembersModule, 'useMembers').mockReturnValue({
        members: mockSingleOwnerMembers,
        isLoading: false,
        error: null,
        refetch: vi.fn(),
        updateRole: vi.fn(),
        isUpdatingRole: false,
        removeMember: vi.fn(),
        isRemovingMember: false,
        ownerCount: 1,
        isLastOwner: (m: TeamMember) => m.role === 'owner',
      } as never);

      render(<TeamTable isReadOnly={true} />, {
        wrapper: createWrapper(),
      });

      expect(screen.getByText(/you have read-only access/i)).toBeInTheDocument();
      // Role should be rendered as plain badge text, not combobox select
      expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
      expect(screen.getByText('owner')).toBeInTheDocument();
      expect(screen.getByText('employee')).toBeInTheDocument();
      // No trash remove buttons
      expect(screen.queryByLabelText(/remove/i)).not.toBeInTheDocument();
    });
  });
});
