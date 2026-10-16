import { env } from '../../config/env';
import { logger } from '../../core/logging/logger';
import { NotFoundError, RateLimitedError } from '../../core/http/app-error';
import type { ActorContext } from '../auth/auth.types';
import type {
  CreateAgentRunInput,
  CreateAgentRunResponse,
  AgentRunsQuery,
  AgentRunDto,
} from '@harbor/contracts';
import { agentRepository } from './agent.repository';
import { executeAgentLoop } from './agent.loop';
import { GeminiProvider } from './providers/gemini.provider';
import { ReplayProvider } from './providers/replay.provider';
import type { LlmProvider } from './providers/llm-provider';

export function resolveLlmProvider(): { provider: LlmProvider; mode: 'live' | 'replay' } {
  if (env.LLM_PROVIDER === 'gemini') {
    return { provider: new GeminiProvider(), mode: 'live' };
  }
  return { provider: new ReplayProvider(), mode: 'replay' };
}

export const agentService = {
  async createRun(
    actor: ActorContext,
    input: CreateAgentRunInput,
    customProvider?: LlmProvider,
  ): Promise<CreateAgentRunResponse> {
    const runningCount = await agentRepository.countRunningRuns(actor.tenantId);
    if (runningCount >= 2) {
      throw new RateLimitedError(
        'Maximum concurrent agent runs reached (2 max per tenant). Please wait for active runs to finish.',
      );
    }

    const { provider: defaultProvider, mode } = resolveLlmProvider();
    const provider = customProvider ?? defaultProvider;

    const run = await agentRepository.createRun(actor.tenantId, {
      actorId: actor.userId,
      mode,
      prompt: input.prompt,
      status: 'running',
      toolCalls: [],
      evidenceRefs: [],
      proposalIds: [],
      traceId: actor.requestId,
    });

    // Run execution loop in background
    setImmediate(() => {
      executeAgentLoop({
        runId: run.id,
        actor,
        prompt: input.prompt,
        style: input.style,
        provider,
      }).catch((err) => {
        logger.error({ err, runId: run.id, tenantId: actor.tenantId }, 'Unhandled error in background agent loop');
      });
    });

    return { runId: run.id };
  },

  async getRun(actor: ActorContext, runId: string): Promise<AgentRunDto> {
    const run = await agentRepository.findRunById(actor.tenantId, runId);
    if (!run) {
      throw new NotFoundError('Agent run not found');
    }
    return run;
  },

  async listRuns(
    actor: ActorContext,
    query: AgentRunsQuery,
  ): Promise<{ runs: AgentRunDto[]; total: number; page: number; pageSize: number }> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;

    const { runs, total } = await agentRepository.listRuns(
      actor.tenantId,
      page,
      pageSize,
    );

    return { runs, total, page, pageSize };
  },
};
