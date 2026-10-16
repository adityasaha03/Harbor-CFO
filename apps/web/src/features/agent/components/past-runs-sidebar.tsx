'use client';

import * as React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ModeBadge } from './mode-badge';
import { History, Plus, MessageSquare } from 'lucide-react';
import type { AgentRunDto } from '@harbor/contracts';
import { cn } from '@/lib/utils';

export interface PastRunsSidebarProps {
  runs: AgentRunDto[];
  selectedRunId?: string | null;
  onSelectRun: (runId: string) => void;
  onNewChat: () => void;
  isLoading?: boolean;
}

/**
 * Sidebar displaying the history of previous agent runs with quick switching.
 */
export function PastRunsSidebar({
  runs,
  selectedRunId,
  onSelectRun,
  onNewChat,
  isLoading,
}: PastRunsSidebarProps) {
  return (
    <Card className="h-full flex flex-col border shadow-xs">
      <CardHeader className="py-3 px-4 border-b flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <History className="h-4 w-4 text-muted-foreground" />
          <CardTitle className="text-sm font-semibold">Investigations</CardTitle>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onNewChat}
          className="h-7 px-2 text-xs gap-1"
        >
          <Plus className="h-3 w-3" />
          <span>New</span>
        </Button>
      </CardHeader>

      <CardContent className="flex-1 p-2 overflow-y-auto space-y-1">
        {isLoading && runs.length === 0 && (
          <div className="p-4 text-center text-xs text-muted-foreground">
            Loading past runs...
          </div>
        )}

        {!isLoading && runs.length === 0 && (
          <div className="p-4 text-center text-xs text-muted-foreground">
            No previous investigations recorded.
          </div>
        )}

        {runs.map((run) => {
          const isSelected = run.id === selectedRunId;
          const dateStr = new Date(run.createdAt).toLocaleDateString([], {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          });

          return (
            <button
              key={run.id}
              type="button"
              onClick={() => onSelectRun(run.id)}
              className={cn(
                'w-full text-left rounded-lg p-2.5 transition-colors flex flex-col gap-1.5 border',
                isSelected
                  ? 'bg-accent/80 border-border shadow-2xs'
                  : 'hover:bg-muted/50 border-transparent',
              )}
            >
              <div className="flex items-center justify-between gap-1">
                <span className="text-[10px] text-muted-foreground">{dateStr}</span>
                <ModeBadge mode={run.mode} className="text-[9px] py-0 px-1 h-4" />
              </div>
              <div className="flex items-start gap-1.5">
                <MessageSquare className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
                <p className="text-xs font-medium text-foreground line-clamp-2 leading-snug">
                  {run.prompt}
                </p>
              </div>
            </button>
          );
        })}
      </CardContent>
    </Card>
  );
}
