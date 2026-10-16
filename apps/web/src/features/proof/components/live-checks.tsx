'use client';

import * as React from 'react';
import { ShieldCheck, RefreshCw, AlertCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { CheckCard } from './check-card';
import { useProofChecks } from '../api/use-proof-checks';

export function LiveChecks(): React.JSX.Element {
  const { data, isLoading, error, refetch, isRefetching } = useProofChecks();

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
          disabled={isLoading || isRefetching}
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
      ) : error ? (
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="flex flex-col items-center justify-center p-6 text-center">
            <AlertCircle className="h-8 w-8 text-destructive mb-2" />
            <p className="text-sm font-semibold text-destructive">
              Failed to load proof checks catalog
            </p>
            <p className="text-xs text-muted-foreground mt-1 max-w-md">
              {error.message || 'Make sure the Express API is running and the tenant has demo privileges.'}
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
