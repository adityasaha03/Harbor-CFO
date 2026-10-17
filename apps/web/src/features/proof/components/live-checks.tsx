'use client';

import * as React from 'react';
import { ShieldCheck, RefreshCw, AlertCircle, ShieldAlert, Sparkles, Loader2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { CheckCard } from './check-card';
import { useProofChecks } from '../api/use-proof-checks';
import { useUpdateSettings } from '@/features/settings';
import { useMe } from '@/features/auth';
import { toast } from 'sonner';

export function LiveChecks(): React.JSX.Element {
  const { data, isLoading, error, refetch, isRefetching } = useProofChecks();
  const updateSettings = useUpdateSettings();
  const { data: me } = useMe();
  const isOwner = me?.role === 'owner';

  const isDemoRestriction = error?.message?.toLowerCase().includes('demo');

  const handleEnableDemo = async () => {
    try {
      await updateSettings.mutateAsync({ isDemo: true });
      await refetch();
      toast.success('Demo Sandbox Mode enabled! Proof checks catalog unlocked.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to enable demo sandbox mode');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-xl font-bold tracking-tight text-foreground">
            <ShieldCheck className="h-5 w-5 text-primary" />
            <span>Live Adversarial Invariant Checks</span>
          </h2>
          <p className="text-sm text-muted-foreground">
            Interactive test suite proving authorization barriers, multi-tenant data isolation, and prompt injection defense.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => void refetch()}
          disabled={isLoading || isRefetching || updateSettings.isPending}
          className="self-start sm:self-auto text-xs font-medium"
        >
          <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${isRefetching ? 'animate-spin' : ''}`} />
          <span>Refresh Checks</span>
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-32 w-full rounded-xl" />
          <Skeleton className="h-32 w-full rounded-xl" />
          <Skeleton className="h-32 w-full rounded-xl" />
        </div>
      ) : isDemoRestriction ? (
        <Card className="border-amber-500/30 bg-amber-50/50 dark:bg-amber-950/20">
          <CardContent className="flex flex-col items-center justify-center p-6 text-center space-y-3">
            <div className="p-3 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <ShieldAlert className="h-7 w-7" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-semibold text-foreground">
                Demo Sandbox Mode Required
              </h3>
              <p className="text-xs text-muted-foreground max-w-md">
                Live adversarial invariant checks (permission barrier verification, cross-tenant isolation, and prompt injection defense) run in evaluation workspaces. Enable Demo Sandbox Mode to execute the live test suite on this company.
              </p>
            </div>
            {isOwner ? (
              <Button
                size="sm"
                onClick={handleEnableDemo}
                disabled={updateSettings.isPending}
                className="mt-2 text-xs"
              >
                {updateSettings.isPending ? (
                  <>
                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                    Enabling Sandbox Mode...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-1.5 h-3.5 w-3.5" />
                    Enable Demo Sandbox Mode
                  </>
                )}
              </Button>
            ) : (
              <p className="text-xs text-muted-foreground italic">
                Only company Owners can enable Demo Sandbox Mode. Please ask your workspace Owner.
              </p>
            )}
          </CardContent>
        </Card>
      ) : error ? (
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="flex flex-col items-center justify-center p-6 text-center">
            <AlertCircle className="h-8 w-8 text-destructive mb-2" />
            <p className="text-sm font-semibold text-destructive">
              Failed to load proof checks catalog
            </p>
            <p className="text-xs text-muted-foreground mt-1 max-w-md">
              {error.message || 'Make sure the Express API is running.'}
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => void refetch()}
              className="mt-3 text-xs"
            >
              Retry
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3.5">
          {data?.checks.map((check) => (
            <CheckCard key={check.id} check={check} />
          ))}
        </div>
      )}
    </div>
  );
}
