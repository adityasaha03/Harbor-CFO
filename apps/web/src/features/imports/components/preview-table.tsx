import * as React from 'react';
import type { ImportPreviewResponse } from '@harbor/contracts';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Money } from '@/components/data/money';
import { AlertCircle, AlertTriangle, CheckCircle2 } from 'lucide-react';

export interface PreviewTableProps {
  preview: ImportPreviewResponse;
}

export function PreviewTable({ preview }: PreviewTableProps) {
  const { kind, rowCount, acceptedRows, warnings, sampleRows = [] } = preview;

  return (
    <div className="space-y-4" data-testid="preview-table">
      {/* Header Summary */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-lg border bg-card">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
          <span className="font-semibold text-foreground">Preview Staged</span>
          <Badge variant="outline" className="capitalize">
            {kind}
          </Badge>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <span className="text-muted-foreground">
            Total Rows: <strong className="text-foreground">{rowCount}</strong>
          </span>
          <span className="text-muted-foreground">
            Valid Rows: <strong className="text-emerald-600 dark:text-emerald-400">{acceptedRows}</strong>
          </span>
          {warnings.length > 0 && (
            <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
              <AlertTriangle className="h-4 w-4" />
              <span>{warnings.length} warning{warnings.length === 1 ? '' : 's'}</span>
            </span>
          )}
        </div>
      </div>

      {/* Warnings Callout */}
      {warnings.length > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50/50 p-4 dark:border-amber-900 dark:bg-amber-950/20">
          <div className="flex items-center gap-2 font-medium text-amber-900 dark:text-amber-200 text-sm mb-2">
            <AlertCircle className="h-4 w-4" />
            <span>Validation Warnings (Non-blocking)</span>
          </div>
          <ul className="space-y-1 text-xs text-amber-800 dark:text-amber-300">
            {warnings.slice(0, 5).map((w, idx) => (
              <li key={idx}>
                Row {w.row} [{w.field}]: {w.message}
              </li>
            ))}
            {warnings.length > 5 && (
              <li className="text-muted-foreground italic">
                ...and {warnings.length - 5} more warnings
              </li>
            )}
          </ul>
        </div>
      )}

      {/* Sample Rows Table */}
      <div className="rounded-md border bg-card overflow-hidden">
        <div className="p-3 border-b bg-muted/40 flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Preview Rows (First {sampleRows.length} of {rowCount})
          </span>
          <span className="text-xs text-muted-foreground">
            Read-only preview
          </span>
        </div>
        <div className="overflow-x-auto">
          {kind === 'transactions' ? (
            <TransactionPreviewRows rows={sampleRows} />
          ) : (
            <InvoicePreviewRows rows={sampleRows} />
          )}
        </div>
      </div>
    </div>
  );
}

function TransactionPreviewRows({ rows }: { rows: Record<string, unknown>[] }) {
  if (rows.length === 0) {
    return <div className="p-4 text-center text-sm text-muted-foreground">No rows found in preview.</div>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-[120px]">External ID</TableHead>
          <TableHead className="w-[110px]">Date</TableHead>
          <TableHead className="w-[120px]">Account</TableHead>
          <TableHead className="w-[130px]">Category</TableHead>
          <TableHead className="text-right w-[130px]">Amount</TableHead>
          <TableHead>Description</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row, idx) => {
          const externalId = String(row.externalId ?? '');
          const bookedOn = String(row.bookedOn ?? '');
          const accountCode = String(row.accountCode ?? '');
          const category = String(row.category ?? '');
          const amountMinor = typeof row.amountMinor === 'number' ? row.amountMinor : 0;
          const description = String(row.description ?? '');

          return (
            <TableRow key={idx}>
              <TableCell className="font-mono text-xs">{externalId}</TableCell>
              <TableCell className="text-xs">{bookedOn}</TableCell>
              <TableCell className="text-xs">{accountCode}</TableCell>
              <TableCell>
                <Badge variant="outline" className="text-xs font-normal">
                  {category}
                </Badge>
              </TableCell>
              <TableCell className="text-right">
                <Money minor={amountMinor} />
              </TableCell>
              <TableCell className="text-xs text-muted-foreground max-w-xs truncate" title={description}>
                {description}
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}

function InvoicePreviewRows({ rows }: { rows: Record<string, unknown>[] }) {
  if (rows.length === 0) {
    return <div className="p-4 text-center text-sm text-muted-foreground">No rows found in preview.</div>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-[120px]">Invoice ID</TableHead>
          <TableHead className="w-[80px]">Direction</TableHead>
          <TableHead className="w-[130px]">Counterparty</TableHead>
          <TableHead className="w-[100px]">Due Date</TableHead>
          <TableHead className="w-[90px]">Status</TableHead>
          <TableHead className="text-right w-[120px]">Total</TableHead>
          <TableHead className="text-right w-[120px]">Outstanding</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row, idx) => {
          const externalId = String(row.externalId ?? '');
          const direction = String(row.direction ?? 'AR');
          const counterparty = String(row.counterpartyExternalId ?? '');
          const dueOn = String(row.dueOn ?? '');
          const status = String(row.status ?? 'open');
          const totalMinor = typeof row.totalMinor === 'number' ? row.totalMinor : 0;
          const outstandingMinor = typeof row.outstandingMinor === 'number' ? row.outstandingMinor : 0;

          return (
            <TableRow key={idx}>
              <TableCell className="font-mono text-xs">{externalId}</TableCell>
              <TableCell>
                <Badge
                  variant={direction === 'AR' ? 'default' : 'secondary'}
                  className="text-xs"
                >
                  {direction}
                </Badge>
              </TableCell>
              <TableCell className="text-xs">{counterparty}</TableCell>
              <TableCell className="text-xs">{dueOn}</TableCell>
              <TableCell>
                <Badge variant="outline" className="text-xs capitalize">
                  {status}
                </Badge>
              </TableCell>
              <TableCell className="text-right">
                <Money minor={totalMinor} />
              </TableCell>
              <TableCell className="text-right">
                <Money minor={outstandingMinor} />
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
