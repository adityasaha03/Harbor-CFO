'use client';

import { XCircle, Info } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatMinor, type ExcludedOffer } from '@harbor/contracts';

interface ExcludedOffersProps {
  excluded: ExcludedOffer[];
}

export function formatEligibilityReason(code: string, fallbackExplanation: string): string {
  switch (code) {
    case 'FUNDS_TOO_LATE':
      return 'Funds arrive after cash first falls below the floor (underwriting and disbursement delay exceeds days until projected breach).';
    case 'PURPOSE_NOT_SUPPORTED':
      return 'Facility does not support the selected purpose (e.g. equipment leasing requires equipment purchase purpose).';
    case 'INVOICE_EVIDENCE_REQUIRED':
      return 'Invoice advance requires at least one open, verified accounts receivable invoice.';
    case 'AMOUNT_OUT_OF_RANGE':
      return 'Required funding amount falls outside the allowable borrowing range for this facility.';
    case 'CURRENCY_UNSUPPORTED':
      return 'Financing is currently denominated and available in CNY only.';
    case 'MIN_YEARS_NOT_MET':
      return 'Business does not meet the minimum operating tenure requirement.';
    default:
      if (code.startsWith('MISSING_ATTRIBUTE:')) {
        const attr = code.replace('MISSING_ATTRIBUTE:', '');
        return `Required business profile attribute "${attr}" is missing.`;
      }
      return fallbackExplanation;
  }
}

export function ExcludedOffers({ excluded }: ExcludedOffersProps) {
  if (excluded.length === 0) return null;

  return (
    <div className="space-y-3 pt-2">
      <div className="flex items-center gap-2">
        <h3 className="text-base font-semibold text-foreground">
          Excluded Facilities ({excluded.length})
        </h3>
        <Badge variant="outline" className="text-xs border-muted-foreground/30 text-muted-foreground">
          Ineligible
        </Badge>
      </div>
      <p className="text-xs text-muted-foreground">
        These facilities were evaluated against your current liquidity profile but failed one or more eligibility criteria.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        {excluded.map(({ offer, reasons }) => (
          <Card key={offer.code} className="border-border/60 bg-muted/20 opacity-80 hover:opacity-100 transition-opacity">
            <CardHeader className="p-4 pb-2">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="text-sm font-semibold text-foreground">
                      {offer.name}
                    </h4>
                    <Badge variant="outline" className="text-[10px] text-muted-foreground">
                      Synthetic
                    </Badge>
                  </div>
                  <span className="text-[11px] text-muted-foreground capitalize">
                    {offer.type.replace('_', ' ')} • Limits: {formatMinor(offer.minAmountMinor)} - {formatMinor(offer.maxAmountMinor)}
                  </span>
                </div>
                <div className="p-1 rounded-full bg-destructive/10 text-destructive shrink-0">
                  <XCircle className="h-4 w-4" />
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-4 pt-1 space-y-2">
              <div className="space-y-1.5 pt-1">
                {reasons.map((r, i) => (
                  <div key={i} className="flex items-start gap-1.5 text-xs text-muted-foreground bg-background/80 p-2 rounded-md border border-border/40">
                    <Info className="h-3.5 w-3.5 text-destructive shrink-0 mt-0.5" />
                    <span className="leading-relaxed">
                      {formatEligibilityReason(r.code, r.explanation)}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
