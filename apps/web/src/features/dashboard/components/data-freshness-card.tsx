'use client';

import * as React from 'react';
import Link from 'next/link';
import { RefreshCw, CheckCircle2, AlertTriangle, UploadCloud } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export interface DataFreshnessCardProps {
  lastImportAt?: string | null;
  isStale?: boolean;
}

export function DataFreshnessCard({ lastImportAt, isStale = false }: DataFreshnessCardProps) {
  const formattedDate = React.useMemo(() => {
    if (!lastImportAt) return 'Never imported';
    try {
      const d = new Date(lastImportAt);
      return new Intl.DateTimeFormat('en-US', {
        dateStyle: 'medium',
        timeStyle: 'short',
      }).format(d);
    } catch {
      return lastImportAt;
    }
  }, [lastImportAt]);

  return (
    <Card className="border-border/80 shadow-xs" data-testid="data-freshness-card">
      <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
        <div>
          <CardTitle className="text-sm font-semibold">Data Freshness</CardTitle>
          <CardDescription className="text-xs">
            Synchronization status with bank and ERP feeds
          </CardDescription>
        </div>
        <div className="p-1.5 rounded-md bg-muted text-muted-foreground">
          <RefreshCw className="h-4 w-4" />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <p className="text-xs text-muted-foreground">Last Reconciled Import</p>
            <p className="text-sm font-medium text-foreground">{formattedDate}</p>
          </div>
          <div
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
              isStale
                ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30'
                : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
            }`}
          >
            {isStale ? (
              <>
                <AlertTriangle className="h-3.5 w-3.5" />
                <span>Stale (Re-sync required)</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>Up to Date</span>
              </>
            )}
          </div>
        </div>

        {isStale && (
          <div className="rounded-md bg-amber-500/10 p-2.5 border border-amber-500/30 text-xs text-amber-800 dark:text-amber-300">
            Ledger transactions have changed since the last forecast run. Re-run or import new bank records.
          </div>
        )}

        <div className="flex items-center justify-between pt-1 border-t border-border/50">
          <span className="text-[11px] text-muted-foreground">Source: Bank feeds & CSV imports</span>
          <Button asChild variant="ghost" size="sm" className="h-7 text-xs text-primary">
            <Link href="/imports" className="inline-flex items-center gap-1">
              <UploadCloud className="h-3.5 w-3.5" />
              <span>Import Data</span>
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
