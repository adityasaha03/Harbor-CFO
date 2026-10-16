'use client';

import * as React from 'react';
import { CheckCircle2, XCircle, AlertCircle, ShieldCheck, ArrowRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { ProofCheckRunResult } from '@harbor/contracts';

interface CheckResultProps {
  result: ProofCheckRunResult;
}

export function CheckResult({ result }: CheckResultProps): React.JSX.Element {
  const isApplicable = result.actual !== 'NOT_APPLICABLE';
  const hasState = !!result.stateBefore && !!result.stateAfter;

  const stateKeys = hasState
    ? Array.from(
        new Set([
          ...Object.keys(result.stateBefore ?? {}),
          ...Object.keys(result.stateAfter ?? {}),
        ])
      )
    : [];

  return (
    <div className="space-y-3.5 rounded-lg border border-border/50 bg-background/80 p-4">
      {/* Header status */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/40 pb-3">
        <div className="flex items-center gap-2">
          {result.passed ? (
            <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="h-5 w-5" />
              <span className="text-sm font-bold tracking-tight">Check Passed</span>
            </div>
          ) : !isApplicable ? (
            <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
              <AlertCircle className="h-5 w-5" />
              <span className="text-sm font-bold tracking-tight">Role Prerequisite</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-rose-600 dark:text-rose-400">
              <XCircle className="h-5 w-5" />
              <span className="text-sm font-bold tracking-tight">Check Failed</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Badge
            variant={result.passed ? 'default' : !isApplicable ? 'outline' : 'destructive'}
            className="text-xs"
          >
            {result.passed ? 'PASSED' : !isApplicable ? 'NOT APPLICABLE' : 'FAILED'}
          </Badge>
          <span className="font-mono text-[11px] text-muted-foreground">
            {new Date(result.executedAt).toLocaleTimeString()}
          </span>
        </div>
      </div>

      {/* Expected vs Actual */}
      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
        <div className="rounded-md border border-border/40 bg-muted/20 p-2.5">
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
            Expected
          </p>
          <p className="mt-1 font-mono text-xs font-medium text-foreground break-all">
            {result.expected}
          </p>
        </div>

        <div className="rounded-md border border-border/40 bg-muted/20 p-2.5">
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
            Actual Server Result
          </p>
          <p className="mt-1 font-mono text-xs font-semibold text-foreground break-all">
            {result.actual}
          </p>
        </div>
      </div>

      {result.message && (
        <p className="text-xs leading-relaxed text-muted-foreground">
          {result.message}
        </p>
      )}

      {/* Before / After State Diff */}
      {hasState && stateKeys.length > 0 && (
        <div className="space-y-2 pt-1">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
            <span>State Invariant Verification (Before vs After)</span>
          </div>

          <div className="overflow-hidden rounded-md border border-border/40">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/40 font-semibold text-muted-foreground">
                <tr className="border-b border-border/40">
                  <th className="px-3 py-2">Domain Entity / Record</th>
                  <th className="px-3 py-2 text-center">Before Attempt</th>
                  <th className="px-3 py-2 text-center"></th>
                  <th className="px-3 py-2 text-center">After Attempt</th>
                  <th className="px-3 py-2 text-right">State Mutation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/30">
                {stateKeys.map((key) => {
                  const beforeVal = String(result.stateBefore?.[key] ?? '-');
                  const afterVal = String(result.stateAfter?.[key] ?? '-');
                  const unchanged = beforeVal === afterVal;

                  return (
                    <tr key={key} className="hover:bg-muted/10">
                      <td className="px-3 py-2 font-mono text-xs text-foreground font-medium">
                        {key}
                      </td>
                      <td className="px-3 py-2 text-center font-mono text-xs text-muted-foreground">
                        {beforeVal}
                      </td>
                      <td className="px-1 py-2 text-center text-muted-foreground">
                        <ArrowRight className="h-3 w-3 inline opacity-50" />
                      </td>
                      <td className="px-3 py-2 text-center font-mono text-xs text-muted-foreground">
                        {afterVal}
                      </td>
                      <td className="px-3 py-2 text-right">
                        {unchanged ? (
                          <span className="inline-flex items-center gap-1 rounded bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                            Unchanged (0 diff)
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded bg-rose-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-rose-600 dark:text-rose-400">
                            Mutated
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
