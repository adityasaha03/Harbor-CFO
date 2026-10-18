'use client';

import * as React from 'react';
import { Download, Loader2, PackageCheck, Shield, FileCheck2, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { downloadEvidenceBundle } from '../api/download-evidence';
import { usePermission } from '@/features/auth';
import { toast } from 'sonner';

export function EvidenceDownload(): React.JSX.Element {
  const hasAuditExport = usePermission('audit:export');
  const [isDownloading, setIsDownloading] = React.useState(false);
  const [downloadError, setDownloadError] = React.useState<string | null>(null);
  const [lastDownloadedAt, setLastDownloadedAt] = React.useState<string | null>(null);

  const handleDownload = async (): Promise<void> => {
    try {
      setIsDownloading(true);
      setDownloadError(null);
      await downloadEvidenceBundle();
      setLastDownloadedAt(new Date().toLocaleTimeString());
      toast.success('Downloaded 9-artifact SHA-256 evidence package');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to download evidence bundle';
      setDownloadError(msg);
      toast.error(msg);
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <Card className="border-border/60 bg-gradient-to-br from-card via-card to-primary/5 shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <PackageCheck className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg font-bold tracking-tight">
                Competition Execution Evidence Exporter
              </CardTitle>
              <Badge variant="outline" className="text-[10px] uppercase font-mono">
                9 Artifacts
              </Badge>
            </div>
            <CardDescription className="text-sm">
              Generates and exports the complete tamper-evident audit bundle with SHA-256 integrity checksums.
            </CardDescription>
          </div>

          <Button
            onClick={handleDownload}
            disabled={isDownloading || !hasAuditExport}
            className="self-start sm:self-auto font-medium"
          >
            {isDownloading ? (
              <>
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                <span>Exporting Bundle...</span>
              </>
            ) : (
              <>
                <Download className="mr-1.5 h-4 w-4" />
                <span>Export Evidence (.json)</span>
              </>
            )}
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-3 pt-0">
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3 text-xs">
          <div className="flex items-center gap-2 rounded-md border border-border/40 bg-background/50 p-2.5">
            <Shield className="h-4 w-4 text-emerald-500" />
            <span className="text-muted-foreground">
              Permission: <strong className="text-foreground">audit:export</strong>
            </span>
          </div>

          <div className="flex items-center gap-2 rounded-md border border-border/40 bg-background/50 p-2.5">
            <FileCheck2 className="h-4 w-4 text-primary" />
            <span className="text-muted-foreground">
              Format: <strong className="text-foreground">SHA-256 Verified JSON</strong>
            </span>
          </div>

          <div className="flex items-center gap-2 rounded-md border border-border/40 bg-background/50 p-2.5">
            <PackageCheck className="h-4 w-4 text-amber-500" />
            <span className="text-muted-foreground">
              Status:{' '}
              {lastDownloadedAt ? (
                <strong className="text-emerald-600 dark:text-emerald-400">
                  Exported at {lastDownloadedAt}
                </strong>
              ) : (
                <strong className="text-foreground">Ready to Export</strong>
              )}
            </span>
          </div>
        </div>

        {!hasAuditExport && (
          <div className="flex items-start gap-2 rounded-md border border-amber-500/20 bg-amber-500/5 p-2.5 text-xs text-amber-700 dark:text-amber-300">
            <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-500" />
            <p>
              Evidence bundle export is restricted to <span className="font-semibold uppercase">Owner</span>.
              Log in as the demo Owner to download genuine audit and forecast snapshots.
            </p>
          </div>
        )}

        {downloadError && (
          <div className="flex items-start gap-2 rounded-md border border-rose-500/30 bg-rose-500/10 p-2.5 text-xs text-rose-700 dark:text-rose-300">
            <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-rose-500" />
            <p className="font-semibold">{downloadError}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
