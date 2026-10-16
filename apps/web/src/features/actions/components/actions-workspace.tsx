'use client';

import * as React from 'react';
import { useSearchParams } from 'next/navigation';
import { useProposals } from '../api/use-proposals';
import { useCreateProposal } from '../api/use-create-proposal';
import { useScenario } from '@/features/scenarios';
import { ProposalList } from './proposal-list';
import { AlertCircle, PlusCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePermission } from '@/features/auth';

export function ActionsWorkspace() {
  const searchParams = useSearchParams();
  const scenarioId = searchParams.get('scenarioId');

  const { data: proposals = [], isLoading, error } = useProposals();
  const { data: scenario } = useScenario(scenarioId ?? null);
  const createProposalMutation = useCreateProposal();
  const canPropose = usePermission('actions:propose');

  const [selectedProposalId, setSelectedProposalId] = React.useState<string | null>(null);
  const [hasAutoCreated, setHasAutoCreated] = React.useState(false);

  // If arriving from Scenario Studio with a scenarioId, wire auto-creation if not already proposed
  React.useEffect(() => {
    if (!scenarioId || !scenario || hasAutoCreated || !canPropose) return;

    // Check if proposal for this scenarioId already exists
    const existing = proposals.find((p) => p.scenarioId === scenarioId);
    if (existing) {
      setSelectedProposalId(existing.id);
      return;
    }

    // Find financing change in scenario
    const financingChange = scenario.changes.find((c) => c.type === 'add_financing');
    if (financingChange && financingChange.type === 'add_financing') {
      setHasAutoCreated(true);
      void createProposalMutation.mutateAsync({
        actionType: 'sandbox_financing_draw',
        offerCode: financingChange.offerCode,
        principalMinor: financingChange.principalMinor,
        scenarioId,
      }).then((created) => {
        setSelectedProposalId(created.id);
      }).catch(() => {
        // Ignored or logged in UI
      });
    }
  }, [scenarioId, scenario, proposals, hasAutoCreated, canPropose, createProposalMutation]);

  return (
    <div className="space-y-6" data-testid="actions-workspace">
      {/* Creation banner if scenario is being converted */}
      {scenarioId && createProposalMutation.isPending && (
        <div
          role="status"
          className="p-3 rounded-lg border border-primary/40 bg-primary/10 text-xs flex items-center justify-between"
          data-testid="converting-scenario-banner"
        >
          <span className="flex items-center gap-2 font-medium text-foreground">
            <PlusCircle className="h-4 w-4 text-primary animate-spin" />
            Generating formal action proposal from scenario {scenarioId}…
          </span>
        </div>
      )}

      {error && (
        <div
          role="alert"
          className="p-3.5 rounded-lg border border-destructive/40 bg-destructive/10 text-destructive text-xs flex items-center gap-2"
          data-testid="actions-fetch-error"
        >
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>Failed to load action proposals: {error.message}</span>
          <Button
            variant="outline"
            size="sm"
            className="ml-auto h-7 text-xs"
            onClick={() => window.location.reload()}
          >
            Retry
          </Button>
        </div>
      )}

      <ProposalList
        proposals={proposals}
        isLoading={isLoading}
        selectedProposalId={selectedProposalId}
        onSelectProposal={(p) => setSelectedProposalId(p?.id ?? null)}
      />
    </div>
  );
}
