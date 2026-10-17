'use client';

import * as React from 'react';
import { Table as TableIcon, FileText, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatMinor } from '@harbor/contracts';
import type { WeeklyBucket } from '@harbor/contracts';

export interface AccessibleChartSummaryProps {
  weeklyBuckets: WeeklyBucket[];
  floorMinor: number;
  chartTitle?: string;
}

export function AccessibleChartSummary({
  weeklyBuckets,
  floorMinor,
  chartTitle = '13-Week Cash Trajectory',
}: AccessibleChartSummaryProps) {
  const [showTable, setShowTable] = React.useState(false);

  // Compute key narrative points for screen readers and accessibility
  const narrative = React.useMemo(() => {
    if (!weeklyBuckets || weeklyBuckets.length === 0) {
      return 'No forecast data available.';
    }

    const first = weeklyBuckets[0]!;
    const last = weeklyBuckets[weeklyBuckets.length - 1]!;

    let lowestBucket = weeklyBuckets[0]!;
    let breachCount = 0;

    for (const b of weeklyBuckets) {
      if (b.closingMinor < lowestBucket.closingMinor) {
        lowestBucket = b;
      }
      if (b.closingMinor < floorMinor) {
        breachCount++;
      }
    }

    const isNegative = lowestBucket.closingMinor < 0;
    const netFirst =
      first.receiptsMinor +
      first.financingMinor -
      (first.paymentsMinor + first.feesMinor + first.repaymentsMinor);
    const startAmount = first.closingMinor - netFirst;
    const startStr = `Forecast begins at ${formatMinor(startAmount)} on ${first.startDate}.`;
    const lowStr = `Projected low point is ${formatMinor(lowestBucket.closingMinor)} on week ending ${lowestBucket.endDate}${
      isNegative ? ' (negative cash balance)' : ''
    }.`;
    const floorStr =
      breachCount > 0
        ? `Policy floor of ${formatMinor(floorMinor)} is breached across ${breachCount} weekly period${
            breachCount > 1 ? 's' : ''
          }.`
        : `Policy floor of ${formatMinor(floorMinor)} is maintained throughout the forecast horizon.`;
    const endStr = `Trajectory concludes at ${formatMinor(last.closingMinor)} on ${last.endDate}.`;

    return `${startStr} ${lowStr} ${floorStr} ${endStr}`;
  }, [weeklyBuckets, floorMinor]);

  return (
    <div className="mt-3 border-t border-border/50 pt-2 text-xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <FileText className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span className="font-medium text-foreground">Screen Reader & Accessible Summary:</span>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setShowTable((prev) => !prev)}
          className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground self-start sm:self-auto"
          aria-expanded={showTable}
          aria-controls="accessible-cash-table"
        >
          <TableIcon className="h-3.5 w-3.5 mr-1" aria-hidden="true" />
          <span>{showTable ? 'Hide Tabular Alternative' : 'View Tabular Alternative'}</span>
          {showTable ? (
            <ChevronUp className="h-3 w-3 ml-1" />
          ) : (
            <ChevronDown className="h-3 w-3 ml-1" />
          )}
        </Button>
      </div>

      {/* Accessible narrative text */}
      <p className="mt-1 text-muted-foreground leading-relaxed" aria-live="polite">
        {narrative}
      </p>

      {/* Collapsible tabular alternative */}
      {showTable && (
        <div
          id="accessible-cash-table"
          className="mt-3 rounded-md border border-border/70 overflow-x-auto bg-muted/20 p-2"
        >
          <table
            className="w-full text-left text-xs border-collapse"
            aria-label={`${chartTitle} Accessible Data Table`}
          >
            <caption className="sr-only">
              Weekly forecast data points including week dates, closing balance, receipts, payments, and floor status
            </caption>
            <thead>
              <tr className="border-b border-border/60 text-muted-foreground font-semibold">
                <th scope="col" className="p-2">Week Period</th>
                <th scope="col" className="p-2 text-right">Receipts</th>
                <th scope="col" className="p-2 text-right">Payments</th>
                <th scope="col" className="p-2 text-right">Net Cash Flow</th>
                <th scope="col" className="p-2 text-right">Closing Cash</th>
                <th scope="col" className="p-2 text-center">Floor Status</th>
              </tr>
            </thead>
            <tbody>
              {weeklyBuckets.map((bucket, idx) => {
                const isBelow = bucket.closingMinor < floorMinor;
                const isNeg = bucket.closingMinor < 0;

                return (
                  <tr
                    key={bucket.endDate}
                    className={`border-b border-border/40 hover:bg-muted/40 ${
                      idx % 2 === 0 ? 'bg-background/60' : 'bg-transparent'
                    }`}
                  >
                    <th scope="row" className="p-2 font-medium font-mono text-[11px]">
                      {bucket.startDate} → {bucket.endDate}
                    </th>
                    <td className="p-2 text-right font-mono tabular-nums text-emerald-600 dark:text-emerald-400">
                      +{formatMinor(bucket.receiptsMinor)}
                    </td>
                    <td className="p-2 text-right font-mono tabular-nums text-rose-600 dark:text-rose-400">
                      -{formatMinor(bucket.paymentsMinor)}
                    </td>
                    <td className="p-2 text-right font-mono tabular-nums">
                      {(() => {
                        const net =
                          bucket.receiptsMinor +
                          bucket.financingMinor -
                          (bucket.paymentsMinor + bucket.feesMinor + bucket.repaymentsMinor);
                        return `${net >= 0 ? '+' : ''}${formatMinor(net)}`;
                      })()}
                    </td>
                    <td
                      className={`p-2 text-right font-mono tabular-nums font-semibold ${
                        isNeg
                          ? 'text-destructive'
                          : isBelow
                          ? 'text-amber-600 dark:text-amber-400'
                          : 'text-foreground'
                      }`}
                    >
                      {formatMinor(bucket.closingMinor)}
                    </td>
                    <td className="p-2 text-center">
                      {isNeg ? (
                        <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold bg-rose-500/10 text-destructive">
                          Deficit
                        </span>
                      ) : isBelow ? (
                        <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-500/10 text-amber-700 dark:text-amber-300">
                          Below Floor
                        </span>
                      ) : (
                        <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
                          Healthy
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

