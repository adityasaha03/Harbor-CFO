'use client';

import * as React from 'react';
import type { Role } from '@harbor/contracts';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface RoleSelectProps {
  currentRole: Role;
  isLastOwner: boolean;
  disabled?: boolean;
  onRoleChange: (newRole: Role) => void;
}

export function RoleSelect({
  currentRole,
  isLastOwner,
  disabled = false,
  onRoleChange,
}: RoleSelectProps) {
  const isSelectDisabled = disabled || isLastOwner;

  return (
    <div className="flex items-center gap-2">
      <Select
        value={currentRole}
        disabled={isSelectDisabled}
        onValueChange={(val) => onRoleChange(val as Role)}
      >
        <SelectTrigger
          className="w-[130px] h-8 text-xs capitalize"
          aria-label={`Role: ${currentRole}`}
          title={isLastOwner ? 'Cannot demote the last Owner' : undefined}
        >
          <SelectValue placeholder="Select role" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="owner">Owner</SelectItem>
          <SelectItem value="employee">Employee</SelectItem>
          <SelectItem value="reviewer">Reviewer</SelectItem>
        </SelectContent>
      </Select>
      {isLastOwner && (
        <span
          className="text-[11px] text-muted-foreground whitespace-nowrap"
          title="At least one Owner is required"
        >
          (Last Owner)
        </span>
      )}
    </div>
  );
}
