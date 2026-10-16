'use client';

import * as React from 'react';
import { CheckCircle2, BookOpen, Layers, ArrowRight } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { formatMinor } from '@harbor/contracts';
import type { ExecuteActionProposalResponse } from '@harbor/contracts';

interface ExecutionResultProps {
  result: ExecuteActionProposalResponse;
}

export function ExecutionResult({ result }: ExecutionResultProps) {
  const { operation, commitment } = result;

  return (
    <div className="space-y-4" data-testid="execution-result">
      {/* Verified Success Header */}
      <div className="p-4 rounded-xl border border-emerald-300 dark:border-emerald-800 bg-emerald-50/90 dark:bg-emerald-950/40 text-emerald-950 dark:text-emerald-100 flex items-start gap-3">
        <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0" />
        <div className="space-y-1">
          <p className="font-semibold text-sm text-emerald-900 dark:text-emerald-200">
            Action Atomically Executed & Committed
          </p>
          <p className="text-xs text-emerald-800/80 dark:text-emerald-300/80">
            The sandbox financing draw has been posted to the ledger, obligations scheduled, and dataset version bumped.
          </p>
        </div>
      </div>

      {/* Operation & Provenance Details */}
      <Card>
        <CardContent className="p-4 space-y-3 text-xs">
          <div className="flex items-center justify-between pb-2 border-b border-border/50">
            <span className="text-muted-foreground font-medium">Operation ID</span>
            <span className="font-mono font-bold text-foreground" data-testid="result-operation-id">
              {operation.operationId}
            </span>
          </div>

          <div className="flex items-center justify-between pb-2 border-b border-border/50">
            <span className="text-muted-foreground font-medium flex items-center gap-1.5">
              <Layers className="h-3.5 w-3.5" />
              Dataset Version Shift
            </span>
            <span className="font-mono font-semibold text-foreground flex items-center gap-1.5" data-testid="result-version-shift">
              <span>v{operation.inputVersion}</span>
              <ArrowRight className="h-3 w-3 text-muted-foreground" />
              <span className="text-emerald-600 dark:text-emerald-400">v{operation.outputVersion}</span>
            </span>
          </div>

          {/* Ledger Entries Created */}
          <div className="space-y-1.5 pt-1">
            <span className="font-medium text-foreground flex items-center gap-1.5">
              <BookOpen className="h-3.5 w-3.5 text-primary" />
              Ledger Mutations ({operation.ledgerEntryIds.length} entries created)
            </span>
            <div className="rounded-lg border border-border/60 bg-muted/20 p-2.5 space-y-2 font-mono">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground font-sans text-[11px]">
                  1. Loan Draw (funded {commitment.fundedOn}):
                </span>
                <span className="text-emerald-600 dark:text-emerald-400 font-bold" data-testid="result-entry-draw">
                  +{formatMinor(commitment.principalMinor)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground font-sans text-[11px]">
                  2. Upfront Loan Fee:
                </span>
                <span className="text-rose-600 dark:text-rose-400 font-bold" data-testid="result-entry-fee">
                  -{formatMinor(commitment.upfrontFeeMinor)}
                </span>
              </div>
            </div>
          </div>

          {/* Financing Obligation Scheduled */}
          <div className="flex items-center justify-between pt-2 border-t border-border/50">
            <span className="text-muted-foreground">Commitment Reference</span>
            <span className="font-mono text-muted-foreground" data-testid="result-commitment-id">
              {commitment.id}
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
