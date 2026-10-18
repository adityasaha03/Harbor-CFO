'use client';

import * as React from 'react';
import type { ImportDto, ImportStatus } from '@harbor/contracts';
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  FileText,
  Calendar,
  User,
  Hash,
  CheckCircle2,
  XCircle,
  Clock,
  Download,
  AlertTriangle,
  Layers,
  Trash2,
} from 'lucide-react';
import { downloadErrorReport } from '../api/download-error-report';
import { useSession } from '@/features/auth';
import { toast } from 'sonner';

export interface ImportDetailsDialogProps {
  importItem: ImportDto | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDeleteRequest?: (item: ImportDto) => void;
}

export function ImportDetailsDialog({
  importItem,
  open,
  onOpenChange,
  onDeleteRequest,
}: ImportDetailsDialogProps) {
  const { role } = useSession();
  const isOwner = role === 'owner';
  const [isDownloading, setIsDownloading] = React.useState(false);

  if (!importItem) return null;

  const handleDownloadErrors = async () => {
    try {
      setIsDownloading(true);
      await downloadErrorReport(importItem.id, importItem.fileName);
      toast.success(`Downloaded error report for "${importItem.fileName}"`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to download error report');
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-2xl max-h-[85vh] overflow-y-auto"
        data-testid="import-details-dialog"
      >
        <DialogHeader className="space-y-2 border-b border-border/60 pb-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <FileText className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-base font-semibold font-mono break-all">
                  {importItem.fileName}
                </DialogTitle>
                <DialogDescription className="text-xs">
                  Import Audit Details & Invariant Checks
                </DialogDescription>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <Badge variant="outline" className="capitalize text-xs font-normal">
                {importItem.kind.replace('_', ' ')}
              </Badge>
              <StatusBadge status={importItem.status} />
            </div>
          </div>
        </DialogHeader>

        {/* Metadata Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 py-1">
          <div className="rounded-md border bg-muted/30 p-2.5">
            <span className="text-[10px] font-medium text-muted-foreground uppercase flex items-center gap-1">
              <Layers className="h-3 w-3" /> Total Rows
            </span>
            <p className="text-base font-bold text-foreground mt-0.5">{importItem.rowCount}</p>
          </div>
          <div className="rounded-md border bg-emerald-500/5 border-emerald-500/20 p-2.5">
            <span className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400 uppercase flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3" /> Accepted
            </span>
            <p className="text-base font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
              {importItem.acceptedRows}
            </p>
          </div>
          <div className="rounded-md border bg-destructive/5 border-destructive/20 p-2.5">
            <span className="text-[10px] font-medium text-destructive uppercase flex items-center gap-1">
              <XCircle className="h-3 w-3" /> Rejected
            </span>
            <p className="text-base font-bold text-destructive mt-0.5">
              {importItem.rejectedRows}
            </p>
          </div>
          <div className="rounded-md border bg-muted/30 p-2.5">
            <span className="text-[10px] font-medium text-muted-foreground uppercase flex items-center gap-1">
              <Hash className="h-3 w-3" /> Version
            </span>
            <p className="text-base font-bold text-foreground mt-0.5">v{importItem.mappingVersion}</p>
          </div>
        </div>

        {/* Detailed Audit Information */}
        <div className="rounded-md border divide-y text-xs">
          <div className="flex justify-between px-3 py-2">
            <span className="text-muted-foreground flex items-center gap-1.5">
              <Hash className="h-3.5 w-3.5" /> Import ID
            </span>
            <span className="font-mono text-foreground font-medium">{importItem.id}</span>
          </div>
          <div className="flex justify-between px-3 py-2">
            <span className="text-muted-foreground flex items-center gap-1.5">
              <User className="h-3.5 w-3.5" /> Actor / Uploader
            </span>
            <span className="font-mono text-foreground">{importItem.actorId || 'system'}</span>
          </div>
          <div className="flex justify-between px-3 py-2">
            <span className="text-muted-foreground flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5" /> Uploaded Date
            </span>
            <span className="text-foreground">{formatDate(importItem.createdAt)}</span>
          </div>
          {importItem.committedAt && (
            <div className="flex justify-between px-3 py-2">
              <span className="text-muted-foreground flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> Committed Date
              </span>
              <span className="text-foreground">{formatDate(importItem.committedAt)}</span>
            </div>
          )}
          <div className="flex justify-between px-3 py-2">
            <span className="text-muted-foreground flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5" /> Expires At
            </span>
            <span className="text-foreground">{formatDate(importItem.expiresAt)}</span>
          </div>
          <div className="flex justify-between px-3 py-2">
            <span className="text-muted-foreground flex items-center gap-1.5">
              <Hash className="h-3.5 w-3.5" /> SHA-256 Checksum
            </span>
            <span className="font-mono text-foreground truncate max-w-[240px]" title={importItem.checksum}>
              {importItem.checksum}
            </span>
          </div>
        </div>

        {/* Status Callout Banner */}
        {importItem.status === 'committed' && (
          <div className="rounded-md border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-800 dark:text-emerald-300 flex items-start gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5 text-emerald-600 dark:text-emerald-400" />
            <div>
              <p className="font-semibold">Ledger Synchronized</p>
              <p className="text-[11px] opacity-90 mt-0.5">
                All {importItem.acceptedRows} rows passed validation and are booked to the double-entry financial ledger.
              </p>
            </div>
          </div>
        )}

        {importItem.status === 'rejected' && (
          <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-destructive" />
            <div>
              <p className="font-semibold">Atomic Rejection Guaranteed</p>
              <p className="text-[11px] opacity-90 mt-0.5">
                Validation errors were detected. In accordance with zero-fault SME integrity, zero rows were written to the ledger.
              </p>
            </div>
          </div>
        )}

        {/* Errors Table if available */}
        {importItem.errors && importItem.errors.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-semibold text-destructive flex items-center gap-1">
                <XCircle className="h-3.5 w-3.5" /> Validation Errors ({importItem.errors.length})
              </h4>
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs gap-1 border-destructive/30 text-destructive hover:bg-destructive/10"
                onClick={handleDownloadErrors}
                disabled={isDownloading}
              >
                <Download className="h-3 w-3" />
                {isDownloading ? 'Downloading...' : 'Export Errors'}
              </Button>
            </div>
            <div className="rounded-md border bg-background overflow-hidden max-h-48 overflow-y-auto">
              <Table>
                <TableHeader className="bg-muted/40">
                  <TableRow>
                    <TableHead className="w-16 text-[11px] py-1.5 font-semibold">Row</TableHead>
                    <TableHead className="w-28 text-[11px] py-1.5 font-semibold">Field</TableHead>
                    <TableHead className="text-[11px] py-1.5 font-semibold">Message</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {importItem.errors.map((err, idx) => (
                    <TableRow key={`${err.row}-${err.field}-${idx}`} className="text-xs">
                      <TableCell className="font-mono text-[11px] py-1.5 font-medium">
                        Row {err.row}
                      </TableCell>
                      <TableCell className="py-1.5">
                        <Badge variant="outline" className="font-mono text-[10px] px-1 py-0">
                          {err.field}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-destructive font-medium text-[11px] py-1.5">
                        {err.message}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        <DialogFooter className="border-t border-border/60 pt-3 flex flex-row items-center justify-between sm:justify-between gap-2">
          {importItem.rejectedRows > 0 && (!importItem.errors || importItem.errors.length === 0) ? (
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownloadErrors}
              disabled={isDownloading}
              className="text-xs gap-1 text-destructive border-destructive/30 hover:bg-destructive/10"
            >
              <Download className="h-3.5 w-3.5" />
              {isDownloading ? 'Downloading...' : 'Download Error Report (CSV)'}
            </Button>
          ) : (
            <div />
          )}
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="text-xs"
              data-testid="close-import-details-btn"
            >
              Close
            </Button>
            {isOwner && onDeleteRequest && (
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={() => {
                  onOpenChange(false);
                  onDeleteRequest(importItem);
                }}
                className="text-xs gap-1"
                data-testid="dialog-delete-import-btn"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Delete Import
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function StatusBadge({ status }: { status: ImportStatus }) {
  switch (status) {
    case 'committed':
      return (
        <Badge variant="default" className="bg-emerald-600 hover:bg-emerald-600 text-white text-xs">
          Committed
        </Badge>
      );
    case 'rejected':
      return (
        <Badge variant="destructive" className="text-xs">
          Rejected
        </Badge>
      );
    case 'previewed':
      return (
        <Badge variant="outline" className="text-amber-600 border-amber-300 dark:border-amber-700 text-xs">
          Previewed
        </Badge>
      );
    case 'expired':
      return (
        <Badge variant="secondary" className="text-xs text-muted-foreground">
          Expired
        </Badge>
      );
    default:
      return <Badge variant="outline" className="text-xs">{status}</Badge>;
  }
}

function formatDate(iso?: string): string {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    return d.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

