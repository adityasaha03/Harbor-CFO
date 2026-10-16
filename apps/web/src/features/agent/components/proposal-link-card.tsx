'use client';

import * as React from 'react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ShieldAlert, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ProposalLinkCardProps {
  proposalIds: string[];
  className?: string;
}

/**
 * Notice card displayed when the agent created an action proposal.
 * Directs the user to /actions for Owner review and authorization.
 */
export function ProposalLinkCard({ proposalIds, className }: ProposalLinkCardProps) {
  if (!proposalIds || proposalIds.length === 0) {
    return null;
  }

  return (
    <Card
      className={cn(
        'border-amber-500/30 bg-amber-50/50 dark:bg-amber-950/20 shadow-none',
        className,
      )}
    >
      <CardContent className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="rounded-full bg-amber-100 dark:bg-amber-900/50 p-2 text-amber-700 dark:text-amber-400 mt-0.5 sm:mt-0">
            <ShieldAlert className="h-5 w-5" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-foreground">
              Action Proposal Created ({proposalIds.length})
            </h4>
            <p className="text-xs text-muted-foreground mt-0.5">
              Waiting for Owner approval. The agent cannot approve or execute money actions.
            </p>
            {proposalIds.length === 1 && (
              <span className="text-xs font-mono text-muted-foreground/80 mt-1 block">
                ID: {proposalIds[0]}
              </span>
            )}
          </div>
        </div>
        <Link href="/actions" passHref>
          <Button size="sm" className="whitespace-nowrap gap-1.5 text-xs">
            Review in Actions
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}
