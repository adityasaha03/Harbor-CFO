import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../../../app';
import { useTestDb } from '../../../core/db/test/mongo-test-harness';
import {
  setupTestAuth,
  issueTestToken,
  seedTestMember,
} from '../../../test-utils/test-auth-helper';
import { seedAnchorTenant } from '../../scenarios/__tests__/fixtures/seed-anchor';
import { seedFinancingOffers } from '../../financing';
import { agentRepository } from '../agent.repository';
import { eventsRepository } from '../../events';
import { env } from '../../../config/env';

describe('B16 Agent Routes - Endpoints, Permissions, Isolation, and Telemetry', () => {
  useTestDb();
  const app = createApp();

  const tenantA = 'tenant_agent_routes_a';
  const tenantB = 'tenant_agent_routes_b';

  const ownerA = 'usr_agent_owner_a';
  const employeeA = 'usr_agent_emp_a';
  const reviewerA = 'usr_agent_rev_a';
  const ownerB = 'usr_agent_owner_b';

  let tokenOwnerA: string;
  let tokenEmployeeA: string;
  let tokenReviewerA: string;
  let tokenOwnerB: string;

  beforeAll(async () => {
    Object.assign(env, { LLM_PROVIDER: 'replay' as const });
    await setupTestAuth();
  });

  beforeEach(async () => {
    await seedTestMember(tenantA, ownerA, 'owner');
    await seedTestMember(tenantA, employeeA, 'employee');
    await seedTestMember(tenantA, reviewerA, 'reviewer');
    await seedTestMember(tenantB, ownerB, 'owner');

    tokenOwnerA = await issueTestToken(ownerA);
    tokenEmployeeA = await issueTestToken(employeeA);
    tokenReviewerA = await issueTestToken(reviewerA);
    tokenOwnerB = await issueTestToken(ownerB);

    await seedAnchorTenant(tenantA);
    await seedAnchorTenant(tenantB);
    await seedFinancingOffers();
  });

  it('1. POST /api/v1/agent/runs returns 202 with runId and completes asynchronously', async () => {
    const res = await request(app)
      .post('/api/v1/agent/runs')
      .set('Authorization', `Bearer ${tokenOwnerA}`)
      .set('X-Tenant-Id', tenantA)
      .send({ prompt: 'Explain the liquidity gap for Harbor Wholesale' });

    expect(res.status).toBe(202);
    expect(res.body.data).toBeDefined();
    expect(res.body.data.runId).toBeDefined();
    const runId = res.body.data.runId;

    // Immediately fetch run by id
    const getRes = await request(app)
      .get(`/api/v1/agent/runs/${runId}`)
      .set('Authorization', `Bearer ${tokenOwnerA}`)
      .set('X-Tenant-Id', tenantA);

    expect(getRes.status).toBe(200);
    expect(getRes.body.data.id).toBe(runId);
    expect(getRes.body.data.tenantId).toBe(tenantA);
    expect(getRes.body.data.mode).toBe('replay');

    // Wait briefly for background execution to complete
    let completed = false;
    for (let i = 0; i < 20; i++) {
      await new Promise((r) => setTimeout(r, 100));
      const poll = await agentRepository.findRunById(tenantA, runId);
      if (poll && (poll.status === 'completed' || poll.status === 'failed')) {
        completed = true;
        expect(poll.status).toBe('completed');
        expect(poll.finalAnswer).toBeDefined();
        expect(poll.toolCalls.length).toBeGreaterThan(0);
        break;
      }
    }
    expect(completed).toBe(true);
  });

  it('2. Reviewer receives 403 on POST /agent/runs but can read via GET', async () => {
    const postRes = await request(app)
      .post('/api/v1/agent/runs')
      .set('Authorization', `Bearer ${tokenReviewerA}`)
      .set('X-Tenant-Id', tenantA)
      .send({ prompt: 'Reviewer asking for diagnosis' });

    expect(postRes.status).toBe(403);
    expect(postRes.body.error.code).toBe('FORBIDDEN');

    // Reviewer can list runs (finance:read)
    const listRes = await request(app)
      .get('/api/v1/agent/runs')
      .set('Authorization', `Bearer ${tokenReviewerA}`)
      .set('X-Tenant-Id', tenantA);

    expect(listRes.status).toBe(200);
    expect(listRes.body.data).toBeInstanceOf(Array);
  });

  it('3. enforces strict tenant isolation on run queries', async () => {
    // Create run in tenant A
    const runA = await agentRepository.createRun(tenantA, {
      actorId: ownerA,
      mode: 'replay',
      prompt: 'Confidential tenant A analysis',
      status: 'completed',
      toolCalls: [],
      evidenceRefs: [],
      proposalIds: [],
      traceId: 'trace_iso_a',
    });

    // Tenant B attempts to fetch Tenant A run -> 404
    const getResB = await request(app)
      .get(`/api/v1/agent/runs/${runA.id}`)
      .set('Authorization', `Bearer ${tokenOwnerB}`)
      .set('X-Tenant-Id', tenantB);

    expect(getResB.status).toBe(404);
    expect(getResB.body.error.code).toBe('NOT_FOUND');

    // Tenant B list query does not leak Tenant A runs
    const listResB = await request(app)
      .get('/api/v1/agent/runs')
      .set('Authorization', `Bearer ${tokenOwnerB}`)
      .set('X-Tenant-Id', tenantB);

    expect(listResB.status).toBe(200);
    expect(listResB.body.data.length).toBe(0);
  });

  it('4. rejects with 429 when concurrency limit of 2 running runs is reached for tenant', async () => {
    // Seed 2 active 'running' runs for tenant A
    await agentRepository.createRun(tenantA, {
      actorId: ownerA,
      mode: 'replay',
      prompt: 'Running task 1',
      status: 'running',
      toolCalls: [],
      evidenceRefs: [],
      proposalIds: [],
      traceId: 'trace_active_1',
    });

    await agentRepository.createRun(tenantA, {
      actorId: ownerA,
      mode: 'replay',
      prompt: 'Running task 2',
      status: 'running',
      toolCalls: [],
      evidenceRefs: [],
      proposalIds: [],
      traceId: 'trace_active_2',
    });

    // 3rd run attempt should be rejected with 429
    const res = await request(app)
      .post('/api/v1/agent/runs')
      .set('Authorization', `Bearer ${tokenOwnerA}`)
      .set('X-Tenant-Id', tenantA)
      .send({ prompt: 'Third concurrent run' });

    expect(res.status).toBe(429);
    expect(res.body.error.code).toBe('RATE_LIMITED');
    expect(res.body.error.message).toContain('Maximum concurrent agent runs reached');
  });

  it('5. telemetry events appear in order in the event stream for run execution', async () => {
    const res = await request(app)
      .post('/api/v1/agent/runs')
      .set('Authorization', `Bearer ${tokenEmployeeA}`)
      .set('X-Tenant-Id', tenantA)
      .send({ prompt: 'Explain the liquidity gap for Harbor Wholesale' });

    expect(res.status).toBe(202);
    const runId = res.body.data.runId;

    // Wait for run completion
    for (let i = 0; i < 20; i++) {
      await new Promise((r) => setTimeout(r, 100));
      const poll = await agentRepository.findRunById(tenantA, runId);
      if (poll && poll.status === 'completed') {
        break;
      }
    }

    // Query events for tenant A
    const events = await eventsRepository.listAfter(tenantA, 0, 50);
    const runEvents = events.filter((e) => e.runId === runId);

    expect(runEvents.length).toBeGreaterThanOrEqual(3);

    const kinds = runEvents.map((e) => e.kind);
    expect(kinds).toContain('tool.started');
    expect(kinds).toContain('tool.completed');
    expect(kinds).toContain('run.completed');

    // Verify ordering by sequence
    for (let i = 1; i < runEvents.length; i++) {
      expect(runEvents[i]!.sequence).toBeGreaterThan(runEvents[i - 1]!.sequence);
    }
  });
});
