'use client';

import * as React from 'react';
import Link from 'next/link';
import { Info, Calculator, ExternalLink } from 'lucide-react';
import { METRIC_FORMULAS, type MetricFormula, type MetricFormulaKey } from '@/lib/formulas';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

export interface SourceChipProps {
  formulaKey: MetricFormulaKey;
  label?: string;
}

/**
 * Small info button next to key metrics that opens an explanatory modal
 * detailing the deterministic calculation, formula, and underlying records.
 */
export function SourceChip({ formulaKey, label = 'Formula & Source' }: SourceChipProps) {
  const meta: MetricFormula | undefined = METRIC_FORMULAS[formulaKey];
  if (!meta) return null;

  return (
    <Dialog>
      <DialogTrigger asChild>
        <button
          type="button"
          aria-label={`Inspect calculation for ${meta.title}`}
          className="inline-flex items-center gap-1 text-[11px] font-mono text-muted-foreground hover:text-primary transition-colors py-0.5 px-1 rounded hover:bg-muted"
        >
          <Info className="h-3 w-3" />
          <span className="sr-only">{label}</span>
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="space-y-2">
          <div className="flex items-center gap-2 text-primary font-semibold text-sm">
            <Calculator className="h-4 w-4" />
            <span>Deterministic Provenance</span>
          </div>
          <DialogTitle className="text-lg font-bold">{meta.title}</DialogTitle>
          <DialogDescription className="text-xs">{meta.explanation}</DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <div className="rounded-md bg-muted/60 p-3 border border-border/80">
            <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider mb-1">
              Formula
            </p>
            <p className="font-mono text-xs text-foreground font-medium select-all break-words">
              {meta.formula}
            </p>
          </div>

          <div className="space-y-1">
            <p className="text-[11px] font-medium text-muted-foreground">Underlying Records</p>
            <p className="text-xs text-foreground">{meta.sourceDescription}</p>
          </div>
        </div>

        {meta.sourceRoute && (
          <div className="flex justify-end pt-2 border-t border-border/50">
            <Button asChild size="sm" variant="outline" className="text-xs">
              <Link href={meta.sourceRoute}>
                <span>View Source Ledger & Forecast</span>
                <ExternalLink className="ml-1.5 h-3 w-3" />
              </Link>
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
