import * as React from 'react';
import { useImports } from '../api/use-imports';
import { useDeleteImport } from '../api/use-delete-import';
import { downloadErrorReport } from '../api/download-error-report';
import { useSession } from '@/features/auth';
import type { ImportDto, ImportStatus } from '@harbor/contracts';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Download, FileText, RefreshCw, AlertCircle, Eye, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { ImportDetailsDialog } from './import-details-dialog';

export function ImportHistoryTable() {
  const { data: imports, isLoading, isError, error, refetch, isRefetching } = useImports();
  const { role } = useSession();
  const isOwner = role === 'owner';
  const deleteImportMutation = useDeleteImport();
  const [selectedImport, setSelectedImport] = React.useState<ImportDto | null>(null);
  const [importToDelete, setImportToDelete] = React.useState<ImportDto | null>(null);

  const handleConfirmDelete = async () => {
    if (!importToDelete) return;
    try {
      await deleteImportMutation.mutateAsync(importToDelete.id);
      toast.success(`Import "${importToDelete.fileName}" deleted and financial forecasts updated.`);
      setImportToDelete(null);
      if (selectedImport?.id === importToDelete.id) {
        setSelectedImport(null);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete import');
    }
  };

  const handleDownloadErrors = async (id: string, fileName: string) => {
    try {
      await downloadErrorReport(id, fileName);
      toast.success(`Downloaded error report for "${fileName}"`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to download error report');
    }
  };

  return (
    <div className="space-y-3" data-testid="import-history-table">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-foreground">Import History</h3>
          <p className="text-xs text-muted-foreground">
            Audit log of all uploaded files, validation results, and commits. Click any item to inspect details.
          </p>
        </div>
        <Button
          variant="ghost"
          onClick={async () => {
            await refetch();
            toast.info('Refreshed import history');
          }}
          className="h-8 px-2 text-xs"
        >
          <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${isRefetching ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      <div className="rounded-md border bg-card overflow-hidden">
        {isLoading ? (
          <div className="p-6 space-y-3">
            <Skeleton className="h-6 w-full" />
            <Skeleton className="h-6 w-full" />
            <Skeleton className="h-6 w-full" />
          </div>
        ) : isError ? (
          <div className="p-6 text-center text-sm text-destructive flex items-center justify-center gap-2">
            <AlertCircle className="h-4 w-4" />
            <span>Failed to load import history: {error?.message || 'Unknown error'}</span>
          </div>
        ) : !imports || imports.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">
            <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No imports recorded yet.</p>
            <p className="text-xs text-muted-foreground/80 mt-1">
              Upload a transaction or invoice CSV above to stage your first import.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[180px]">File Name</TableHead>
                  <TableHead className="w-[100px]">Kind</TableHead>
                  <TableHead className="w-[110px]">Status</TableHead>
                  <TableHead className="w-[140px]">Rows (Acc/Rej)</TableHead>
                  <TableHead className="w-[150px]">Date</TableHead>
                  <TableHead className="w-[100px]">Actor</TableHead>
                  <TableHead className="text-right w-[150px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {imports.map((item) => (
                  <TableRow
                    key={item.id}
                    className="cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => setSelectedImport(item)}
                    data-testid={`import-history-row-${item.id}`}
                  >
                    <TableCell className="font-mono text-xs font-medium max-w-[200px] truncate" title={item.fileName}>
                      {item.fileName}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize text-xs font-normal">
                        {item.kind.replace('_', ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={item.status} />
                    </TableCell>
                    <TableCell className="text-xs">
                      <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                        {item.acceptedRows}
                      </span>
                      <span className="text-muted-foreground mx-1">/</span>
                      <span className={item.rejectedRows > 0 ? 'text-destructive font-medium' : 'text-muted-foreground'}>
                        {item.rejectedRows}
                      </span>
                      <span className="text-muted-foreground text-[10px] ml-1">
                        (tot {item.rowCount})
                      </span>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {formatDate(item.committedAt || item.createdAt)}
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground max-w-[100px] truncate" title={item.actorId}>
                      {item.actorId ? item.actorId.slice(0, 8) : 'system'}
                    </TableCell>
                    <TableCell className="text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
                          onClick={() => setSelectedImport(item)}
                          title="View import details"
                          data-testid={`view-details-${item.id}`}
                        >
                          <Eye className="h-3 w-3 mr-1" />
                          Details
                        </Button>
                        {item.rejectedRows > 0 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-xs text-destructive hover:text-destructive"
                            onClick={() => handleDownloadErrors(item.id, item.fileName)}
                            title="Download error CSV"
                            data-testid={`download-errors-${item.id}`}
                          >
                            <Download className="h-3 w-3 mr-1" />
                            Errors
                          </Button>
                        )}
                        {isOwner && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={() => setImportToDelete(item)}
                            title="Delete / Undo import"
                            data-testid={`delete-import-${item.id}`}
                          >
                            <Trash2 className="h-3 w-3 mr-1" />
                            Delete
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      <ImportDetailsDialog
        importItem={selectedImport}
        open={Boolean(selectedImport)}
        onOpenChange={(open) => {
          if (!open) setSelectedImport(null);
        }}
        onDeleteRequest={(item) => setImportToDelete(item)}
      />

      <Dialog
        open={Boolean(importToDelete)}
        onOpenChange={(open) => {
          if (!open && !deleteImportMutation.isPending) setImportToDelete(null);
        }}
      >
        <DialogContent className="sm:max-w-md" data-testid="delete-import-dialog">
          <DialogHeader className="space-y-2">
            <DialogTitle className="text-base font-semibold text-destructive flex items-center gap-2">
              <Trash2 className="h-4 w-4" /> Delete Import Batch
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground leading-relaxed">
              Are you sure you want to delete <strong className="text-foreground">{importToDelete?.fileName}</strong>?
              {importToDelete?.status === 'committed' && (
                <span className="block mt-2 p-2 rounded bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-300 font-medium text-xs">
                  ⚠️ All associated transactions and invoices will be permanently removed from your records, and your cash runway and forecast will be recalculated immediately.
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4 flex flex-row items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setImportToDelete(null)}
              disabled={deleteImportMutation.isPending}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={handleConfirmDelete}
              disabled={deleteImportMutation.isPending}
              className="text-xs gap-1"
              data-testid="confirm-delete-import-btn"
            >
              {deleteImportMutation.isPending ? (
                <RefreshCw className="h-3 w-3 animate-spin mr-1" />
              ) : (
                <Trash2 className="h-3 w-3 mr-1" />
              )}
              {deleteImportMutation.isPending ? 'Deleting...' : 'Delete Import'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
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

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}
