import { randomUUID } from 'node:crypto';
import { env } from '../../config/env';
import { logger } from '../../core/logging/logger';
import { eventsService } from '../events';
import type { ActorContext } from '../auth/auth.types';
import type { AgentStyle, AgentToolName } from '@harbor/contracts';
import { getModelFacingTools, getRegisteredTool } from './tools/registry';
import { runTool } from './tools/run-tool';
import { agentRepository } from './agent.repository';
import { buildSystemPrompt } from './agent.prompt';
import { generateFallbackSummary } from './agent.fallback';
import type {
  LlmProvider,
  LlmMessage,
  LlmToolResult,
} from './providers/llm-provider';
import type { AgentRunToolCallDoc } from './agent.model';

export interface ExecuteAgentLoopOptions {
  runId: string;
  actor: ActorContext;
  prompt: string;
  style?: AgentStyle;
  provider: LlmProvider;
  maxToolCalls?: number;
  timeoutMs?: number;
}

export function sanitizeArgs(args: Record<string, unknown>): Record<string, unknown> {
  const sanitized: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(args)) {
    if (/password|secret|token|key|auth/i.test(k)) {
      sanitized[k] = '[REDACTED]';
    } else if (typeof v === 'object' && v !== null && !Array.isArray(v)) {
      sanitized[k] = sanitizeArgs(v as Record<string, unknown>);
    } else {
      sanitized[k] = v;
    }
  }
  return sanitized;
}

export async function executeAgentLoop(options: ExecuteAgentLoopOptions): Promise<void> {
  const { runId, actor, prompt, style = 'standard', provider } = options;
  const maxToolCalls = options.maxToolCalls ?? env.AGENT_MAX_TOOL_CALLS ?? 6;
  const timeoutMs = options.timeoutMs ?? env.AGENT_TIMEOUT_MS ?? 45000;
  const traceId = actor.requestId || randomUUID();

  const startTime = Date.now();
  const tools = getModelFacingTools();
  const systemPrompt = buildSystemPrompt(style);

  const messages: LlmMessage[] = [{ role: 'user', content: prompt }];
  const executedToolCalls: AgentRunToolCallDoc[] = [];
  const evidenceRefs = new Set<string>();
  const proposalIds = new Set<string>();

  let totalInputTokens = 0;
  let totalOutputTokens = 0;
  let retryCount = 0;
  let finalAnswer: string | undefined;

  try {
    while (executedToolCalls.length < maxToolCalls) {
      if (Date.now() - startTime > timeoutMs) {
        throw new Error(`Run timed out after ${timeoutMs}ms`);
      }

      const response = await provider.generate({
        system: systemPrompt,
        messages,
        tools,
      });

      totalInputTokens += response.usage?.inputTokens ?? 0;
      totalOutputTokens += response.usage?.outputTokens ?? 0;

      if (!response.toolCalls || response.toolCalls.length === 0) {
        finalAnswer = response.text;
        break;
      }

      // Process tool calls in this turn
      const currentTurnToolCalls = response.toolCalls;
      const turnResults: LlmToolResult[] = [];
      let turnHadError = false;

      for (const call of currentTurnToolCalls) {
        if (executedToolCalls.length >= maxToolCalls) {
          break;
        }

        const tool = getRegisteredTool(call.name);
        if (!tool) {
          if (retryCount === 0) {
            retryCount += 1;
            turnHadError = true;
            turnResults.push({
              toolCallId: call.id,
              name: call.name,
              output: {
                error: `Tool "${call.name}" is not registered in HarborCFO. Please select only from the registered tools.`,
              },
            });
            break;
          } else {
            throw new Error(`Unregistered tool name: "${call.name}"`);
          }
        }

        const sanitized = sanitizeArgs(call.args ?? {});

        await eventsService.publish(actor.tenantId, {
          kind: 'tool.started',
          publicSummary: `Tool started: ${call.name}`,
          resourceRefs: [call.name],
          runId,
        });

        const toolStart = Date.now();
        let toolOutput: unknown;
        let toolDuration = 0;
        let status: 'success' | 'error' = 'success';
        const callResultRefs: string[] = [];

        try {
          const res = await runTool(
            actor,
            {
              name: call.name as AgentToolName,
              args: call.args,
            },
            { traceId },
          );

          toolDuration = Date.now() - toolStart;
          toolOutput = res.data;

          for (const ref of res.evidenceRefs) {
            evidenceRefs.add(ref);
            callResultRefs.push(ref);
          }

          if (
            call.name === 'createActionProposal' &&
            res.data &&
            typeof (res.data as Record<string, unknown>).proposalId === 'string'
          ) {
            proposalIds.add((res.data as Record<string, unknown>).proposalId as string);
          }
        } catch (err: unknown) {
          status = 'error';
          toolDuration = Date.now() - toolStart;
          const errMessage = err instanceof Error ? err.message : 'Tool execution failed';
          toolOutput = { error: errMessage };
        }

        executedToolCalls.push({
          name: call.name,
          argsSanitized: sanitized,
          status,
          durationMs: toolDuration,
          resultRefs: callResultRefs,
        });

        await eventsService.publish(actor.tenantId, {
          kind: 'tool.completed',
          publicSummary: `Tool completed: ${call.name} in ${toolDuration}ms`,
          resourceRefs: callResultRefs,
          runId,
        });

        turnResults.push({
          toolCallId: call.id,
          name: call.name,
          output: toolOutput,
        });
      }

      messages.push({
        role: 'assistant',
        toolCalls: currentTurnToolCalls,
      });

      messages.push({
        role: 'tool',
        toolResults: turnResults,
      });

      if (turnHadError) {
        continue;
      }
    }

    // If max calls reached without final answer, request a final summary
    if (!finalAnswer) {
      const summaryMessages: LlmMessage[] = [
        ...messages,
        {
          role: 'user',
          content:
            'All tool calls have been executed. Now provide your final, complete analysis and recommendations for the business owner based on the data above.',
        },
      ];
      const summaryResponse = await provider.generate({
        system: systemPrompt,
        messages: summaryMessages,
      });
      finalAnswer = summaryResponse.text ?? 'Analysis completed.';
      totalInputTokens += summaryResponse.usage?.inputTokens ?? 0;
      totalOutputTokens += summaryResponse.usage?.outputTokens ?? 0;
    }

    // Ensure Owner approval requirement is present if a proposal was created
    if (proposalIds.size > 0 && !finalAnswer.includes('Owner')) {
      finalAnswer += '\n\nNote: Approval by the Owner is required in the Action Approval flow before any execution can occur.';
    }

    await agentRepository.updateRun(actor.tenantId, runId, {
      status: 'completed',
      finalAnswer,
      toolCalls: executedToolCalls,
      evidenceRefs: Array.from(evidenceRefs),
      proposalIds: Array.from(proposalIds),
      tokenUsage: { input: totalInputTokens, output: totalOutputTokens },
      completedAt: new Date(),
    });

    await eventsService.publish(actor.tenantId, {
      kind: 'run.completed',
      publicSummary: `Agent copilot completed analysis with ${executedToolCalls.length} tool call(s).`,
      resourceRefs: Array.from(proposalIds),
      runId,
    });
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown agent error';
    const isTimeout = errorMsg.toLowerCase().includes('timed out');
    const runStatus = isTimeout ? 'timeout' : 'failed';

    logger.warn({ runId, tenantId: actor.tenantId, error: errorMsg }, 'Agent loop failure, executing fallback');

    const fallback = await generateFallbackSummary(actor, errorMsg);
    for (const ref of fallback.evidenceRefs) {
      evidenceRefs.add(ref);
    }

    await agentRepository.updateRun(actor.tenantId, runId, {
      status: runStatus,
      finalAnswer: fallback.summary,
      toolCalls: executedToolCalls,
      evidenceRefs: Array.from(evidenceRefs),
      proposalIds: Array.from(proposalIds),
      fallbackUsed: true,
      completedAt: new Date(),
    });

    await eventsService.publish(actor.tenantId, {
      kind: 'run.failed',
      publicSummary: `Agent copilot run ${runStatus}: ${errorMsg}`.slice(0, 990),
      resourceRefs: fallback.evidenceRefs,
      runId,
    });
  }
}
