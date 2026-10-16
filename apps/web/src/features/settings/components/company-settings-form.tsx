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
import { Lock } from 'lucide-react';

const companySettingsSchema = z.object({
  minimumCashMajor: z
    .string()
    .min(1, 'Liquidity floor is required')
    .regex(/^\d+(\.\d{1,2})?$/, 'Enter a valid amount (e.g. 30000 or 30000.00)'),
  overdueAlertDays: z.coerce
    .number({ invalid_type_error: 'Must be a number' })
    .int('Must be a whole number of days')
    .positive('Must be greater than 0')
    .max(365, 'Cannot exceed 365 days'),
  concentrationThresholdPct: z.coerce
    .number({ invalid_type_error: 'Must be a number' })
    .int('Must be a whole percentage')
    .min(1, 'Minimum is 1%')
    .max(100, 'Maximum is 100%'),
  staleDataDays: z.coerce
    .number({ invalid_type_error: 'Must be a number' })
    .int('Must be a whole number of days')
    .positive('Must be greater than 0')
    .max(365, 'Cannot exceed 365 days'),
});

type CompanySettingsValues = z.infer<typeof companySettingsSchema>;

interface CompanySettingsFormProps {
  settings: TenantSettingsDto;
  isReadOnly?: boolean;
}

export function CompanySettingsForm({ settings, isReadOnly = false }: CompanySettingsFormProps) {
  const updateSettings = useUpdateSettings();

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty, isSubmitting },
    reset,
  } = useForm<CompanySettingsValues>({
    resolver: zodResolver(companySettingsSchema),
    defaultValues: {
      minimumCashMajor: (settings.minimumCashMinor / 100).toFixed(2),
      overdueAlertDays: settings.overdueAlertDays ?? 7,
      concentrationThresholdPct: settings.concentrationThresholdPct ?? 40,
      staleDataDays: settings.staleDataDays ?? 14,
    },
  });

  // Re-sync default values if settings prop changes
  React.useEffect(() => {
    reset({
      minimumCashMajor: (settings.minimumCashMinor / 100).toFixed(2),
      overdueAlertDays: settings.overdueAlertDays ?? 7,
      concentrationThresholdPct: settings.concentrationThresholdPct ?? 40,
      staleDataDays: settings.staleDataDays ?? 14,
    });
  }, [settings, reset]);

  const onSubmit = async (values: CompanySettingsValues) => {
    try {
      const minimumCashMinor = toMinor(values.minimumCashMajor);
      await updateSettings.mutateAsync({
        minimumCashMinor,
        overdueAlertDays: values.overdueAlertDays,
        concentrationThresholdPct: values.concentrationThresholdPct,
        staleDataDays: values.staleDataDays,
      });
      toast.success('Company settings updated');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save settings');
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Company Settings & Thresholds</CardTitle>
        <CardDescription>
          Configure liquidity floor rules, alert sensitivity, and forecast parameters.
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit(onSubmit)}>
        <CardContent className="space-y-4">
          {isReadOnly && (
            <Alert variant="default" className="border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/20 dark:text-amber-300">
              <Lock className="h-4 w-4" />
              <AlertDescription>
                You have read-only access. Only company Owners can modify settings.
              </AlertDescription>
            </Alert>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="minimumCashMajor">Liquidity Floor (CNY)</Label>
              <Input
                id="minimumCashMajor"
                disabled={isReadOnly || isSubmitting}
                placeholder="30000.00"
                {...register('minimumCashMajor')}
              />
              <p className="text-xs text-muted-foreground">
                Minimum safe balance. Cash forecasts dipping below this trigger floor breach alerts.
              </p>
              {errors.minimumCashMajor && (
                <p className="text-xs text-destructive">{errors.minimumCashMajor.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="overdueAlertDays">Overdue Alert Grace Period (Days)</Label>
              <Input
                id="overdueAlertDays"
                type="number"
                disabled={isReadOnly || isSubmitting}
                {...register('overdueAlertDays')}
              />
              <p className="text-xs text-muted-foreground">
                Days past invoice due date before raising a collection alert (default 7 days).
              </p>
              {errors.overdueAlertDays && (
                <p className="text-xs text-destructive">{errors.overdueAlertDays.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="concentrationThresholdPct">Customer Concentration Limit (%)</Label>
              <Input
                id="concentrationThresholdPct"
                type="number"
                disabled={isReadOnly || isSubmitting}
                {...register('concentrationThresholdPct')}
              />
              <p className="text-xs text-muted-foreground">
                Percentage of total outstanding AR held by a single customer before alert (default 40%).
              </p>
              {errors.concentrationThresholdPct && (
                <p className="text-xs text-destructive">{errors.concentrationThresholdPct.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="staleDataDays">Stale Data Warning Window (Days)</Label>
              <Input
                id="staleDataDays"
                type="number"
                disabled={isReadOnly || isSubmitting}
                {...register('staleDataDays')}
              />
              <p className="text-xs text-muted-foreground">
                Days since last import before marking forecast as stale (default 14 days).
              </p>
              {errors.staleDataDays && (
                <p className="text-xs text-destructive">{errors.staleDataDays.message}</p>
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
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </Button>
          </CardFooter>
        )}
      </form>
    </Card>
  );
}
