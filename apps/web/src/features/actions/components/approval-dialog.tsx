'use client';

import * as React from 'react';
import { Check, Play, RefreshCw, XCircle, AlertTriangle, Lock } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import type { ActionProposalDto, ExecuteActionProposalResponse } from '@harbor/contracts';
import { usePermission } from '@/features/auth';
import { useApproveProposal } from '../api/use-approve-proposal';
import { useExecuteProposal } from '../api/use-execute-proposal';
import { useRejectProposal } from '../api/use-reject-proposal';
import { useCreateProposal } from '../api/use-create-proposal';
import { ProposalStatusBadge } from './proposal-status-badge';
import { PayloadDetails } from './payload-details';
import { ForecastImpact } from './forecast-impact';
import { ExecutionResult } from './execution-result';

interface ApprovalDialogProps {
  proposal: ActionProposalDto | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onProposalRegenerated?: (newProposal: ActionProposalDto) => void;
}

export function ApprovalDialog({
  proposal,
  open,
  onOpenChange,
  onProposalRegenerated,
}: ApprovalDialogProps) {
  const canApprove = usePermission('actions:approve');

  // Maintain one stable idempotency key for this dialog session
  const [idempotencyKey, setIdempotencyKey] = React.useState<string>('');
  const [executionResult, setExecutionResult] =
    React.useState<ExecuteActionProposalResponse | null>(null);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [isConflictOrStale, setIsConflictOrStale] = React.useState(false);

  const approveMutation = useApproveProposal();
  const executeMutation = useExecuteProposal();
  const rejectMutation = useRejectProposal();
  const createProposalMutation = useCreateProposal();

  // Reset or generate key when proposal changes
  React.useEffect(() => {
    if (open && proposal) {
      setIdempotencyKey(crypto.randomUUID());
      setExecutionResult(null);
      setErrorMessage(null);
      setIsConflictOrStale(proposal.status === 'conflict' || proposal.status === 'expired');
    }
  }, [open, proposal?.id, proposal?.status]);

  if (!proposal) return null;

  const currentStatus = executionResult ? 'executed' : proposal.status;

  const handleApprove = async () => {
    setErrorMessage(null);
    try {
      await approveMutation.mutateAsync({
        proposalId: proposal.id,
        input: { payloadHash: proposal.payloadHash },
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Approval failed.';
      setErrorMessage(msg);
      if (msg.includes('409') || msg.toLowerCase().includes('stale') || msg.toLowerCase().includes('conflict')) {
        setIsConflictOrStale(true);
      }
    }
  };

  const handleExecute = async () => {
    setErrorMessage(null);
    try {
      const res = await executeMutation.mutateAsync({
        proposalId: proposal.id,
        idempotencyKey,
      });
      setExecutionResult(res);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Execution failed.';
      setErrorMessage(msg);
      if (msg.includes('409') || msg.toLowerCase().includes('stale') || msg.toLowerCase().includes('conflict')) {
        setIsConflictOrStale(true);
      }
    }
  };

  const handleReject = async () => {
    setErrorMessage(null);
    try {
      await rejectMutation.mutateAsync({ proposalId: proposal.id });
      onOpenChange(false);
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Rejection failed.');
    }
  };

  const handleRegenerate = async () => {
    setErrorMessage(null);
    try {
      const newProposal = await createProposalMutation.mutateAsync({
        actionType: proposal.actionType,
        offerCode: proposal.canonicalPayload.offerCode,
        principalMinor: proposal.canonicalPayload.principalMinor,
        scenarioId: proposal.scenarioId ?? undefined,
      });
      setIsConflictOrStale(false);
      onProposalRegenerated?.(newProposal);
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to regenerate proposal.');
    }
  };

  const isPending =
    approveMutation.isPending || executeMutation.isPending || rejectMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto" data-testid="approval-dialog">
        <DialogHeader>
          <div className="flex items-center justify-between gap-2">
            <DialogTitle className="text-base font-semibold">
              Action Approval & Execution
            </DialogTitle>
            <ProposalStatusBadge status={currentStatus} />
          </div>
          <DialogDescription className="text-xs">
            Review server-verified financing terms, forecast consequences, and authorize execution.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Read-Only Warning for Non-Owners */}
          {!canApprove && (
            <div
              role="alert"
              className="flex items-center gap-2 p-3 rounded-lg border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 text-xs"
              data-testid="reviewer-approval-notice"
            >
              <Lock className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
              <span>Only an Owner can approve and execute actions.</span>
            </div>
          )}

          {/* Stale / Conflict / Expired Banner */}
          {isConflictOrStale && (
            <div
              role="alert"
              className="p-3.5 rounded-lg border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40 text-xs space-y-2"
              data-testid="stale-proposal-alert"
            >
              <div className="flex items-center gap-2 text-amber-900 dark:text-amber-200 font-semibold">
                <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
                <span>Your data changed. Regenerate this proposal.</span>
              </div>
              <p className="text-amber-800/80 dark:text-amber-300/80 text-[11px]">
                The baseline financial dataset has been bumped or the proposal expired. To execute, create a fresh proposal reflecting current state.
              </p>
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs border-amber-400/60 dark:border-amber-700/60 gap-1.5"
                onClick={handleRegenerate}
                disabled={createProposalMutation.isPending}
                data-testid="regenerate-proposal-btn"
              >
                <RefreshCw className={`h-3 w-3 ${createProposalMutation.isPending ? 'animate-spin' : ''}`} />
                {createProposalMutation.isPending ? 'Regenerating…' : 'Regenerate Proposal'}
              </Button>
            </div>
          )}

          {/* Execution Result View when Executed */}
          {executionResult ? (
            <ExecutionResult result={executionResult} />
          ) : (
            <>
              <PayloadDetails proposal={proposal} />
              <ForecastImpact scenarioId={proposal.scenarioId} />
            </>
          )}

          {errorMessage && (
            <p className="text-xs text-destructive font-medium" data-testid="approval-dialog-error">
              {errorMessage}
            </p>
          )}
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2 pt-2 border-t border-border/50">
          <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
            Close
          </Button>

          {/* Pending State: Approve & Reject buttons */}
          {currentStatus === 'pending' && !isConflictOrStale && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={handleReject}
                disabled={!canApprove || isPending}
                className="text-destructive hover:bg-destructive/10"
                data-testid="reject-proposal-btn"
              >
                <XCircle className="h-3.5 w-3.5 mr-1" />
                Reject
              </Button>
              <Button
                size="sm"
                onClick={handleApprove}
                disabled={!canApprove || isPending}
                className="bg-primary hover:bg-primary/90 gap-1.5"
                data-testid="approve-proposal-btn"
              >
                <Check className="h-3.5 w-3.5" />
                {approveMutation.isPending ? 'Approving…' : 'Approve Action'}
              </Button>
            </>
          )}

          {/* Approved State: Execute button */}
          {currentStatus === 'approved' && !isConflictOrStale && (
            <Button
              size="sm"
              onClick={handleExecute}
              disabled={!canApprove || isPending}
              className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5"
              data-testid="execute-proposal-btn"
            >
              <Play className="h-3.5 w-3.5" />
              {executeMutation.isPending ? 'Executing…' : 'Execute Action'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
