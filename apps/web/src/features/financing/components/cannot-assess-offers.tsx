'use client';

import Link from 'next/link';
import { HelpCircle, ArrowUpRight, Settings } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatMinor, type CannotAssessOffer } from '@harbor/contracts';

interface CannotAssessOffersProps {
  cannotAssess: CannotAssessOffer[];
}

function formatMissingField(field: string): string {
  switch (field) {
    case 'monthlyCardSalesMinor':
      return 'Monthly Card Settlement Velocity (Card Sales)';
    case 'yearsInOperation':
      return 'Operating Tenure (Years in Business)';
    case 'monthlyRevenueMinor':
      return 'Average Monthly Revenue';
    default:
      return field;
  }
}

export function CannotAssessOffers({ cannotAssess }: CannotAssessOffersProps) {
  if (cannotAssess.length === 0) return null;

  return (
    <div className="space-y-3 pt-2">
      <div className="flex items-center gap-2">
        <h3 className="text-base font-semibold text-foreground">
          Pending Profile Attributes ({cannotAssess.length})
        </h3>
        <Badge variant="outline" className="text-xs border-amber-500/30 text-amber-600 dark:text-amber-400">
          Cannot Assess
        </Badge>
      </div>
      <p className="text-xs text-muted-foreground">
        These facilities require verified business profile metrics to evaluate borrowing limits and eligibility.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        {cannotAssess.map(({ offer, missing }) => (
          <Card key={offer.code} className="border-amber-500/20 bg-amber-50/20 dark:bg-amber-950/10">
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
                <div className="p-1 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 shrink-0">
                  <HelpCircle className="h-4 w-4" />
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-4 pt-1 space-y-3">
              <div className="space-y-1.5 pt-1">
                <span className="text-[11px] font-medium text-muted-foreground block">
                  Missing required business metrics:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {missing.map((field) => (
                    <Badge
                      key={field}
                      variant="secondary"
                      className="text-xs font-normal border border-border"
                    >
                      {formatMissingField(field)}
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="pt-2 border-t border-border/40 flex justify-end">
                <Button asChild variant="outline" size="sm" className="h-7 text-xs gap-1.5">
                  <Link href="/settings">
                    <Settings className="h-3 w-3" />
                    Configure in Settings
                    <ArrowUpRight className="h-3 w-3" />
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
