'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { toMinor } from '@harbor/contracts';
import type { TenantSettingsDto } from '@harbor/contracts';
import { useUpdateSettings } from '../api/use-update-settings';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Info, Lock } from 'lucide-react';

const businessProfileSchema = z.object({
  yearsInOperation: z.string().optional().refine(
    (val) => !val || (/^\d+$/.test(val) && Number(val) >= 0),
    'Must be a non-negative integer'
  ),
  employeeCount: z.string().optional().refine(
    (val) => !val || (/^\d+$/.test(val) && Number(val) >= 0),
    'Must be a non-negative integer'
  ),
  industry: z.string().max(100).optional(),
  monthlyRevenueMajor: z.string().optional().refine(
    (val) => !val || /^\d+(\.\d{1,2})?$/.test(val),
    'Enter a valid positive amount'
  ),
  monthlyCardSalesMajor: z.string().optional().refine(
    (val) => !val || /^\d+(\.\d{1,2})?$/.test(val),
    'Enter a valid positive amount'
  ),
});

type BusinessProfileValues = z.infer<typeof businessProfileSchema>;

interface BusinessProfileFormProps {
  settings: TenantSettingsDto;
  isReadOnly?: boolean;
}

export function BusinessProfileForm({ settings, isReadOnly = false }: BusinessProfileFormProps) {
  const updateSettings = useUpdateSettings();
  const profile = settings.profile ?? {};

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty, isSubmitting },
    reset,
  } = useForm<BusinessProfileValues>({
    resolver: zodResolver(businessProfileSchema),
    defaultValues: {
      yearsInOperation: profile.yearsInOperation !== undefined ? String(profile.yearsInOperation) : '',
      employeeCount: profile.employeeCount !== undefined ? String(profile.employeeCount) : '',
      industry: profile.industry ?? '',
      monthlyRevenueMajor: profile.monthlyRevenueMinor !== undefined
        ? (profile.monthlyRevenueMinor / 100).toFixed(2)
        : '',
      monthlyCardSalesMajor: profile.monthlyCardSalesMinor !== undefined
        ? (profile.monthlyCardSalesMinor / 100).toFixed(2)
        : '',
    },
  });

  React.useEffect(() => {
    reset({
      yearsInOperation: profile.yearsInOperation !== undefined ? String(profile.yearsInOperation) : '',
      employeeCount: profile.employeeCount !== undefined ? String(profile.employeeCount) : '',
      industry: profile.industry ?? '',
      monthlyRevenueMajor: profile.monthlyRevenueMinor !== undefined
        ? (profile.monthlyRevenueMinor / 100).toFixed(2)
        : '',
      monthlyCardSalesMajor: profile.monthlyCardSalesMinor !== undefined
        ? (profile.monthlyCardSalesMinor / 100).toFixed(2)
        : '',
    });
  }, [profile, reset]);

  const onSubmit = async (values: BusinessProfileValues) => {
    try {
      await updateSettings.mutateAsync({
        profile: {
          yearsInOperation: values.yearsInOperation ? parseInt(values.yearsInOperation, 10) : undefined,
          employeeCount: values.employeeCount ? parseInt(values.employeeCount, 10) : undefined,
          industry: values.industry?.trim() || undefined,
          monthlyRevenueMinor: values.monthlyRevenueMajor ? toMinor(values.monthlyRevenueMajor) : undefined,
          monthlyCardSalesMinor: values.monthlyCardSalesMajor ? toMinor(values.monthlyCardSalesMajor) : undefined,
        },
      });
      toast.success('Business profile updated');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save business profile');
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Business & Financing Profile</CardTitle>
        <CardDescription>
          Information used for credit policy checks and automatic financing offer matching. Missing profile values will cause lenders to report &quot;cannot assess&quot;.
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit(onSubmit)}>
        <CardContent className="space-y-4">
          {isReadOnly && (
            <Alert variant="default" className="border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/20 dark:text-amber-300">
              <Lock className="h-4 w-4" />
              <AlertDescription>
                You have read-only access. Only company Owners can modify business profile.
              </AlertDescription>
            </Alert>
          )}

          <div className="rounded-lg border bg-muted/40 p-3 text-xs text-muted-foreground flex gap-2 items-start">
            <Info className="h-4 w-4 shrink-0 text-primary mt-0.5" />
            <span>
              Lenders evaluate tenure (e.g. min 2 years), team size, monthly turnover, and card receipts when ranking working capital loans and invoice factoring products.
            </span>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="yearsInOperation">Years in Operation</Label>
              <Input
                id="yearsInOperation"
                type="number"
                disabled={isReadOnly || isSubmitting}
                placeholder="e.g. 5"
                {...register('yearsInOperation')}
              />
              {errors.yearsInOperation && (
                <p className="text-xs text-destructive">{errors.yearsInOperation.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="employeeCount">Employee Count</Label>
              <Input
                id="employeeCount"
                type="number"
                disabled={isReadOnly || isSubmitting}
                placeholder="e.g. 24"
                {...register('employeeCount')}
              />
              {errors.employeeCount && (
                <p className="text-xs text-destructive">{errors.employeeCount.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="industry">Industry Sector</Label>
              <Input
                id="industry"
                disabled={isReadOnly || isSubmitting}
                placeholder="e.g. Wholesale Trading & Distribution"
                {...register('industry')}
              />
              {errors.industry && (
                <p className="text-xs text-destructive">{errors.industry.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="monthlyRevenueMajor">Average Monthly Revenue (CNY)</Label>
              <Input
                id="monthlyRevenueMajor"
                disabled={isReadOnly || isSubmitting}
                placeholder="e.g. 250000.00"
                {...register('monthlyRevenueMajor')}
              />
              {errors.monthlyRevenueMajor && (
                <p className="text-xs text-destructive">{errors.monthlyRevenueMajor.message}</p>
              )}
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="monthlyCardSalesMajor">Monthly Card / Electronic Sales (CNY)</Label>
              <Input
                id="monthlyCardSalesMajor"
                disabled={isReadOnly || isSubmitting}
                placeholder="e.g. 80000.00"
                {...register('monthlyCardSalesMajor')}
              />
              <p className="text-xs text-muted-foreground">
                Merchant cash advances and revenue financing require verified card sales data.
              </p>
              {errors.monthlyCardSalesMajor && (
                <p className="text-xs text-destructive">{errors.monthlyCardSalesMajor.message}</p>
              )}
            </div>
          </div>
        </CardContent>

        {!isReadOnly && (
          <CardFooter className="flex justify-end gap-2 border-t pt-4">
            <Button
              type="submit"
              disabled={!isDirty || isSubmitting}
            >
              {isSubmitting ? 'Saving...' : 'Save Profile'}
            </Button>
          </CardFooter>
        )}
      </form>
    </Card>
  );
}
