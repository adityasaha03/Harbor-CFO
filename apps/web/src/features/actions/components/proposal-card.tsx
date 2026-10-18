'use client';

import * as React from 'react';
import { formatMinor } from '@harbor/contracts';
import type { ActionProposalDto } from '@harbor/contracts';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Landmark, Bot, User, ArrowRight, FileText } from 'lucide-react';
import { ProposalStatusBadge } from './proposal-status-badge';
import { ExpiryCountdown } from './expiry-countdown';

interface ProposalCardProps {
  proposal: ActionProposalDto;
  onReview: (proposal: ActionProposalDto) => void;
}

function getProposalSummary(proposal: ActionProposalDto): string {
  const { canonicalPayload, status } = proposal;
  const netProceeds = canonicalPayload.principalMinor - canonicalPayload.upfrontFeeMinor;
  const count = canonicalPayload.schedule.length;

  if (status === 'executed') {
    return `Completed: A ${formatMinor(canonicalPayload.principalMinor)} ${canonicalPayload.offerCode.replace(/[-_]/g, ' ')} facility was executed. Net proceeds of ${formatMinor(netProceeds)} were credited to cash to resolve the liquidity shortfall, with ${count} active installment${count === 1 ? '' : 's'} tracked in commitments.`;
  }
  if (status === 'approved') {
    return `Approved: Owner authorization granted for a ${formatMinor(canonicalPayload.principalMinor)} ${canonicalPayload.offerCode.replace(/[-_]/g, ' ')} facility. Ready for cryptographic execution to deposit ${formatMinor(netProceeds)} and secure operating reserves.`;
  }
  if (status === 'rejected') {
    return `Declined: Proposal for ${formatMinor(canonicalPayload.principalMinor)} ${canonicalPayload.offerCode.replace(/[-_]/g, ' ')} was rejected. No funds were drawn and no repayment obligations were created.`;
  }
  if (status === 'expired') {
    return `Expired: Proposal for ${formatMinor(canonicalPayload.principalMinor)} expired before approval. A fresh proposal can be generated if liquidity support is still required.`;
  }

  return `Summary: Arranges a ${formatMinor(canonicalPayload.principalMinor)} ${canonicalPayload.offerCode.replace(/[-_]/g, ' ')} facility to cover upcoming cash requirements. Upon approval, net proceeds of ${formatMinor(netProceeds)} will be deposited on ${canonicalPayload.fundingOn}, protecting your liquidity floor, with repayments scheduled across ${count} installment${count === 1 ? '' : 's'}.`;
}

export function ProposalCard({ proposal, onReview }: ProposalCardProps) {
  const { canonicalPayload, status, source, createdAt, expiresAt } = proposal;
  const isAgent = source === 'agent';
  const isExpired = status === 'expired';

  return (
    <Card className="hover:border-primary/40 transition-colors" data-testid={`proposal-card-${proposal.id}`}>
      <CardContent className="p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        {/* Left: Offer, Source, and Summary info */}
        <div className="space-y-2.5 min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 font-semibold text-sm text-foreground">
              <Landmark className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>{canonicalPayload.offerCode}</span>
              <span className="text-xs text-muted-foreground font-normal font-mono">
                (v{canonicalPayload.offerVersion})
              </span>
            </div>
            <ProposalStatusBadge status={status} />
            <Badge
              variant="secondary"
              className="text-[10px] px-1.5 py-0 gap-1 bg-muted/60 text-muted-foreground"
              data-testid="proposal-source-badge"
            >
              {isAgent ? <Bot className="h-2.5 w-2.5" /> : <User className="h-2.5 w-2.5" />}
              {isAgent ? 'Agent Proposed' : 'User Proposed'}
            </Badge>
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <div>
              Principal:{' '}
              <span className="font-mono font-bold text-foreground" data-testid="proposal-principal-text">
                {formatMinor(canonicalPayload.principalMinor)}
              </span>
            </div>
            <div>
              Created:{' '}
              <span className="font-mono text-foreground">
                {new Date(createdAt).toLocaleDateString()}
              </span>
            </div>
            {status === 'pending' && (
              <ExpiryCountdown expiresAt={expiresAt} isExpired={isExpired} />
            )}
          </div>

          {/* Plain-Language Action Summary Paragraph */}
          <div className="rounded-lg bg-muted/40 p-2.5 border border-border/50 text-xs text-muted-foreground leading-relaxed">
            <span className="font-semibold text-foreground mr-1.5 inline-flex items-center gap-1">
              <FileText className="h-3 w-3 text-primary" />
              <span>Overview:</span>
            </span>
            <span>{getProposalSummary(proposal)}</span>
          </div>
        </div>

        {/* Right: Review action button */}
        <div className="shrink-0 w-full sm:w-auto flex justify-end">
          <Button
            size="sm"
            variant="outline"
            className="text-xs gap-1.5 hover:bg-primary hover:text-primary-foreground"
            onClick={() => onReview(proposal)}
            data-testid={`review-proposal-btn-${proposal.id}`}
          >
            Review Proposal
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
