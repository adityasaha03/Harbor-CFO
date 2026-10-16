'use client';

import * as React from 'react';
import { AlertTriangle } from 'lucide-react';
import { formatMinor } from '@harbor/contracts';
import type { RepaymentWarning as RepaymentWarningDto } from '@harbor/contracts';

interface RepaymentWarningProps {
  warnings: RepaymentWarningDto[];
}

export function RepaymentWarning({ warnings }: RepaymentWarningProps) {
  if (!warnings || warnings.length === 0) {
    return null;
  }

  return (
    <div
      role="alert"
      className="rounded-lg border border-rose-300 dark:border-rose-800/60 bg-rose-50/90 dark:bg-rose-950/40 p-4 text-rose-950 dark:text-rose-100 shadow-xs space-y-2"
      data-testid="repayment-warning"
    >
      <div className="flex items-start gap-2.5">
        <AlertTriangle className="h-4 w-4 text-rose-600 dark:text-rose-400 mt-0.5 shrink-0" />
        <div className="space-y-1 text-xs">
          <p className="font-semibold text-rose-900 dark:text-rose-200">
            Repayment Risk Warning
          </p>
          {warnings.map((w, idx) => (
            <div key={idx} className="space-y-0.5">
              <p
                className="font-medium text-rose-800 dark:text-rose-200"
                data-testid="repayment-warning-message"
              >
                {w.message}
              </p>
              <p className="text-rose-700/80 dark:text-rose-300/80">
                Breach Date: <span className="font-mono font-medium">{w.date}</span> &bull; Projected
                Closing: <span className="font-mono font-medium">{formatMinor(w.closingMinor)}</span>
                {' '}({w.type === 'negative_cash' ? 'Negative Cash' : 'Below Floor'})
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
