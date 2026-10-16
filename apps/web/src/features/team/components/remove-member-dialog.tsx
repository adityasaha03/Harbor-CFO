'use client';

import * as React from 'react';
import type { TeamMember } from '../api/use-members';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface RemoveMemberDialogProps {
  member: TeamMember | null;
  isOpen: boolean;
  isRemoving: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}

export function RemoveMemberDialog({
  member,
  isOpen,
  isRemoving,
  onClose,
  onConfirm,
}: RemoveMemberDialogProps) {
  if (!member) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle>Remove Team Member</DialogTitle>
          <DialogDescription>
            Are you sure you want to remove <strong>{member.user.name}</strong> ({member.user.email}) from this company?
            They will immediately lose access to all company financial data and settings.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 pt-2">
          <Button variant="outline" onClick={onClose} disabled={isRemoving}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={onConfirm}
            disabled={isRemoving}
          >
            {isRemoving ? 'Removing...' : 'Remove Member'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
