'use client';

import * as React from 'react';
import { formatMinor } from '@harbor/contracts';
import type { ActionProposalDto } from '@harbor/contracts';
import { Card, CardContent } from '@/components/ui/card';
import { ShieldCheck, Info, Hash } from 'lucide-react';

interface PayloadDetailsProps {
  proposal: ActionProposalDto;
}

export function PayloadDetails({ proposal }: PayloadDetailsProps) {
  const { canonicalPayload, payloadHash, baseInputVersion } = proposal;
  const netProceedsMinor = canonicalPayload.principalMinor - canonicalPayload.upfrontFeeMinor;
  const totalCostMinor = canonicalPayload.upfrontFeeMinor + canonicalPayload.interestMinor;
  const totalRepaymentMinor = canonicalPayload.schedule.reduce(
    (acc, item) => acc + item.amountMinor,
    0,
  );

  return (
    <div className="space-y-4" data-testid="payload-details">
      {/* Simulation Reassurance Banner */}
      <div
        role="note"
        className="flex items-center gap-2 p-3 rounded-lg border border-blue-200 dark:border-blue-900 bg-blue-50/70 dark:bg-blue-950/30 text-blue-900 dark:text-blue-200 text-xs"
        data-testid="simulation-notice"
      >
        <Info className="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0" />
        <span className="font-medium">Simulated action. No real money moves.</span>
      </div>

      {/* Main Server-Resolved Financial Terms */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center justify-between border-b border-border/50 pb-2">
            <span className="text-xs text-muted-foreground font-medium">Financing Remedy</span>
            <span className="text-xs font-semibold text-foreground font-mono">
              {canonicalPayload.offerCode} (v{canonicalPayload.offerVersion})
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <span className="text-muted-foreground block text-[11px]">Principal</span>
              <span className="font-mono font-semibold text-foreground text-sm" data-testid="payload-principal">
                {formatMinor(canonicalPayload.principalMinor)}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground block text-[11px]">Net Proceeds</span>
              <span className="font-mono font-semibold text-emerald-600 dark:text-emerald-400 text-sm" data-testid="payload-net-proceeds">
                {formatMinor(netProceedsMinor)}
              </span>
            </div>

            <div>
              <span className="text-muted-foreground block text-[11px]">Upfront Fee</span>
              <span className="font-mono text-muted-foreground">
                {formatMinor(canonicalPayload.upfrontFeeMinor)}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground block text-[11px]">Interest</span>
              <span className="font-mono text-muted-foreground">
                {formatMinor(canonicalPayload.interestMinor)}
              </span>
            </div>

            <div className="pt-2 border-t border-border/40">
              <span className="text-muted-foreground block text-[11px]">Total Borrowing Cost</span>
              <span className="font-mono font-bold text-rose-600 dark:text-rose-400" data-testid="payload-total-cost">
                {formatMinor(totalCostMinor)}
              </span>
            </div>
            <div className="pt-2 border-t border-border/40">
              <span className="text-muted-foreground block text-[11px]">Total Scheduled Repayment</span>
              <span className="font-mono font-bold text-foreground" data-testid="payload-total-repayment">
                {formatMinor(totalRepaymentMinor)}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-border/50 text-[11px] text-muted-foreground">
            <span>Funding Date: <span className="font-mono font-medium text-foreground">{canonicalPayload.fundingOn}</span></span>
            <span>Base Dataset Version: <span className="font-mono font-medium text-foreground">v{baseInputVersion}</span></span>
          </div>
        </CardContent>
      </Card>

      {/* Cryptographic Hash & Verification Badge */}
      <div className="flex items-center justify-between p-2.5 rounded-lg border border-border/60 bg-muted/30 text-xs">
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <Hash className="h-3.5 w-3.5" />
          <span>Payload Hash:</span>
          <span className="font-mono font-semibold text-foreground" data-testid="payload-hash-preview">
            {payloadHash.slice(0, 12)}…
          </span>
        </div>
        <div className="flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
          <ShieldCheck className="h-3.5 w-3.5" />
          <span>Server Verified</span>
        </div>
      </div>

      {/* Repayment Schedule */}
      {canonicalPayload.schedule.length > 0 && (
        <div className="space-y-1.5">
          <span className="text-xs font-medium text-foreground">Installment Schedule</span>
          <div className="rounded-lg border border-border/60 overflow-hidden">
            <table className="w-full text-xs text-left">
              <thead className="bg-muted/40 border-b border-border/50 text-muted-foreground">
                <tr>
                  <th className="py-1.5 px-3 font-medium">Installment</th>
                  <th className="py-1.5 px-3 font-medium">Due Date</th>
                  <th className="py-1.5 px-3 font-medium text-right">Repayment Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40 font-mono">
                {canonicalPayload.schedule.map((item, idx) => (
                  <tr key={idx}>
                    <td className="py-1.5 px-3 font-sans text-muted-foreground">#{idx + 1}</td>
                    <td className="py-1.5 px-3">{item.dueOn}</td>
                    <td className="py-1.5 px-3 text-right font-medium text-foreground">
                      {formatMinor(item.amountMinor)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
