import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useTestDb } from '../../../core/db/test/mongo-test-harness';
import { seedTestMember } from '../../../test-utils/test-auth-helper';
import type { ActorContext } from '../../auth/auth.types';
import { seedAnchorTenant } from '../../scenarios/__tests__/fixtures/seed-anchor';
import { seedFinancingOffers } from '../../financing';
import { agentRepository } from '../agent.repository';
import { executeAgentLoop } from '../agent.loop';
import { eventsService } from '../../events';
import type { LlmProvider } from '../providers/llm-provider';

describe('B16 Fallback Engine - Provider Throw Tests', () => {
  useTestDb();

  const tenantId = 'tenant_b16_fallback_test';
  const ownerId = 'usr_b16_fallback_owner';

  const actor: ActorContext = {
    tenantId,
    userId: ownerId,
    role: 'owner',
    requestId: 'req_fallback_test',
  };

  beforeEach(async () => {
    await seedAnchorTenant(tenantId);
    await seedFinancingOffers();
    await seedTestMember(tenantId, ownerId, 'owner');
  });

  it('handles provider throwing by marking run failed, returning deterministic summary, and publishing run.failed', async () => {
    let publishedFailedEvent = false;
    let failedSummary = '';

    const originalPublish = eventsService.publish;
    vi.spyOn(eventsService, 'publish').mockImplementation(async (tId, input, session) => {
      if (input.kind === 'run.failed') {
        publishedFailedEvent = true;
        failedSummary = input.publicSummary;
      }
      return originalPublish(tId, input, session);
    });

    const throwingProvider: LlmProvider = {
      name: 'gemini',
      generate: async () => {
        throw new Error('Gemini upstream service unavailable (503)');
      },
    };

    const run = await agentRepository.createRun(tenantId, {
      actorId: ownerId,
      mode: 'live',
      prompt: 'Provide complete financial diagnosis',
      status: 'running',
      toolCalls: [],
      evidenceRefs: [],
      proposalIds: [],
      traceId: 'trace_fallback_test',
    });

    await executeAgentLoop({
      runId: run.id,
      actor,
      prompt: 'Provide complete financial diagnosis',
      provider: throwingProvider,
    });

    // 1. Run is marked 'failed' with fallbackUsed: true
    const updated = await agentRepository.findRunById(tenantId, run.id);
    expect(updated).toBeDefined();
    expect(updated!.status).toBe('failed');
    expect(updated!.fallbackUsed).toBe(true);

    // 2. Deterministic summary is returned in finalAnswer
    expect(updated!.finalAnswer).toContain('Automated Financial Summary (Safe Fallback):');
    expect(updated!.finalAnswer).toContain('13-Week Minimum Cash: -¥20,000.00 projected on 2026-11-07');
    expect(updated!.finalAnswer).toContain('Liquidity Target Floor: ¥30,000.00');
    expect(updated!.finalAnswer).toContain('Projected Liquidity Gap: ¥50,000.00');
    expect(updated!.finalAnswer).toContain('Gemini upstream service unavailable (503)');

    // 3. run.failed event was published
    expect(publishedFailedEvent).toBe(true);
    expect(failedSummary).toContain('Agent copilot run failed: Gemini upstream service unavailable (503)');
  });
});
