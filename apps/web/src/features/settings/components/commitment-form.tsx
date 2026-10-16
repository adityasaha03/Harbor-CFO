'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { toMinor } from '@harbor/contracts';
import type { CommitmentDto, LedgerCategory, CommitmentFrequency, CommitmentDirection } from '@harbor/contracts';
import { useCreateCommitment, useUpdateCommitment } from '../api/use-commitment-mutations';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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

const commitmentFormSchema = z.object({
  label: z.string().min(1, 'Label is required').max(200),
  direction: z.enum(['inflow', 'outflow']),
  category: z.enum([
    'customer_receipt',
    'supplier_payment',
    'payroll',
    'rent',
    'overhead',
    'tax',
    'loan_draw',
    'loan_fee',
    'loan_repayment',
    'other_income',
    'other_expense',
  ]),
  amountMajor: z
    .string()
    .min(1, 'Amount is required')
    .regex(/^\d+(\.\d{1,2})?$/, 'Must be a valid positive amount'),
  frequency: z.enum(['once', 'weekly', 'biweekly', 'monthly']),
  anchorOn: z
    .string()
    .min(1, 'First occurrence date is required')
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
  endOn: z
    .string()
    .optional()
    .refine((val) => !val || /^\d{4}-\d{2}-\d{2}$/.test(val), 'Date must be YYYY-MM-DD'),
});

type CommitmentFormValues = z.infer<typeof commitmentFormSchema>;

interface CommitmentFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  commitmentToEdit?: CommitmentDto | null;
}

export function CommitmentFormDialog({
  open,
  onOpenChange,
  commitmentToEdit,
}: CommitmentFormDialogProps) {
  const isEditing = Boolean(commitmentToEdit);
  const createCommitment = useCreateCommitment();
  const updateCommitment = useUpdateCommitment();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<CommitmentFormValues>({
    resolver: zodResolver(commitmentFormSchema),
    defaultValues: {
      label: '',
      direction: 'outflow',
      category: 'payroll',
      amountMajor: '',
      frequency: 'monthly',
      anchorOn: new Date().toISOString().slice(0, 10),
      endOn: '',
    },
  });

  React.useEffect(() => {
    if (commitmentToEdit) {
      reset({
        label: commitmentToEdit.label,
        direction: commitmentToEdit.direction,
        category: commitmentToEdit.category,
        amountMajor: (commitmentToEdit.amountMinor / 100).toFixed(2),
        frequency: commitmentToEdit.frequency,
        anchorOn: commitmentToEdit.anchorOn,
        endOn: commitmentToEdit.endOn ?? '',
      });
    } else {
      reset({
        label: '',
        direction: 'outflow',
        category: 'payroll',
        amountMajor: '',
        frequency: 'monthly',
        anchorOn: new Date().toISOString().slice(0, 10),
        endOn: '',
      });
    }
  }, [commitmentToEdit, reset, open]);

  const selectedDirection = watch('direction');
  const selectedCategory = watch('category');
  const selectedFrequency = watch('frequency');

  const onSubmit = async (values: CommitmentFormValues) => {
    try {
      const amountMinor = toMinor(values.amountMajor);
      if (amountMinor <= 0) {
        toast.error('Amount must be positive');
        return;
      }

      if (isEditing && commitmentToEdit) {
        await updateCommitment.mutateAsync({
          id: commitmentToEdit.id,
          data: {
            label: values.label.trim(),
            direction: values.direction as CommitmentDirection,
            category: values.category as LedgerCategory,
            amountMinor,
            frequency: values.frequency as CommitmentFrequency,
            anchorOn: values.anchorOn,
            endOn: values.endOn?.trim() || undefined,
          },
        });
        toast.success('Commitment updated');
      } else {
        await createCommitment.mutateAsync({
          label: values.label.trim(),
          direction: values.direction as CommitmentDirection,
          category: values.category as LedgerCategory,
          amountMinor,
          frequency: values.frequency as CommitmentFrequency,
          anchorOn: values.anchorOn,
          endOn: values.endOn?.trim() || undefined,
        });
        toast.success('Commitment created');
      }
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save commitment');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Commitment' : 'Add Recurring Commitment'}</DialogTitle>
          <DialogDescription>
            Recurring cash flows (like rent or payroll) are projected forward in the 91-day cash forecast.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="commitment-label">Label</Label>
            <Input
              id="commitment-label"
              placeholder="e.g. Monthly Office Rent"
              {...register('label')}
            />
            {errors.label && (
              <p className="text-xs text-destructive">{errors.label.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Direction</Label>
              <Select
                value={selectedDirection}
                onValueChange={(val) => setValue('direction', val as 'inflow' | 'outflow')}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Direction" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="outflow">Outflow (Expense)</SelectItem>
                  <SelectItem value="inflow">Inflow (Income)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Frequency</Label>
              <Select
                value={selectedFrequency}
                onValueChange={(val) =>
                  setValue('frequency', val as 'once' | 'weekly' | 'biweekly' | 'monthly')
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Frequency" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="once">Once</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="biweekly">Bi-weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Category</Label>
              <Select
                value={selectedCategory}
                onValueChange={(val) => setValue('category', val as CommitmentFormValues['category'])}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="payroll">Payroll</SelectItem>
                  <SelectItem value="rent">Rent</SelectItem>
                  <SelectItem value="overhead">Overhead</SelectItem>
                  <SelectItem value="tax">Tax</SelectItem>
                  <SelectItem value="supplier_payment">Supplier Payment</SelectItem>
                  <SelectItem value="customer_receipt">Customer Receipt</SelectItem>
                  <SelectItem value="other_expense">Other Expense</SelectItem>
                  <SelectItem value="other_income">Other Income</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="commitment-amount">Amount (CNY)</Label>
              <Input
                id="commitment-amount"
                placeholder="e.g. 45000.00"
                {...register('amountMajor')}
              />
              {errors.amountMajor && (
                <p className="text-xs text-destructive">{errors.amountMajor.message}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="commitment-anchor">First Date (Anchor)</Label>
              <Input
                id="commitment-anchor"
                type="date"
                {...register('anchorOn')}
              />
              {errors.anchorOn && (
                <p className="text-xs text-destructive">{errors.anchorOn.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="commitment-end">End Date (Optional)</Label>
              <Input
                id="commitment-end"
                type="date"
                {...register('endOn')}
              />
              {errors.endOn && (
                <p className="text-xs text-destructive">{errors.endOn.message}</p>
              )}
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : isEditing ? 'Update Commitment' : 'Add Commitment'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
