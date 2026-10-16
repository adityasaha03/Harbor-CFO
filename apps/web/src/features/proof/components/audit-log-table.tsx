'use client';

import * as React from 'react';
import {
  FileText,
  Lock,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  XCircle,
  Clock,
  Fingerprint,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useAuditEvents } from '../api/use-audit-events';
import { usePermission, useMe } from '@/features/auth';

export function AuditLogTable(): React.JSX.Element {
  const hasAuditExport = usePermission('audit:export');
  const { data: me } = useMe();
  const [page, setPage] = React.useState(1);
  const pageSize = 15;

  const { data: events, isLoading, error, isPlaceholderData } = useAuditEvents({
    page,
    pageSize,
    enabled: hasAuditExport,
  });

  if (!hasAuditExport) {
    return (
      <Card className="border-border/60 shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-muted-foreground" />
            <CardTitle className="text-lg font-bold tracking-tight">
              Tamper-Evident Audit Trail
            </CardTitle>
          </div>
          <CardDescription className="text-sm">
            Cryptographic ledger recording all actor invocations, approval decisions, and state modifications.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border/80 bg-muted/10 p-8 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 mb-3">
              <Lock className="h-6 w-6" />
            </div>
            <h3 className="text-sm font-semibold text-foreground">
              Audit Log Access Restricted
            </h3>
            <p className="mt-1 max-w-md text-xs leading-relaxed text-muted-foreground">
              Viewing raw audit event logs requires the{' '}
              <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-primary font-medium">
                audit:export
              </code>{' '}
              permission, which is reserved exclusively for the{' '}
              <span className="font-semibold text-foreground">Owner</span> role. Your current role is{' '}
              <span className="font-semibold uppercase text-foreground">{me?.role || 'Guest'}</span>.
            </p>
            <p className="mt-2 text-[11px] text-muted-foreground">
              Tip: Switch to the demo Owner account using the top user profile menu to inspect the full audit trail.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const items = events ?? [];

  return (
    <Card className="border-border/60 shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg font-bold tracking-tight">
              <FileText className="h-5 w-5 text-primary" />
              <span>Tamper-Evident Audit Trail</span>
            </CardTitle>
            <CardDescription className="text-sm">
              Append-only operational history capturing every actor action, permission check, and resource reference.
            </CardDescription>
          </div>

          <div className="flex items-center gap-1.5 self-start sm:self-auto">
            <Badge variant="outline" className="font-mono text-xs">
              Page {page}
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        {isLoading ? (
          <div className="p-4 space-y-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : error ? (
          <div className="p-6 text-center text-xs text-destructive">
            Failed to load audit logs: {error.message}
          </div>
        ) : items.length === 0 ? (
          <div className="p-8 text-center text-xs text-muted-foreground">
            No audit records found for this tenant.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/40">
                <TableRow className="border-b border-border/60">
                  <TableHead className="w-[170px] py-3 text-xs font-semibold">Timestamp</TableHead>
                  <TableHead className="w-[110px] text-xs font-semibold">Actor Role</TableHead>
                  <TableHead className="w-[150px] text-xs font-semibold">Action</TableHead>
                  <TableHead className="w-[100px] text-xs font-semibold">Decision</TableHead>
                  <TableHead className="w-[160px] text-xs font-semibold">Reason Code</TableHead>
                  <TableHead className="text-xs font-semibold">Resource Refs & Trace</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {items.map((event, idx) => {
                  const isDenied = event.decision === 'denied';
                  return (
                    <TableRow
                      key={event.id || idx}
                      className={`border-b border-border/30 transition-colors ${
                        isDenied
                          ? 'bg-rose-500/5 hover:bg-rose-500/10 dark:bg-rose-950/20'
                          : idx % 2 === 0
                            ? 'bg-background hover:bg-muted/20'
                            : 'bg-muted/5 hover:bg-muted/20'
                      }`}
                    >
                      <TableCell className="py-2.5 font-mono text-xs text-muted-foreground whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <Clock className="h-3 w-3 opacity-60" />
                          <span>{new Date(event.createdAt).toLocaleDateString()}</span>
                          <span className="font-semibold text-foreground">
                            {new Date(event.createdAt).toLocaleTimeString()}
                          </span>
                        </div>
                      </TableCell>

                      <TableCell className="py-2.5">
                        <Badge
                          variant="outline"
                          className="font-mono text-[11px] capitalize font-semibold"
                        >
                          {event.actorRole || 'System'}
                        </Badge>
                      </TableCell>

                      <TableCell className="py-2.5 font-mono text-xs font-semibold text-foreground">
                        {event.action}
                      </TableCell>

                      <TableCell className="py-2.5">
                        {isDenied ? (
                          <div className="inline-flex items-center gap-1 rounded-full border border-rose-500/30 bg-rose-500/15 px-2 py-0.5 text-[11px] font-bold text-rose-600 dark:text-rose-400">
                            <XCircle className="h-3 w-3" />
                            <span>DENIED</span>
                          </div>
                        ) : (
                          <div className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/15 px-2 py-0.5 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                            <CheckCircle2 className="h-3 w-3" />
                            <span>ALLOWED</span>
                          </div>
                        )}
                      </TableCell>

                      <TableCell className="py-2.5 font-mono text-xs text-muted-foreground truncate max-w-[150px]">
                        {event.reasonCode || '-'}
                      </TableCell>

                      <TableCell className="py-2.5">
                        <div className="flex flex-wrap items-center gap-1.5">
                          {event.resourceRefs?.slice(0, 2).map((ref) => (
                            <span
                              key={ref}
                              className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground"
                            >
                              {ref}
                            </span>
                          ))}
                          {event.traceId && (
                            <span className="inline-flex items-center gap-1 font-mono text-[10px] text-muted-foreground/80">
                              <Fingerprint className="h-2.5 w-2.5" />
                              <span className="truncate max-w-[90px]">{event.traceId}</span>
                            </span>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Pagination bar */}
        <div className="flex items-center justify-between border-t border-border/40 px-4 py-3">
          <p className="text-xs text-muted-foreground">
            Showing {items.length} records on page {page}
          </p>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1 || isLoading}
              className="h-8 text-xs"
            >
              <ChevronLeft className="mr-1 h-3.5 w-3.5" />
              <span>Previous</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => p + 1)}
              disabled={items.length < pageSize || isLoading || isPlaceholderData}
              className="h-8 text-xs"
            >
              <span>Next</span>
              <ChevronRight className="ml-1 h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
