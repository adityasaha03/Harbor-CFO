'use client';

import { ShieldAlert } from 'lucide-react';

export function FinancingDisclaimer() {
  return (
    <div className="flex items-start gap-2.5 p-4 rounded-xl border border-muted-foreground/20 bg-muted/20 text-xs text-muted-foreground">
      <ShieldAlert className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
      <div className="space-y-1">
        <p className="font-semibold text-foreground/90">
          Synthetic Decision Support Notice
        </p>
        <p className="leading-relaxed">
          HarborCFO provides quantitative simulation and ranking using synthetic, standardized facility terms. This system provides financial decision support and is not credit underwriting, does not constitute an offer or guarantee of credit approval, and is not licensed financial or investment advice. Actual facility approvals depend on institutional lender verification.
        </p>
      </div>
    </div>
  );
}
