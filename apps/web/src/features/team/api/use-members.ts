'use client';

import * as React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { authClient } from '@/features/auth';
import { useActiveCompany } from '@/features/tenants';
import type { Role } from '@harbor/contracts';

export interface TeamMember {
  id: string;
  userId: string;
  role: Role;
  createdAt: string;
  user: {
    id: string;
    name: string;
    email: string;
    image?: string | null;
  };
}

export function useMembers() {
  const queryClient = useQueryClient();
  const { activeCompany } = useActiveCompany();
  const organizationId = activeCompany?.id;

  const queryKey = ['team-members', organizationId] as const;

  const {
    data: members = [],
    isLoading,
    error,
    refetch,
  } = useQuery<TeamMember[]>({
    queryKey,
    enabled: Boolean(organizationId),
    queryFn: async () => {
      if (!organizationId) return [];

      const res = await authClient.organization.getFullOrganization({
        query: { organizationId },
      });

      if (res.error) {
        throw new Error(res.error.message || 'Failed to fetch team members');
      }

      interface MemberItem {
        id: string;
        userId: string;
        role: string;
        createdAt: string | Date;
        user?: { id?: string; name?: string; email?: string; image?: string | null };
      }

      const rawMembers = (res.data?.members || []) as unknown as MemberItem[];
      return rawMembers.map((m) => ({
        id: m.id,
        userId: m.userId,
        role: m.role as Role,
        createdAt: typeof m.createdAt === 'string' ? m.createdAt : m.createdAt?.toISOString?.() || '',
        user: {
          id: m.user?.id || m.userId,
          name: m.user?.name || 'Unnamed Member',
          email: m.user?.email || '',
          image: m.user?.image ?? null,
        },
      }));
    },
  });

  const updateRoleMutation = useMutation({
    mutationFn: async ({ memberId, role }: { memberId: string; role: Role }) => {
      const res = await authClient.organization.updateMemberRole({
        memberId,
        role,
        organizationId,
      });
      if (res.error) {
        throw new Error(res.error.message || 'Failed to update member role');
      }
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  const removeMemberMutation = useMutation({
    mutationFn: async (memberIdOrEmail: string) => {
      const res = await authClient.organization.removeMember({
        memberIdOrEmail,
        organizationId,
      });
      if (res.error) {
        throw new Error(res.error.message || 'Failed to remove team member');
      }
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  const addMemberMutation = useMutation({
    mutationFn: async (data: { name: string; email: string; role: Role; password?: string }) => {
      const res = await fetch('/api/team/members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, organizationId }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { message?: string };
        throw new Error(body.message || 'Failed to add team member');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  const editMemberMutation = useMutation({
    mutationFn: async (data: { memberId: string; name?: string; role?: Role }) => {
      const res = await fetch('/api/team/members', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, organizationId }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { message?: string };
        throw new Error(body.message || 'Failed to update team member');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  const ownerCount = React.useMemo(() => {
    return members.filter((m) => m.role === 'owner').length;
  }, [members]);

  const isLastOwner = React.useCallback(
    (member: TeamMember) => {
      return member.role === 'owner' && ownerCount <= 1;
    },
    [ownerCount]
  );

  return {
    members,
    isLoading,
    error,
    refetch,
    updateRole: updateRoleMutation.mutateAsync,
    isUpdatingRole: updateRoleMutation.isPending,
    removeMember: removeMemberMutation.mutateAsync,
    isRemovingMember: removeMemberMutation.isPending,
    addMember: addMemberMutation.mutateAsync,
    isAddingMember: addMemberMutation.isPending,
    editMember: editMemberMutation.mutateAsync,
    isEditingMember: editMemberMutation.isPending,
    ownerCount,
    isLastOwner,
  };
}
