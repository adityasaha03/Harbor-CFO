'use client';

import * as React from 'react';
import { formatMinor } from '@harbor/contracts';
import type { ActionProposalDto } from '@harbor/contracts';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Landmark, Bot, User, ArrowRight } from 'lucide-react';
import { ProposalStatusBadge } from './proposal-status-badge';
import { ExpiryCountdown } from './expiry-countdown';

interface ProposalCardProps {
  proposal: ActionProposalDto;
  onReview: (proposal: ActionProposalDto) => void;
}

export function ProposalCard({ proposal, onReview }: ProposalCardProps) {
  const { canonicalPayload, status, source, createdAt, expiresAt } = proposal;
  const isAgent = source === 'agent';
  const isExpired = status === 'expired';

  return (
    <Card className="hover:border-primary/40 transition-colors" data-testid={`proposal-card-${proposal.id}`}>
      <CardContent className="p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        {/* Left: Offer and Source info */}
        <div className="space-y-2 min-w-0">
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
