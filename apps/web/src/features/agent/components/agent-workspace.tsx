'use client';

import * as React from 'react';
import { usePermission } from '@/features/auth';
import { useStartRun } from '../api/use-start-run';
import { useRun } from '../api/use-run';
import { useRuns } from '../api/use-runs';
import { useRunEvents } from '../hooks/use-run-events';
import { MessageList } from './message-list';
import { ChatInput } from './chat-input';
import { SuggestedPrompts } from './suggested-prompts';
import { ActivityTimeline } from './activity-timeline';
import { PastRunsSidebar } from './past-runs-sidebar';
import type { AgentStyle } from '@harbor/contracts';
import { toast } from 'sonner';

/**
 * Main Harbor Copilot Workspace container.
 * Coordinates conversation stream, suggested prompts, live telemetry timeline,
 * and historical investigation runs.
 */
export function AgentWorkspace() {
  const canUseAgent = usePermission('agent:use');

  const [activeRunId, setActiveRunId] = React.useState<string | null>(null);
  const [activePrompt, setActivePrompt] = React.useState<string | null>(null);
  const [style, setStyle] = React.useState<AgentStyle>('standard');
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  // Queries & Mutations
  const runsQuery = useRuns();
  const runQuery = useRun(activeRunId);
  const startRunMutation = useStartRun();
  const { events: liveEvents, clearEvents } = useRunEvents(activeRunId);

  const isRunning =
    startRunMutation.isPending ||
    (Boolean(activeRunId) &&
      runQuery.data?.status === 'running' &&
      (!runQuery.data.createdAt ||
        Date.now() - new Date(runQuery.data.createdAt).getTime() < 90_000));

  const chatInputContainerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    // When the agent workspace loads, smoothly scroll down so new users immediately
    // see the conversation panel, suggested prompts, and the chat input.
    const timer = setTimeout(() => {
      if (typeof chatInputContainerRef.current?.scrollIntoView === 'function') {
        chatInputContainerRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
      }
    }, 150);
    return () => clearTimeout(timer);
  }, []);

  const handleStartRun = (prompt: string, selectedStyle: AgentStyle) => {
    setErrorMessage(null);
    setActivePrompt(prompt);
    clearEvents();
    toast.info('Query dispatched to Harbor Copilot. Streaming reasoning events...');

    startRunMutation.mutate(
      { prompt, style: selectedStyle },
      {
        onSuccess: (result) => {
          setActiveRunId(result.runId);
        },
        onError: (err: unknown) => {
          const message =
            err instanceof Error ? err.message : 'Failed to start agent run';
          if (message.includes('429') || message.toLowerCase().includes('rate limit')) {
            const limitMsg = 'Rate limit exceeded (10 runs/min). Please wait a moment before sending another question.';
            setErrorMessage(limitMsg);
            toast.error(limitMsg);
          } else {
            setErrorMessage(message);
            toast.error(message);
          }
        },
      },
    );
  };

  const pastRuns = runsQuery.data || [];
  const selectedPastRun = React.useMemo(
    () => pastRuns.find((r) => r.id === activeRunId),
    [pastRuns, activeRunId],
  );
  const currentRun = runQuery.data ?? selectedPastRun;

  const handleSelectRun = (runId: string) => {
    setErrorMessage(null);
    setActiveRunId(runId);
    const existing = pastRuns.find((r) => r.id === runId);
    setActivePrompt(existing?.prompt ?? null);
    clearEvents();
    toast.info('Loaded past copilot conversation run');
  };

  const handleNewChat = () => {
    setErrorMessage(null);
    setActiveRunId(null);
    setActivePrompt(null);
    clearEvents();
    toast.info('Started new copilot conversation');
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      {/* Left: Past Investigations Sidebar (3 cols on lg) */}
      <div className="lg:col-span-3 h-[620px] xl:h-[700px]">
        <PastRunsSidebar
          runs={pastRuns}
          selectedRunId={activeRunId}
          onSelectRun={handleSelectRun}
          onNewChat={handleNewChat}
          isLoading={runsQuery.isLoading}
        />
      </div>

      {/* Middle: Conversation Panel (5 cols on lg) */}
      <div className="lg:col-span-5 flex flex-col gap-4 h-[620px] xl:h-[700px]">
        <div className="flex-1 overflow-y-auto rounded-xl border bg-card/40 p-4 shadow-xs">
          {!activeRunId && !activePrompt && (
            <div className="flex flex-col gap-6 py-6">
              <div className="space-y-1">
                <h3 className="text-base font-semibold text-foreground">
                  Finance Copilot Workspace
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Ask questions about your liquidity trajectory, compare working capital financing,
                  or isolate overdue invoices. Every reasoning step and tool call is visible in the timeline.
                </p>
              </div>

              <SuggestedPrompts
                onSelectPrompt={(prompt) => handleStartRun(prompt, style)}
                disabled={!canUseAgent || isRunning}
              />
            </div>
          )}

          {(activeRunId || activePrompt) && (
            <MessageList
              currentRun={currentRun}
              activePrompt={activePrompt}
              isRunning={isRunning}
            />
          )}
        </div>

        {/* Input box */}
        <div ref={chatInputContainerRef}>
          <ChatInput
            onSubmit={handleStartRun}
            isLoading={isRunning}
            canUseAgent={canUseAgent}
            style={style}
            onStyleChange={setStyle}
            errorMessage={errorMessage}
          />
        </div>
      </div>

      {/* Right: Live Activity Timeline (4 cols on lg) */}
      <div className="lg:col-span-4 h-[620px] xl:h-[700px]">
        <ActivityTimeline
          liveEvents={liveEvents}
          persistedToolCalls={currentRun?.toolCalls}
          status={currentRun?.status}
          isRunning={isRunning}
        />
      </div>
    </div>
  );
}
