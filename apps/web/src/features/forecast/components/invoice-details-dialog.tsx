'use client';

import * as React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Money } from '@/components/data/money';
import {
  Receipt,
  Calendar,
  Building,
  ArrowDownLeft,
  ArrowUpRight,
  Clock,
  Sparkles,
} from 'lucide-react';
import Link from 'next/link';

export interface InvoiceDetailsData {
  id: string;
  externalId: string;
  label: string;
  amountMinor: number;
  direction: 'AR' | 'AP';
  status?: string;
  counterpartyExternalId?: string;
  dueOn?: string;
  expectedSettlementOn?: string;
  description?: string;
}

export interface InvoiceDetailsDialogProps {
  invoice: InvoiceDetailsData | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function InvoiceDetailsDialog({
  invoice,
  open,
  onOpenChange,
}: InvoiceDetailsDialogProps) {
  if (!invoice) return null;

  const isReceipt = invoice.direction === 'AR';
  const isOverdue =
    invoice.status === 'overdue' ||
    invoice.label.toLowerCase().includes('overdue');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-lg max-h-[85vh] overflow-y-auto"
        data-testid="invoice-details-dialog"
      >
        <DialogHeader className="border-b border-border/60 pb-3 space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div
                className={`flex h-9 w-9 items-center justify-center rounded-lg ${
                  isReceipt
                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                    : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                }`}
              >
                {isReceipt ? (
                  <ArrowDownLeft className="h-5 w-5" />
                ) : (
                  <ArrowUpRight className="h-5 w-5" />
                )}
              </div>
              <div>
                <DialogTitle className="text-base font-semibold font-mono">
                  {invoice.externalId || invoice.id}
                </DialogTitle>
                <DialogDescription className="text-xs">
                  Invoice Audit & Forecast Provenance
                </DialogDescription>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <Badge
                variant="outline"
                className={`text-xs font-semibold ${
                  isReceipt
                    ? 'text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                    : 'text-rose-600 dark:text-rose-400 border-rose-500/30'
                }`}
              >
                {isReceipt ? 'Receivable (AR)' : 'Payable (AP)'}
              </Badge>
              <Badge
                variant={isOverdue ? 'destructive' : 'secondary'}
                className="text-xs capitalize font-medium"
              >
                {invoice.status || (isOverdue ? 'overdue' : 'open')}
              </Badge>
            </div>
          </div>
        </DialogHeader>

        {/* Invoice Summary Card */}
        <div className="rounded-lg border bg-muted/20 p-4 space-y-3">
          <div className="flex items-baseline justify-between">
            <span className="text-xs text-muted-foreground uppercase font-medium">
              Scheduled Amount
            </span>
            <span
              className={`text-xl font-bold font-mono ${
                isReceipt
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-rose-600 dark:text-rose-400'
              }`}
            >
              <Money minor={invoice.amountMinor} />
            </span>
          </div>

          <div className="border-t border-border/50 pt-2 grid grid-cols-2 gap-3 text-xs">
            <div>
              <span className="text-muted-foreground flex items-center gap-1">
                <Building className="h-3.5 w-3.5" /> Counterparty
              </span>
              <p className="font-medium text-foreground mt-0.5 truncate">
                {invoice.counterpartyExternalId || invoice.label}
              </p>
            </div>
            <div>
              <span className="text-muted-foreground flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" /> Settlement Date
              </span>
              <p className="font-mono text-foreground mt-0.5">
                {invoice.expectedSettlementOn || 'Scheduled'}
              </p>
            </div>
            {invoice.dueOn && (
              <div>
                <span className="text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" /> Due Date
                </span>
                <p className="font-mono text-foreground mt-0.5">{invoice.dueOn}</p>
              </div>
            )}
            <div>
              <span className="text-muted-foreground flex items-center gap-1">
                <Receipt className="h-3.5 w-3.5" /> Currency
              </span>
              <p className="font-medium text-foreground mt-0.5">CNY (Renminbi)</p>
            </div>
          </div>
        </div>

        {/* Forecast Provenance Note */}
        <div className="rounded-md border border-border/80 bg-background p-3 text-xs space-y-1.5">
          <p className="font-semibold text-foreground flex items-center gap-1.5">
            <Receipt className="h-3.5 w-3.5 text-primary" />
            Forecast Provenance
          </p>
          <p className="text-muted-foreground text-[11px] leading-relaxed">
            {isReceipt
              ? 'This customer receivable is scheduled as an expected cash inflow. In the conservative forecast view, overdue receivables include a 14-day collection delay buffer.'
              : 'This vendor payable is scheduled as an operational outflow, deducting from cash reserves on the settlement date.'}
          </p>
        </div>

        <DialogFooter className="border-t border-border/60 pt-3 flex flex-row items-center justify-between sm:justify-between gap-2">
          <Button asChild variant="outline" size="sm" className="text-xs gap-1.5">
            <Link href="/scenarios" onClick={() => onOpenChange(false)}>
              <Sparkles className="h-3.5 w-3.5 text-amber-500" />
              Simulate in Scenarios
            </Link>
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="text-xs"
            data-testid="close-invoice-details-btn"
          >
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
