import { describe, it, expect, beforeEach } from 'vitest';
import { useTestDb } from '../../../core/db/test/mongo-test-harness';
import { seedTestMember } from '../../../test-utils/test-auth-helper';
import type { ActorContext } from '../../auth/auth.types';
import { seedAnchorTenant } from '../../scenarios/__tests__/fixtures/seed-anchor';
import { seedFinancingOffers } from '../../financing';
import { LedgerEntryModel } from '../../ledger';
import { actionsRepository } from '../../actions';
import { runTool } from '../tools/run-tool';
import { ReplayProvider } from '../providers/replay.provider';
import type { LlmMessage, LlmToolResult } from '../providers/llm-provider';

describe('B16 Replay Provider - Harbor Story against Anchor Tenant', () => {
  useTestDb();

  const tenantId = 'tenant_b16_replay_test';
  const ownerId = 'usr_b16_replay_owner';

  const actor: ActorContext = {
    tenantId,
    userId: ownerId,
    role: 'owner',
    requestId: 'req_replay_test',
  };

  beforeEach(async () => {
    await seedAnchorTenant(tenantId);
    await seedFinancingOffers();
    await seedTestMember(tenantId, ownerId, 'owner');
  });

  it('runs the propose_bridge replay story, creating 1 pending proposal and zero ledger changes', async () => {
    const provider = new ReplayProvider();
    const ledgerCountBefore = await LedgerEntryModel.countDocuments({ tenantId });

    const messages: LlmMessage[] = [
      { role: 'user', content: 'Please propose the bridge loan to fix our cash deficit' },
    ];

    // Turn 1: provider should output tool call for createActionProposal
    const turn1 = await provider.generate({ messages });
    expect(turn1.toolCalls).toBeDefined();
    expect(turn1.toolCalls).toHaveLength(1);
    expect(turn1.toolCalls![0]!.name).toBe('createActionProposal');
    expect(turn1.toolCalls![0]!.args.offerCode).toBe('bridge-term');

    // Execute the tool call using real runTool
    const toolCall = turn1.toolCalls![0]!;
    const toolExecution = await runTool(actor, {
      name: toolCall.name as any,
      args: toolCall.args,
    });

    expect(toolExecution.data).toBeDefined();
    const proposalData = toolExecution.data as { proposalId: string; status: string; upfrontFeeMinor: number };
    expect(proposalData.status).toBe('pending');
    expect(proposalData.proposalId).toBeDefined();

    // Feed tool result back
    const toolResult: LlmToolResult = {
      toolCallId: toolCall.id,
      name: toolCall.name,
      output: toolExecution.data,
    };

    messages.push({
      role: 'assistant',
      toolCalls: turn1.toolCalls,
    });
    messages.push({
      role: 'tool',
      toolResults: [toolResult],
    });

    // Turn 2: final answer
    const turn2 = await provider.generate({ messages });
    expect(turn2.text).toBeDefined();
    expect(turn2.text).toContain('Bridge Term Loan');
    expect(turn2.text).toContain(proposalData.proposalId);
    expect(turn2.text).toContain('Approval by the Owner is required');

    // Invariant: exactly 1 pending proposal in database
    const proposalDoc = await actionsRepository.findProposalById(
      tenantId,
      proposalData.proposalId,
    );
    expect(proposalDoc).toBeDefined();
    expect(proposalDoc!.status).toBe('pending');

    // Invariant: ZERO ledger changes
    const ledgerCountAfter = await LedgerEntryModel.countDocuments({ tenantId });
    expect(ledgerCountAfter).toBe(ledgerCountBefore);
  });

  it('runs explain_gap and compare_remedies multi-turn flows correctly', async () => {
    const provider = new ReplayProvider();

    // Explain gap flow
    const explainMessages: LlmMessage[] = [
      { role: 'user', content: 'Can you explain the gap in our cash flow?' },
    ];

    const explainTurn1 = await provider.generate({ messages: explainMessages });
    expect(explainTurn1.toolCalls).toHaveLength(2);
    expect(explainTurn1.toolCalls!.map((t) => t.name)).toEqual(['getForecast', 'getKpis']);

    // Compare remedies flow
    const compareMessages: LlmMessage[] = [
      { role: 'user', content: 'What are the remedies and options available?' },
    ];
    const compareTurn1 = await provider.generate({ messages: compareMessages });
    expect(compareTurn1.toolCalls).toHaveLength(1);
    expect(compareTurn1.toolCalls![0]!.name).toBe('matchFinancing');
  });
});
