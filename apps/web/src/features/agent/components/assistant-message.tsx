'use client';

import * as React from 'react';
import { Bot, AlertTriangle, Clock } from 'lucide-react';
import { ModeBadge } from './mode-badge';
import { EvidenceChips } from './evidence-chips';
import { ProposalLinkCard } from './proposal-link-card';
import type { AgentRunStatus } from '@harbor/contracts';
import { cn } from '@/lib/utils';

export interface AssistantMessageProps {
  content?: string;
  mode?: 'live' | 'replay';
  status?: AgentRunStatus;
  fallbackUsed?: boolean;
  evidenceRefs?: string[];
  proposalIds?: string[];
  createdAt?: string;
  className?: string;
}

/**
 * Renders the Copilot assistant response.
 * Enforces plain-text rendering with preserved line breaks without raw HTML interpretation.
 * Displays fallback alert, mode badge, evidence chips, and action proposal notices.
 */
export function AssistantMessage({
  content,
  mode,
  status,
  fallbackUsed,
  evidenceRefs = [],
  proposalIds = [],
  createdAt,
  className,
}: AssistantMessageProps) {
  const isTimeout = status === 'timeout';
  const isFailed = status === 'failed';

  return (
    <div className={cn('flex flex-col gap-3 rounded-xl border bg-card/80 p-4 shadow-2xs', className)}>
      {/* Header bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-2.5">
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Bot className="h-3.5 w-3.5" />
          </div>
          <span className="text-xs font-semibold text-foreground">Harbor Copilot</span>
          <ModeBadge mode={mode} />
        </div>

        {createdAt && (
          <span className="text-[11px] text-muted-foreground">
            {new Date(createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        )}
      </div>

      {/* Fallback & Error Status Banners */}
      {fallbackUsed && (
        <div className="flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-2.5 text-xs font-medium text-amber-700 dark:text-amber-400">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>Fallback summary (model unavailable)</span>
        </div>
      )}

      {isTimeout && (
        <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-2.5 text-xs font-medium text-destructive">
          <Clock className="h-4 w-4 shrink-0" />
          <span>Run timed out. A fallback summary has been generated below.</span>
        </div>
      )}

      {isFailed && !fallbackUsed && (
        <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-2.5 text-xs font-medium text-destructive">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>Run encountered an error during analysis.</span>
        </div>
      )}

      {/* Answer Content - Strict Plain Text Escaped with Preserved Newlines */}
      {content ? (
        <div
          data-testid="assistant-answer"
          className="whitespace-pre-wrap font-sans text-sm text-foreground leading-relaxed break-words"
        >
          {content}
        </div>
      ) : (
        <div className="text-xs italic text-muted-foreground">
          No response generated.
        </div>
      )}

      {/* Grounding Evidence Chips */}
      {evidenceRefs.length > 0 && (
        <div className="mt-1 pt-2 border-t border-border/50">
          <EvidenceChips evidenceRefs={evidenceRefs} />
        </div>
      )}

      {/* Proposal Created Card */}
      {proposalIds.length > 0 && (
        <div className="mt-1">
          <ProposalLinkCard proposalIds={proposalIds} />
        </div>
      )}
    </div>
  );
}
