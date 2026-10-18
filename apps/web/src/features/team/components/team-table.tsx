'use client';

import * as React from 'react';
import { toast } from 'sonner';
import type { Role } from '@harbor/contracts';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useMembers, type TeamMember } from '../api/use-members';
import { RoleSelect } from './role-select';
import { RemoveMemberDialog } from './remove-member-dialog';
import { AddMemberDialog } from './add-member-dialog';
import { Lock, Trash2, Users, UserPlus } from 'lucide-react';

interface TeamTableProps {
  isReadOnly?: boolean;
}

export function TeamTable({ isReadOnly = false }: TeamTableProps) {
  const {
    members,
    isLoading,
    error,
    updateRole,
    removeMember,
    isRemovingMember,
    addMember,
    isAddingMember,
    isLastOwner,
  } = useMembers();

  const [memberToRemove, setMemberToRemove] = React.useState<TeamMember | null>(null);
  const [addOpen, setAddOpen] = React.useState(false);

  const handleRoleChange = async (member: TeamMember, newRole: Role) => {
    if (member.role === newRole) return;
    if (isLastOwner(member) && newRole !== 'owner') {
      toast.error('Cannot demote the last Owner. Transfer ownership to another member first.');
      return;
    }
    try {
      await updateRole({ memberId: member.id, role: newRole });
      toast.success(`Role updated to ${newRole}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update role');
    }
  };

  const handleConfirmRemove = async () => {
    if (!memberToRemove) return;
    if (isLastOwner(memberToRemove)) {
      toast.error('Cannot remove the last Owner.');
      setMemberToRemove(null);
      return;
    }
    try {
      await removeMember(memberToRemove.id);
      toast.success(`${memberToRemove.user.name} removed from team`);
      setMemberToRemove(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to remove member');
    }
  };

  const handleAddMember = async (data: { name: string; email: string; role: Role; password?: string }) => {
    try {
      await addMember(data);
      toast.success(`${data.name} added to team as ${data.role}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to add member');
      throw err;
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between space-y-0">
        <div>
          <CardTitle className="text-lg">Team Members &amp; Permissions</CardTitle>
          <CardDescription>Manage company members, assign role tiers (Owner, Employee), and manage workspace access.</CardDescription>
        </div>
        {!isReadOnly && (
          <Button onClick={() => setAddOpen(true)} size="sm" className="gap-1">
            <UserPlus className="h-4 w-4" />
            Add Member
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {isReadOnly && (
          <Alert variant="default" className="border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/20 dark:text-amber-300">
            <Lock className="h-4 w-4" />
            <AlertDescription>You have read-only access. Only company Owners can change roles or remove members.</AlertDescription>
          </Alert>
        )}

        <div className="rounded-lg border bg-muted/30 p-3 text-xs text-muted-foreground flex gap-2 items-center">
          <Users className="h-4 w-4 shrink-0 text-primary" />
          <span>Role tiers: <strong>Owner</strong> has full administration &amp; money actions; <strong>Employee</strong> can import data and propose financing.</span>
        </div>

        {isLoading ? (
          <div className="py-8 text-center text-sm text-muted-foreground">Loading team members...</div>
        ) : error ? (
          <div className="py-8 text-center text-sm text-destructive">Failed to load team: {error.message}</div>
        ) : members.length === 0 ? (
          <div className="py-8 text-center text-sm text-muted-foreground">No members found in active company.</div>
        ) : (
          <div className="rounded-md border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Member</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  {!isReadOnly && <TableHead className="w-[80px] text-right">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {members.map((member) => {
                  const lastOwner = isLastOwner(member);
                  return (
                    <TableRow key={member.id}>
                      <TableCell className="font-medium">
                        <div className="flex flex-col">
                          <span>{member.user.name}</span>
                          <span className="text-[11px] text-muted-foreground sm:hidden">{member.user.email}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">{member.user.email}</TableCell>
                      <TableCell>
                        {isReadOnly ? (
                          <Badge variant="outline" className="capitalize">{member.role}</Badge>
                        ) : (
                          <RoleSelect currentRole={member.role} isLastOwner={lastOwner} disabled={isReadOnly} onRoleChange={(newRole) => handleRoleChange(member, newRole)} />
                        )}
                      </TableCell>
                      {!isReadOnly && (
                        <TableCell className="text-right">
                          <Button variant="ghost" size="icon" disabled={lastOwner} onClick={() => setMemberToRemove(member)} aria-label={`Remove ${member.user.name}`} title={lastOwner ? 'Cannot remove the last Owner' : 'Remove member'} className="text-destructive hover:text-destructive disabled:opacity-30">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>

      <AddMemberDialog isOpen={addOpen} isAdding={isAddingMember} onClose={() => setAddOpen(false)} onAdd={handleAddMember} />
      <RemoveMemberDialog member={memberToRemove} isOpen={Boolean(memberToRemove)} isRemoving={isRemovingMember} onClose={() => setMemberToRemove(null)} onConfirm={handleConfirmRemove} />
    </Card>
  );
}
