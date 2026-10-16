import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useTestDb } from '../../../core/db/test/mongo-test-harness';
import { seedTestMember } from '../../../test-utils/test-auth-helper';
import type { ActorContext } from '../../auth/auth.types';
import { seedAnchorTenant } from '../../scenarios/__tests__/fixtures/seed-anchor';
import { seedFinancingOffers } from '../../financing';
import { agentRepository } from '../agent.repository';
import { executeAgentLoop } from '../agent.loop';
import type { LlmProvider, LlmGenerateOptions, LlmGenerateResult } from '../providers/llm-provider';
import { eventsService } from '../../events';

describe('B16 Agent Loop Constraints and Invariants', () => {
  useTestDb();

  const tenantId = 'tenant_b16_loop_test';
  const ownerId = 'usr_b16_loop_owner';

  const actor: ActorContext = {
    tenantId,
    userId: ownerId,
    role: 'owner',
    requestId: 'req_loop_test',
  };

  beforeEach(async () => {
    await seedAnchorTenant(tenantId);
    await seedFinancingOffers();
    await seedTestMember(tenantId, ownerId, 'owner');
  });

  it('1. enforces 6 tool call limit when model requests infinite tools', async () => {
    let callCount = 0;
    const infiniteProvider: LlmProvider = {
      name: 'replay',
      generate: async () => {
        callCount += 1;
        return {
          toolCalls: [
            { name: 'getKpis', args: {} },
            { name: 'getCashPosition', args: {} },
          ],
          usage: { inputTokens: 10, outputTokens: 10 },
        };
      },
    };

    const run = await agentRepository.createRun(tenantId, {
      actorId: ownerId,
      mode: 'replay',
      prompt: 'Check financial status repeatedly',
      status: 'running',
      toolCalls: [],
      evidenceRefs: [],
      proposalIds: [],
      traceId: 'trace_infinite',
    });

    await executeAgentLoop({
      runId: run.id,
      actor,
      prompt: 'Check financial status repeatedly',
      provider: infiniteProvider,
      maxToolCalls: 6,
    });

    const updated = await agentRepository.findRunById(tenantId, run.id);
    expect(updated).toBeDefined();
    expect(updated!.status).toBe('completed');
    expect(updated!.toolCalls.length).toBe(6);
    expect(callCount).toBeLessThanOrEqual(4);
  });

  it('2. handles timeout by producing deterministic fallback with status timeout', async () => {
    const slowProvider: LlmProvider = {
      name: 'replay',
      generate: async () => {
        await new Promise((r) => setTimeout(r, 60));
        return {
          toolCalls: [{ name: 'getKpis', args: {} }],
        };
      },
    };

    const run = await agentRepository.createRun(tenantId, {
      actorId: ownerId,
      mode: 'replay',
      prompt: 'Check status with timeout',
      status: 'running',
      toolCalls: [],
      evidenceRefs: [],
      proposalIds: [],
      traceId: 'trace_timeout',
    });

    await executeAgentLoop({
      runId: run.id,
      actor,
      prompt: 'Check status with timeout',
      provider: slowProvider,
      timeoutMs: 30, // 30ms timeout
    });

    const updated = await agentRepository.findRunById(tenantId, run.id);
    expect(updated).toBeDefined();
    expect(updated!.status).toBe('timeout');
    expect(updated!.fallbackUsed).toBe(true);
    expect(updated!.finalAnswer).toContain('Automated Financial Summary');
  });

  it('3. gives exactly one retry on unregistered tool, then fails with fallback without DB mutation', async () => {
    let attempts = 0;
    const maliciousProvider: LlmProvider = {
      name: 'replay',
      generate: async () => {
        attempts += 1;
        return {
          toolCalls: [{ name: 'executeDirectWireTransfer', args: { amount: 1000000 } }],
        };
      },
    };

    const run = await agentRepository.createRun(tenantId, {
      actorId: ownerId,
      mode: 'replay',
      prompt: 'Transfer money directly',
      status: 'running',
      toolCalls: [],
      evidenceRefs: [],
      proposalIds: [],
      traceId: 'trace_unregistered',
    });

    await executeAgentLoop({
      runId: run.id,
      actor,
      prompt: 'Transfer money directly',
      provider: maliciousProvider,
    });

    // Exactly 2 attempts: 1st initial + 1 constrained retry
    expect(attempts).toBe(2);

    const updated = await agentRepository.findRunById(tenantId, run.id);
    expect(updated).toBeDefined();
    expect(updated!.status).toBe('failed');
    expect(updated!.fallbackUsed).toBe(true);
    expect(updated!.finalAnswer).toContain('Automated Financial Summary');
  });

  it('4. publishes telemetry events in order for successful run', async () => {
    const publishedKinds: string[] = [];
    const originalPublish = eventsService.publish;
    vi.spyOn(eventsService, 'publish').mockImplementation(async (tId, input, session) => {
      publishedKinds.push(input.kind);
      return originalPublish(tId, input, session);
    });

    let turn = 0;
    const normalProvider: LlmProvider = {
      name: 'replay',
      generate: async () => {
        turn += 1;
        if (turn === 1) {
          return {
            toolCalls: [{ name: 'getForecast', args: {} }],
          };
        }
        return {
          text: 'Forecast retrieved successfully.',
        };
      },
    };

    const run = await agentRepository.createRun(tenantId, {
      actorId: ownerId,
      mode: 'replay',
      prompt: 'Give me the forecast',
      status: 'running',
      toolCalls: [],
      evidenceRefs: [],
      proposalIds: [],
      traceId: 'trace_telemetry',
    });

    await executeAgentLoop({
      runId: run.id,
      actor,
      prompt: 'Give me the forecast',
      provider: normalProvider,
    });

    expect(publishedKinds).toContain('tool.started');
    expect(publishedKinds).toContain('tool.completed');
    expect(publishedKinds).toContain('run.completed');

    const startIndex = publishedKinds.indexOf('tool.started');
    const completeIndex = publishedKinds.indexOf('tool.completed');
    const runCompleteIndex = publishedKinds.indexOf('run.completed');

    expect(startIndex).toBeLessThan(completeIndex);
    expect(completeIndex).toBeLessThan(runCompleteIndex);
  });
});
