import * as React from 'react';
import type { ImportPreviewResponse, ImportDto } from '@harbor/contracts';
import { useCommitImport } from '../api/use-commit-import';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { AlertCircle, CheckCircle, RefreshCw } from 'lucide-react';
import type { ApiError } from '@/lib/api/errors';
import { toast } from 'sonner';

export interface CommitBarProps {
  preview: ImportPreviewResponse;
  onCommitted: (dto: ImportDto) => void;
  onReset: () => void;
}

export function CommitBar({ preview, onCommitted, onReset }: CommitBarProps) {
  const [isConfirmOpen, setIsConfirmOpen] = React.useState(false);
  const [duplicateImportId, setDuplicateImportId] = React.useState<string | null>(null);
  const [isExpired, setIsExpired] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  const commitMutation = useCommitImport();

  const handleOpenConfirm = () => {
    setErrorMessage(null);
    setDuplicateImportId(null);
    setIsExpired(false);
    setIsConfirmOpen(true);
  };

  const handleConfirmCommit = async () => {
    try {
      const result = await commitMutation.mutateAsync(preview.importId);
      setIsConfirmOpen(false);
      toast.success(`Successfully committed import! Staged ${result.acceptedRows} records to ledger.`);
      onCommitted(result);
    } catch (err) {
      setIsConfirmOpen(false);
      const apiErr = err as ApiError;
      const status = apiErr.status;
      const msg = apiErr.message || 'Failed to commit import';

      if (status === 409 || apiErr.code === 'CONFLICT' || msg.toLowerCase().includes('already been committed')) {
        let existingId: string | null = null;
        if (apiErr.details && Array.isArray(apiErr.details)) {
          for (const d of apiErr.details) {
            if (typeof d === 'object' && d !== null && 'field' in d && (d as { field?: unknown }).field === 'checksum') {
              const val = (d as { message?: unknown }).message;
              if (typeof val === 'string') {
                existingId = val;
                break;
              }
            }
          }
        }
        setDuplicateImportId(existingId);
        setErrorMessage(msg);
        toast.error(`Import conflict: ${msg}`);
      } else if (status === 410 || msg.toLowerCase().includes('expired')) {
        setIsExpired(true);
        const expiredMsg = 'This import preview has expired. Please re-upload the file.';
        setErrorMessage(expiredMsg);
        toast.error(expiredMsg);
      } else {
        setErrorMessage(msg);
        toast.error(msg);
      }
    }
  };

  return (
    <div className="space-y-4" data-testid="commit-bar">
      {/* Action controls */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-lg border bg-muted/30">
        <div className="text-sm">
          <p className="font-medium text-foreground">
            Ready to commit <strong className="text-emerald-600 dark:text-emerald-400">{preview.acceptedRows}</strong> rows
          </p>
          <p className="text-xs text-muted-foreground">
            File: <span className="font-mono">{preview.fileName}</span> (Staged as {preview.kind})
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onReset}
            disabled={commitMutation.isPending}
            data-testid="discard-import-btn"
          >
            Discard
          </Button>

          <Button
            size="sm"
            onClick={handleOpenConfirm}
            disabled={commitMutation.isPending || preview.acceptedRows === 0}
            data-testid="commit-import-btn"
          >
            {commitMutation.isPending ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Committing...
              </>
            ) : (
              <>
                <CheckCircle className="mr-2 h-4 w-4" />
                Commit Import
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Duplicate / 409 Notice */}
      {duplicateImportId && (
        <div
          className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200"
          data-testid="duplicate-import-notice"
        >
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
            <div className="space-y-1">
              <p className="font-semibold">Duplicate File Detected</p>
              <p className="text-xs text-amber-800 dark:text-amber-300">
                This exact file has already been committed to HarborCFO. Idempotency guarantees prevent importing duplicate transactions or invoices.
              </p>
              {duplicateImportId && (
                <p className="text-xs font-mono text-muted-foreground pt-1">
                  Existing Import ID: <span>{duplicateImportId}</span>
                </p>
              )}
              <div className="pt-2">
                <Button variant="outline" size="sm" onClick={onReset} className="h-7 text-xs">
                  Upload a different file
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Expired Notice */}
      {isExpired && (
        <div
          className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive"
          data-testid="expired-import-notice"
        >
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 mt-0.5 shrink-0" />
            <div className="space-y-1">
              <p className="font-semibold">Preview Expired</p>
              <p className="text-xs">
                Staged import previews expire after 1 hour. Please upload the file again to generate a fresh preview.
              </p>
              <div className="pt-2">
                <Button variant="outline" size="sm" onClick={onReset} className="h-7 text-xs">
                  Re-upload file
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Generic Error Notice */}
      {!duplicateImportId && !isExpired && errorMessage && (
        <div
          className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive"
          data-testid="commit-error-notice"
        >
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        </div>
      )}

      {/* Confirmation Dialog */}
      <Dialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
        <DialogContent data-testid="commit-confirm-dialog">
          <DialogHeader>
            <DialogTitle>Confirm Import</DialogTitle>
            <DialogDescription>
              Are you sure you want to commit <strong>{preview.acceptedRows}</strong> rows from{' '}
              <span className="font-mono text-foreground">{preview.fileName}</span>?
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 py-2 text-sm text-muted-foreground">
            <p>
              This action will atomically write <strong>{preview.acceptedRows}</strong> records to your company’s ledger.
            </p>
            <p className="text-xs">
              Recalculations for cash forecast and risk alerts will immediately trigger.
            </p>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setIsConfirmOpen(false)}
              disabled={commitMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmCommit}
              disabled={commitMutation.isPending}
              data-testid="confirm-commit-btn"
            >
              {commitMutation.isPending ? 'Committing...' : 'Yes, Commit'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
