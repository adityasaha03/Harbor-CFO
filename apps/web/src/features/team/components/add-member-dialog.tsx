'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { Role } from '@harbor/contracts';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const addMemberSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  email: z.string().min(1, 'Email is required').email('Invalid email address'),
  role: z.enum(['owner', 'employee', 'reviewer']),
  password: z.string().min(8, 'Password must be at least 8 chars').optional().or(z.literal('')),
});

export type AddMemberFormValues = z.infer<typeof addMemberSchema>;

interface AddMemberDialogProps {
  isOpen: boolean;
  isAdding: boolean;
  onClose: () => void;
  onAdd: (data: { name: string; email: string; role: Role; password?: string }) => Promise<void>;
}

export function AddMemberDialog({
  isOpen,
  isAdding,
  onClose,
  onAdd,
}: AddMemberDialogProps) {
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<AddMemberFormValues>({
    resolver: zodResolver(addMemberSchema),
    defaultValues: {
      name: '',
      email: '',
      role: 'employee',
      password: '',
    },
  });

  const selectedRole = watch('role');

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      reset();
      onClose();
    }
  };

  const onSubmit = async (values: AddMemberFormValues) => {
    await onAdd({
      name: values.name,
      email: values.email,
      role: values.role,
      password: values.password || undefined,
    });
    reset();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Team Member</DialogTitle>
          <DialogDescription>
            Directly register an employee to this workspace. They can sign in immediately or register on the sign-up page.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="add-member-name">Full Name</Label>
            <Input
              id="add-member-name"
              placeholder="e.g. Sarah Jenkins"
              disabled={isAdding}
              {...register('name')}
            />
            {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="add-member-email">Work Email</Label>
            <Input
              id="add-member-email"
              type="email"
              placeholder="sarah@company.com"
              disabled={isAdding}
              {...register('email')}
            />
            {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="add-member-role">Designation / Role</Label>
            <Select
              value={selectedRole}
              onValueChange={(val) => setValue('role', val as Role)}
              disabled={isAdding}
            >
              <SelectTrigger id="add-member-role">
                <SelectValue placeholder="Select designation role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="employee">Employee (Operational & Data Import)</SelectItem>
                <SelectItem value="reviewer">Reviewer (Read-only Financials)</SelectItem>
                <SelectItem value="owner">Owner (Full Admin Authority)</SelectItem>
              </SelectContent>
            </Select>
            {errors.role && <p className="text-xs text-destructive">{errors.role.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="add-member-password">Initial Password (Optional)</Label>
            <Input
              id="add-member-password"
              type="password"
              placeholder="Default: Password123!"
              disabled={isAdding}
              {...register('password')}
            />
            <p className="text-[11px] text-muted-foreground">
              If blank, default password is <strong>Password123!</strong>. The member can change it upon signing up.
            </p>
            {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)} disabled={isAdding}>
              Cancel
            </Button>
            <Button type="submit" disabled={isAdding}>
              {isAdding ? 'Adding Member...' : 'Add Member'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

