'use client';

import * as React from 'react';
import type { ActionProposalDto } from '@harbor/contracts';
import { ProposalCard } from './proposal-card';
import { ApprovalDialog } from './approval-dialog';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FileCheck2 } from 'lucide-react';

interface ProposalListProps {
  proposals: ActionProposalDto[];
  isLoading?: boolean;
  selectedProposalId?: string | null;
  onSelectProposal?: (proposal: ActionProposalDto | null) => void;
}

type TabFilter = 'all' | 'pending' | 'approved' | 'executed' | 'closed';

export function ProposalList({
  proposals,
  isLoading,
  selectedProposalId,
  onSelectProposal,
}: ProposalListProps) {
  const [activeTab, setActiveTab] = React.useState<TabFilter>('all');
  const [activeProposal, setActiveProposal] = React.useState<ActionProposalDto | null>(null);
  const [dialogOpen, setDialogOpen] = React.useState(false);

  // If selectedProposalId passed from query/props, open dialog for it
  React.useEffect(() => {
    if (selectedProposalId && proposals.length > 0) {
      const found = proposals.find((p) => p.id === selectedProposalId);
      if (found) {
        setActiveProposal(found);
        setDialogOpen(true);
      }
    }
  }, [selectedProposalId, proposals]);

  const filteredProposals = React.useMemo(() => {
    if (activeTab === 'all') return proposals;
    if (activeTab === 'closed') {
      return proposals.filter((p) =>
        ['expired', 'rejected', 'conflict'].includes(p.status),
      );
    }
    return proposals.filter((p) => p.status === activeTab);
  }, [proposals, activeTab]);

  const handleReview = (proposal: ActionProposalDto) => {
    setActiveProposal(proposal);
    setDialogOpen(true);
    onSelectProposal?.(proposal);
  };

  const handleProposalRegenerated = (newProposal: ActionProposalDto) => {
    setActiveProposal(newProposal);
    onSelectProposal?.(newProposal);
  };

  if (isLoading) {
    return (
      <div className="space-y-3" data-testid="proposal-list-loading">
        <div className="h-10 w-64 bg-muted/40 rounded-lg animate-pulse" />
        <div className="h-28 w-full bg-muted/40 rounded-xl animate-pulse" />
        <div className="h-28 w-full bg-muted/40 rounded-xl animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-4" data-testid="proposal-list">
      {/* Status Filter Tabs */}
      <Tabs
        value={activeTab}
        onValueChange={(val) => setActiveTab(val as TabFilter)}
        className="w-full"
      >
        <TabsList className="grid grid-cols-5 w-full max-w-md h-8 text-xs">
          <TabsTrigger value="all" className="text-xs">
            All ({proposals.length})
          </TabsTrigger>
          <TabsTrigger value="pending" className="text-xs">
            Pending
          </TabsTrigger>
          <TabsTrigger value="approved" className="text-xs">
            Approved
          </TabsTrigger>
          <TabsTrigger value="executed" className="text-xs">
            Executed
          </TabsTrigger>
          <TabsTrigger value="closed" className="text-xs">
            Closed
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Cards List or Empty State */}
      {filteredProposals.length === 0 ? (
        <div
          className="flex flex-col items-center justify-center p-12 text-center border border-dashed rounded-xl bg-card text-muted-foreground space-y-2"
          data-testid="proposal-list-empty"
        >
          <FileCheck2 className="h-8 w-8 text-muted-foreground/60" />
          <p className="text-sm font-medium text-foreground">No proposals in this category</p>
          <p className="text-xs text-muted-foreground max-w-sm">
            Proposals are created from the Scenario Studio or by the agent copilot when evaluating financing remedies.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredProposals.map((proposal) => (
            <ProposalCard
              key={proposal.id}
              proposal={proposal}
              onReview={handleReview}
            />
          ))}
        </div>
      )}

      {/* Review & Approval Dialog */}
      <ApprovalDialog
        proposal={activeProposal}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onProposalRegenerated={handleProposalRegenerated}
      />
    </div>
  );
}
