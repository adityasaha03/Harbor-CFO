'use client';

import * as React from 'react';
import { AlertTriangle, Download, XCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { downloadErrorReport } from '../api/download-error-report';
import { toast } from 'sonner';
import type { ImportErrorItem, ImportWarning } from '@harbor/contracts';

export interface ErrorListProps {
  importId: string;
  fileName: string;
  errors: ImportErrorItem[];
  warnings?: ImportWarning[];
  onReset?: () => void;
}

export function ErrorList({ importId, fileName, errors, warnings = [], onReset }: ErrorListProps) {
  const [isDownloading, setIsDownloading] = React.useState(false);

  const handleDownloadReport = async () => {
    try {
      setIsDownloading(true);
      await downloadErrorReport(importId, fileName);
      toast.success('Downloaded import error report CSV');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to download error report');
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <Card
      className="border-destructive/40 bg-destructive/5 shadow-2xs space-y-4"
      data-testid="error-list-view"
    >
      <CardHeader className="pb-3 border-b border-destructive/20">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-2.5">
            <XCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
            <div>
              <CardTitle className="text-sm font-semibold text-destructive">
                Import Validation Rejected ({errors.length} {errors.length === 1 ? 'Error' : 'Errors'})
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground mt-0.5">
                File: <span className="font-mono font-medium text-foreground">{fileName}</span>
              </CardDescription>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleDownloadReport}
              disabled={isDownloading}
              className="h-8 text-xs gap-1.5 border-destructive/30 hover:bg-destructive/10 text-destructive"
              data-testid="download-error-report-btn"
            >
              <Download className="h-3.5 w-3.5" />
              {isDownloading ? 'Downloading...' : 'Download Error Report (CSV)'}
            </Button>
            {onReset && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={onReset}
                className="h-8 text-xs text-muted-foreground hover:text-foreground"
              >
                Upload New File
              </Button>
            )}
          </div>
        </div>

        {/* Atomic Import Guarantee Notice */}
        <div
          className="rounded-lg border border-destructive/30 bg-background/80 p-3 mt-3 text-xs text-foreground space-y-1"
          data-testid="atomic-rejected-notice"
        >
          <p className="font-semibold text-destructive flex items-center gap-1.5">
            <AlertTriangle className="h-4 w-4" />
            Nothing was imported
          </p>
          <p className="text-muted-foreground text-[11px]">
            Imports in HarborCFO are completely atomic. Because validation errors were detected, no transactions or invoices have been committed to the ledger. Fix the errors below and re-upload.
          </p>
        </div>
      </CardHeader>

      <CardContent className="space-y-4 pt-1">
        {/* Errors Table */}
        <div className="rounded-lg border border-border/80 bg-background overflow-hidden">
          <Table>
            <TableHeader className="bg-muted/40">
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-20 text-xs font-semibold">Row #</TableHead>
                <TableHead className="w-36 text-xs font-semibold">Column / Field</TableHead>
                <TableHead className="text-xs font-semibold">Validation Error Message</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {errors.map((err, idx) => (
                <TableRow
                  key={`${err.row}-${err.field}-${idx}`}
                  className="hover:bg-muted/20"
                  data-testid={`error-row-${err.row}`}
                >
                  <TableCell className="font-mono text-xs font-medium text-foreground">
                    Row {err.row}
                  </TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    <Badge variant="outline" className="text-[11px] font-mono">
                      {err.field}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-destructive font-medium">
                    {err.message}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Warnings Table (if any) */}
        {warnings.length > 0 && (
          <div className="space-y-2 pt-2">
            <h4 className="text-xs font-semibold text-amber-700 dark:text-amber-400">
              Non-blocking Warnings ({warnings.length})
            </h4>
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 space-y-1 text-xs">
              {warnings.map((w, idx) => (
                <p key={idx} className="text-amber-800 dark:text-amber-200">
                  <span className="font-mono font-bold">Row {w.row} ({w.field}):</span> {w.message}
                </p>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
