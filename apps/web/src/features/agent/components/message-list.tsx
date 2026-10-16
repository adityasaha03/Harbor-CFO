'use client';

import * as React from 'react';
import { User, Loader2 } from 'lucide-react';
import { AssistantMessage } from './assistant-message';
import type { AgentRunDto } from '@harbor/contracts';

export interface MessageListProps {
  currentRun?: AgentRunDto | null;
  activePrompt?: string | null;
  isRunning?: boolean;
}

/**
 * Renders the conversation stream (User prompt + Assistant response).
 */
export function MessageList({ currentRun, activePrompt, isRunning }: MessageListProps) {
  const displayPrompt = activePrompt || currentRun?.prompt;

  if (!displayPrompt && !currentRun) {
    return null;
  }

  return (
    <div className="flex flex-col gap-4">
      {/* User message */}
      {displayPrompt && (
        <div className="flex items-start gap-3 justify-end">
          <div className="max-w-[85%] rounded-2xl rounded-tr-xs bg-primary px-4 py-2.5 text-sm text-primary-foreground shadow-xs leading-relaxed">
            <p className="whitespace-pre-wrap break-words">{displayPrompt}</p>
          </div>
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted border text-muted-foreground">
            <User className="h-4 w-4" />
          </div>
        </div>
      )}

      {/* Assistant loading state while running and answer is not ready */}
      {isRunning && !currentRun?.finalAnswer && (
        <div className="flex items-center gap-2.5 rounded-xl border bg-muted/40 p-3.5 text-xs text-muted-foreground animate-pulse">
          <Loader2 className="h-4 w-4 animate-spin text-primary shrink-0" />
          <span>Synthesizing answer from financial telemetry and tool results...</span>
        </div>
      )}

      {/* Assistant finalized message */}
      {currentRun && (currentRun.finalAnswer || currentRun.status !== 'running') && (
        <AssistantMessage
          content={currentRun.finalAnswer}
          mode={currentRun.mode}
          status={currentRun.status}
          fallbackUsed={currentRun.fallbackUsed}
          evidenceRefs={currentRun.evidenceRefs}
          proposalIds={currentRun.proposalIds}
          createdAt={currentRun.completedAt || currentRun.createdAt}
        />
      )}
    </div>
  );
}
