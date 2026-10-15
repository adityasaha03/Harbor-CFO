import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { generateKeyPair, exportJWK, SignJWT, createLocalJWKSet, type JWTVerifyGetKey } from 'jose';
import { createApp } from '../../../app';
import { useTestDb } from '../../../core/db/test/mongo-test-harness';
import { getDb } from '../../../core/db/mongo';
import { env } from '../../../config/env';
import { setRemoteJwksForTesting } from '../../auth/jwt-verifier';
import { eventsService } from '../events.service';
import { EventModel } from '../events.model';

describe('Events feature tests (Model, Gap-Free Concurrent Publishes & REST Replay)', () => {
  useTestDb();

  let privateKey: Parameters<SignJWT['sign']>[0];
  const app = createApp();

  beforeAll(async () => {
    const pair = await generateKeyPair('RS256');
    privateKey = pair.privateKey;
    const jwk = await exportJWK(pair.publicKey);
    jwk.kid = 'events-test-kid';
    jwk.alg = 'RS256';

    const localJwks = createLocalJWKSet({ keys: [jwk] }) as unknown as JWTVerifyGetKey;
    setRemoteJwksForTesting(localJwks);
  });

  async function issueToken(userId: string): Promise<string> {
    return await new SignJWT({ sub: userId })
      .setProtectedHeader({ alg: 'RS256', kid: 'events-test-kid' })
      .setIssuer(env.BETTER_AUTH_URL)
      .setAudience(env.BETTER_AUTH_URL)
      .setExpirationTime('15m')
      .sign(privateKey);
  }

  describe('Model indexes & TTL', () => {
    it('verifies unique and TTL index definitions on EventModel', async () => {
      await EventModel.init();
      const indexes = await EventModel.collection.indexes();

      // Check unique (tenantId, sequence)
      const uniqueSeqIndex = indexes.find(
        (idx) => idx.key.tenantId === 1 && idx.key.sequence === 1 && idx.unique === true,
      );
      expect(uniqueSeqIndex).toBeDefined();

      // Check TTL on createdAt (expireAfterSeconds: 604800)
      const ttlIndex = indexes.find(
        (idx) => idx.key.createdAt === 1 && idx.expireAfterSeconds === 7 * 24 * 60 * 60,
      );
      expect(ttlIndex).toBeDefined();
    });
  });

  describe('Gap-free sequence under concurrent publishes', () => {
    it('produces a strictly increasing gap-free sequence under 20 concurrent publishes', async () => {
      const tenantId = 'tenant_concurrent_01';

      // Fire 20 concurrent publishes
      const tasks = Array.from({ length: 20 }, (_, idx) =>
        eventsService.publish(tenantId, {
          kind: 'forecast.updated',
          publicSummary: `Concurrent update ${idx + 1}`,
          resourceRefs: [`ref-${idx + 1}`],
        }),
      );

      const published = await Promise.all(tasks);
      expect(published.length).toBe(20);

      // Verify each received event has unique sequence
      const sequences = published.map((e) => e.sequence).sort((a, b) => a - b);
      const expected = Array.from({ length: 20 }, (_, idx) => idx + 1);

      expect(sequences).toEqual(expected);

      // Verify database documents
      const docs = await EventModel.find({ tenantId }).sort({ sequence: 1 }).lean();
      expect(docs.length).toBe(20);
      expect(docs.map((d) => d.sequence)).toEqual(expected);
    });

    it('maintains independent sequence spaces per tenant', async () => {
      const t1 = await eventsService.publish('tenant_indep_A', {
        kind: 'import.committed',
        publicSummary: 'Tenant A Event 1',
      });
      const t2 = await eventsService.publish('tenant_indep_B', {
        kind: 'import.committed',
        publicSummary: 'Tenant B Event 1',
      });

      expect(t1.sequence).toBe(1);
      expect(t2.sequence).toBe(1);

      const t1_next = await eventsService.publish('tenant_indep_A', {
        kind: 'alert.raised',
        publicSummary: 'Tenant A Event 2',
      });

      expect(t1_next.sequence).toBe(2);
    });
  });

  describe('GET /api/v1/events REST Replay endpoint', () => {
    it('replays events strictly after sequence with limit and tenant isolation', async () => {
      const tenantA = 'tenant_replay_A';
      const tenantB = 'tenant_replay_B';

      const db = getDb();
      await db.collection('organization').insertMany([
        { id: tenantA, name: 'Replay Org A' },
        { id: tenantB, name: 'Replay Org B' },
      ]);
      await db.collection('member').insertMany([
        { userId: 'usr_replay_a', organizationId: tenantA, role: 'reviewer' }, // has finance:read
        { userId: 'usr_replay_b', organizationId: tenantB, role: 'reviewer' },
      ]);

      // Seed 5 events for tenant A
      for (let i = 1; i <= 5; i++) {
        await eventsService.publish(tenantA, {
          kind: 'alert.raised',
          publicSummary: `Tenant A Alert ${i}`,
          resourceRefs: [`alert-${i}`],
        });
      }

      // Seed 2 events for tenant B
      for (let i = 1; i <= 2; i++) {
        await eventsService.publish(tenantB, {
          kind: 'forecast.updated',
          publicSummary: `Tenant B Forecast ${i}`,
        });
      }

      const tokenA = await issueToken('usr_replay_a');
      const tokenB = await issueToken('usr_replay_b');

      // Replay all for tenant A (after=0)
      const resAAll = await request(app)
        .get('/api/v1/events?after=0')
        .set('Authorization', `Bearer ${tokenA}`)
        .set('X-Tenant-Id', tenantA);

      expect(resAAll.status).toBe(200);
      expect(resAAll.body.data.length).toBe(5);
      expect(resAAll.body.data[0].sequence).toBe(1);
      expect(resAAll.body.data[4].sequence).toBe(5);

      // Replay after sequence 3 for tenant A with limit 2
      const resAPartial = await request(app)
        .get('/api/v1/events?after=3&limit=2')
        .set('Authorization', `Bearer ${tokenA}`)
        .set('X-Tenant-Id', tenantA);

      expect(resAPartial.status).toBe(200);
      expect(resAPartial.body.data.length).toBe(2);
      expect(resAPartial.body.data[0].sequence).toBe(4);
      expect(resAPartial.body.data[1].sequence).toBe(5);

      // Tenant B replay receives ONLY tenant B events
      const resB = await request(app)
        .get('/api/v1/events?after=0')
        .set('Authorization', `Bearer ${tokenB}`)
        .set('X-Tenant-Id', tenantB);

      expect(resB.status).toBe(200);
      expect(resB.body.data.length).toBe(2);
      expect(resB.body.data[0].publicSummary).toBe('Tenant B Forecast 1');
      expect(resB.body.data[1].publicSummary).toBe('Tenant B Forecast 2');
    });

    it('requires authentication for replay', async () => {
      const res = await request(app)
        .get('/api/v1/events?after=0')
        .set('X-Tenant-Id', 'tenant_anon');

      expect(res.status).toBe(401);
    });
  });
});

