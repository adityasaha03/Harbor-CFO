'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Money } from '@/components/data/money';
import {
  ArrowDownLeft,
  ArrowUpRight,
  ExternalLink,
  Receipt,
  FileText,
  CreditCard,
  Layers,
} from 'lucide-react';
import { useForecastDay } from '../api/use-forecast-day';
import type { FlowSource } from '@harbor/contracts';
import {
  InvoiceDetailsDialog,
  type InvoiceDetailsData,
} from './invoice-details-dialog';

export interface DayDrilldownDrawerProps {
  date: string | null;
  isOpen: boolean;
  onClose: () => void;
}

export function DayDrilldownDrawer({ date, isOpen, onClose }: DayDrilldownDrawerProps) {
  const query = useForecastDay(isOpen ? date : null);
  const data = query.data;
  const [selectedInvoice, setSelectedInvoice] = React.useState<InvoiceDetailsData | null>(null);

  const handleSelectInvoice = (source: FlowSource) => {
    const matchingInvoice = (
      data?.invoices as Record<string, unknown>[] | undefined
    )?.find((inv) => inv.externalId === source.id || inv.id === source.id);

    setSelectedInvoice({
      id: source.id,
      externalId: (matchingInvoice?.externalId as string) || source.id,
      label: source.label,
      amountMinor: Math.abs(source.amountMinor),
      direction: source.amountMinor > 0 ? 'AR' : 'AP',
      status:
        (matchingInvoice?.status as string) ||
        (source.label.toLowerCase().includes('overdue') ? 'overdue' : 'open'),
      counterpartyExternalId:
        (matchingInvoice?.counterpartyExternalId as string) || undefined,
      dueOn: (matchingInvoice?.dueOn as string) || undefined,
      expectedSettlementOn:
        (matchingInvoice?.expectedSettlementOn as string) || date || undefined,
      description: (matchingInvoice?.description as string) || source.label,
    });
  };

  // Group flows into Receipts, Payments, and Financing
  const receipts = React.useMemo(() => {
    if (!data) return [];
    return data.sources.filter(
      (s) => s.amountMinor > 0 && s.type !== 'financing',
    );
  }, [data]);

  const payments = React.useMemo(() => {
    if (!data) return [];
    return data.sources.filter(
      (s) => s.amountMinor < 0 && s.type !== 'financing',
    );
  }, [data]);

  const financing = React.useMemo(() => {
    if (!data) return [];
    return data.sources.filter((s) => s.type === 'financing');
  }, [data]);

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-md overflow-y-auto"
        data-testid="day-drilldown-drawer"
      >
        <SheetHeader className="pb-4 border-b border-border/60">
          <div className="flex items-center justify-between pr-6">
            <Badge variant="outline" className="font-mono text-xs">
              {date}
            </Badge>
            <span className="text-xs text-muted-foreground font-mono">Day Provenance</span>
          </div>
          <SheetTitle className="text-lg font-bold">Daily Cash Movement</SheetTitle>
          <SheetDescription className="text-xs">
            Detailed breakdown of invoices, commitments, and financing operations for this date.
          </SheetDescription>
        </SheetHeader>

        {query.isLoading ? (
          <div className="space-y-4 py-6" data-testid="drilldown-loading">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-28 w-full" />
            <Skeleton className="h-28 w-full" />
          </div>
        ) : query.isError ? (
          <div className="py-8 text-center text-sm text-destructive" data-testid="drilldown-error">
            Failed to load day provenance data.
          </div>
        ) : data ? (
          <div className="space-y-6 py-6" data-testid="drilldown-content">
            {/* Closing Balance Card */}
            <div className="rounded-xl border border-border/80 bg-muted/30 p-4 shadow-2xs space-y-1">
              <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                Projected Day-End Closing Cash
              </span>
              <div className="text-2xl font-bold font-mono" data-testid="drilldown-closing-cash">
                <Money minor={data.closingMinor} />
              </div>
            </div>

            {/* Receipts / Inflows */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between text-xs font-semibold text-foreground">
                <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                  <ArrowDownLeft className="h-4 w-4" />
                  Receipts (Inflows)
                </span>
                <Money minor={data.receiptsMinor} className="text-emerald-600 dark:text-emerald-400 font-bold" />
              </div>

              {receipts.length === 0 ? (
                <p className="text-xs text-muted-foreground italic pl-2">No expected receipts on this date.</p>
              ) : (
                <div className="space-y-2">
                  {receipts.map((source) => (
                    <SourceItem
                      key={`${source.type}-${source.id}`}
                      source={source}
                      isReceipt
                      onSelectInvoice={handleSelectInvoice}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Payments / Outflows */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between text-xs font-semibold text-foreground">
                <span className="flex items-center gap-1.5 text-rose-600 dark:text-rose-400">
                  <ArrowUpRight className="h-4 w-4" />
                  Payments (Outflows)
                </span>
                <Money minor={data.paymentsMinor} className="text-rose-600 dark:text-rose-400 font-bold" />
              </div>

              {payments.length === 0 ? (
                <p className="text-xs text-muted-foreground italic pl-2">No scheduled payments on this date.</p>
              ) : (
                <div className="space-y-2">
                  {payments.map((source) => (
                    <SourceItem
                      key={`${source.type}-${source.id}`}
                      source={source}
                      isReceipt={false}
                      onSelectInvoice={handleSelectInvoice}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Financing */}
            {financing.length > 0 && (
              <div className="space-y-2.5">
                <div className="flex items-center justify-between text-xs font-semibold text-foreground">
                  <span className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400">
                    <CreditCard className="h-4 w-4" />
                    Financing Schedule
                  </span>
                  <Money minor={data.financingMinor - data.feesMinor - data.repaymentsMinor} font-bold />
                </div>
                <div className="space-y-2">
                  {financing.map((source) => (
                    <SourceItem
                      key={`${source.type}-${source.id}`}
                      source={source}
                      isReceipt={source.amountMinor > 0}
                      onSelectInvoice={handleSelectInvoice}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : null}
      </SheetContent>

      <InvoiceDetailsDialog
        invoice={selectedInvoice}
        open={Boolean(selectedInvoice)}
        onOpenChange={(open) => {
          if (!open) setSelectedInvoice(null);
        }}
      />
    </Sheet>
  );
}

interface SourceItemProps {
  source: FlowSource;
  isReceipt: boolean;
  onSelectInvoice: (source: FlowSource) => void;
}

function SourceItem({ source, isReceipt, onSelectInvoice }: SourceItemProps) {
  const isInvoice = source.type === 'invoice';
  const isCommitment = source.type === 'commitment';

  const Icon = isInvoice ? Receipt : isCommitment ? FileText : Layers;

  return (
    <div
      className="flex items-center justify-between p-2.5 rounded-lg border border-border/60 bg-background hover:bg-muted/30 transition-colors text-xs"
      data-testid={`drilldown-source-${source.id}`}
    >
      <div className="flex items-center gap-2.5 min-w-0 pr-2">
        <div className="p-1 rounded-md bg-muted text-muted-foreground shrink-0">
          <Icon className="h-3.5 w-3.5" />
        </div>
        <div className="min-w-0">
          <p className="font-medium text-foreground truncate">{source.label}</p>
          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <span className="font-mono">{source.id}</span>
            <span>•</span>
            <span className="capitalize">{source.type}</span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <Money
          minor={Math.abs(source.amountMinor)}
          className={`font-semibold ${
            isReceipt ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
          }`}
        />
        {isInvoice ? (
          <button
            type="button"
            onClick={() => onSelectInvoice(source)}
            className="text-muted-foreground hover:text-primary transition-colors p-1 rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            title="View invoice details"
            data-testid={`view-invoice-details-${source.id}`}
          >
            <ExternalLink className="h-3.5 w-3.5" />
          </button>
        ) : isCommitment ? (
          <Link
            href={`/settings?tab=commitments#${encodeURIComponent(source.id)}`}
            className="text-muted-foreground hover:text-primary transition-colors p-1 rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            title="View commitment details"
            data-testid={`view-commitment-details-${source.id}`}
          >
            <ExternalLink className="h-3.5 w-3.5" />
          </Link>
        ) : null}
      </div>
    </div>
  );
}
