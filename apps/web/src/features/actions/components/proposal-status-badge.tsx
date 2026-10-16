'use client';

import * as React from 'react';
import { Clock, CheckCircle2, CheckCheck, AlertCircle, XCircle, AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { ProposalStatus } from '@harbor/contracts';

interface ProposalStatusBadgeProps {
  status: ProposalStatus;
}

export function ProposalStatusBadge({ status }: ProposalStatusBadgeProps) {
  switch (status) {
    case 'pending':
      return (
        <Badge
          variant="outline"
          className="border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 gap-1 text-[11px]"
          data-testid="proposal-status-pending"
        >
          <Clock className="h-3 w-3" />
          Pending Approval
        </Badge>
      );
    case 'approved':
      return (
        <Badge
          variant="outline"
          className="border-blue-300 dark:border-blue-700 bg-blue-50 dark:bg-blue-950/40 text-blue-800 dark:text-blue-300 gap-1 text-[11px]"
          data-testid="proposal-status-approved"
        >
          <CheckCircle2 className="h-3 w-3" />
          Approved &bull; Ready
        </Badge>
      );
    case 'executed':
      return (
        <Badge
          variant="outline"
          className="border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 gap-1 text-[11px]"
          data-testid="proposal-status-executed"
        >
          <CheckCheck className="h-3 w-3" />
          Executed
        </Badge>
      );
    case 'expired':
      return (
        <Badge
          variant="outline"
          className="border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/40 text-slate-600 dark:text-slate-400 gap-1 text-[11px]"
          data-testid="proposal-status-expired"
        >
          <AlertCircle className="h-3 w-3" />
          Expired
        </Badge>
      );
    case 'rejected':
      return (
        <Badge
          variant="outline"
          className="border-rose-300 dark:border-rose-700 bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 gap-1 text-[11px]"
          data-testid="proposal-status-rejected"
        >
          <XCircle className="h-3 w-3" />
          Rejected
        </Badge>
      );
    case 'conflict':
      return (
        <Badge
          variant="outline"
          className="border-purple-300 dark:border-purple-700 bg-purple-50 dark:bg-purple-950/40 text-purple-800 dark:text-purple-300 gap-1 text-[11px]"
          data-testid="proposal-status-conflict"
        >
          <AlertTriangle className="h-3 w-3" />
          Data Changed / Stale
        </Badge>
      );
    default:
      return null;
  }
}
