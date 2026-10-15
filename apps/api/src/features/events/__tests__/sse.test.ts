import http from 'node:http';
import type { AddressInfo } from 'node:net';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { generateKeyPair, exportJWK, SignJWT, createLocalJWKSet, type JWTVerifyGetKey } from 'jose';
import { createApp } from '../../../app';
import { useTestDb } from '../../../core/db/test/mongo-test-harness';
import { getDb } from '../../../core/db/mongo';
import { env } from '../../../config/env';
import { setRemoteJwksForTesting } from '../../auth/jwt-verifier';
import { eventsService } from '../events.service';
import { resetActiveStreamCountsForTesting } from '../sse';

describe('SSE streaming endpoint tests (/api/v1/events/stream)', () => {
  useTestDb();

  let privateKey: Parameters<SignJWT['sign']>[0];
  const app = createApp();
  let server: http.Server;
  let port: number;

  beforeAll(async () => {
    const pair = await generateKeyPair('RS256');
    privateKey = pair.privateKey;
    const jwk = await exportJWK(pair.publicKey);
    jwk.kid = 'sse-test-kid';
    jwk.alg = 'RS256';

    const localJwks = createLocalJWKSet({ keys: [jwk] }) as unknown as JWTVerifyGetKey;
    setRemoteJwksForTesting(localJwks);

    await new Promise<void>((resolve) => {
      server = app.listen(0, () => {
        port = (server.address() as AddressInfo).port;
        resolve();
      });
    });
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => {
      server.close(() => resolve());
    });
  });

  async function issueToken(userId: string, expiresIn = '15m'): Promise<string> {
    return await new SignJWT({ sub: userId })
      .setProtectedHeader({ alg: 'RS256', kid: 'sse-test-kid' })
      .setIssuer(env.BETTER_AUTH_URL)
      .setAudience(env.BETTER_AUTH_URL)
      .setExpirationTime(expiresIn)
      .sign(privateKey);
  }

  it('replays historical events then receives live broadcast event', async () => {
    resetActiveStreamCountsForTesting();
    const tenantId = 'tenant_sse_live';
    const db = getDb();
    await db.collection('organization').insertOne({ id: tenantId, name: 'SSE Org' });
    await db.collection('member').insertOne({
      userId: 'usr_sse_1',
      organizationId: tenantId,
      role: 'owner',
    });

    // Seed 2 historical events
    await eventsService.publish(tenantId, {
      kind: 'alert.raised',
      publicSummary: 'Historical event 1',
    });
    await eventsService.publish(tenantId, {
      kind: 'alert.raised',
      publicSummary: 'Historical event 2',
    });

    const token = await issueToken('usr_sse_1');

    const receivedChunks: string[] = [];

    await new Promise<void>((resolve, reject) => {
      const req = http.request(
        {
          hostname: '127.0.0.1',
          port,
          path: '/api/v1/events/stream?after=0',
          method: 'GET',
          headers: {
            Authorization: `Bearer ${token}`,
            'X-Tenant-Id': tenantId,
            Accept: 'text/event-stream',
          },
        },
        (res) => {
          expect(res.statusCode).toBe(200);
          expect(res.headers['content-type']).toContain('text/event-stream');

          res.on('data', (chunk: Buffer) => {
            const text = chunk.toString();
            receivedChunks.push(text);

            // After receiving historical events, trigger a live broadcast
            if (receivedChunks.join('').includes('Historical event 2') && !receivedChunks.join('').includes('Live broadcast event')) {
              void eventsService.publish(tenantId, {
                kind: 'import.committed',
                publicSummary: 'Live broadcast event',
              });
            }

            // Once live event is received, close stream and complete test
            if (receivedChunks.join('').includes('Live broadcast event')) {
              req.destroy();
              resolve();
            }
          });

          res.on('error', reject);
        },
      );

      req.on('error', (err) => {
        // Destroying the socket causes expected ECONNRESET/abort
        if (!receivedChunks.join('').includes('Live broadcast event')) {
          reject(err);
        }
      });

      req.end();
    });

    const fullStream = receivedChunks.join('');
    expect(fullStream).toContain('Historical event 1');
    expect(fullStream).toContain('Historical event 2');
    expect(fullStream).toContain('Live broadcast event');
  });

  it('guarantees tenant isolation: tenant B never receives tenant A events', async () => {
    resetActiveStreamCountsForTesting();
    const tenantA = 'tenant_sse_iso_A';
    const tenantB = 'tenant_sse_iso_B';

    const db = getDb();
    await db.collection('organization').insertMany([
      { id: tenantA, name: 'Iso A' },
      { id: tenantB, name: 'Iso B' },
    ]);
    await db.collection('member').insertMany([
      { userId: 'usr_iso_a', organizationId: tenantA, role: 'owner' },
      { userId: 'usr_iso_b', organizationId: tenantB, role: 'owner' },
    ]);

    const tokenB = await issueToken('usr_iso_b');
    const receivedB: string[] = [];

    await new Promise<void>((resolve) => {
      const req = http.request(
        {
          hostname: '127.0.0.1',
          port,
          path: '/api/v1/events/stream',
          method: 'GET',
          headers: {
            Authorization: `Bearer ${tokenB}`,
            'X-Tenant-Id': tenantB,
            Accept: 'text/event-stream',
          },
        },
        (res) => {
          res.on('data', (chunk: Buffer) => {
            receivedB.push(chunk.toString());
          });

          // Wait a tick to ensure stream is established
          setTimeout(async () => {
            // Publish on tenant A
            await eventsService.publish(tenantA, {
              kind: 'alert.raised',
              publicSummary: 'Secret message for A',
            });

            // Publish on tenant B
            await eventsService.publish(tenantB, {
              kind: 'forecast.updated',
              publicSummary: 'Public message for B',
            });

            // Wait for delivery
            setTimeout(() => {
              req.destroy();
              resolve();
            }, 100);
          }, 50);
        },
      );

      req.on('error', () => {
        // socket destroy
      });
      req.end();
    });

    const textB = receivedB.join('');
    expect(textB).toContain('Public message for B');
    expect(textB).not.toContain('Secret message for A');
  });

  it('closes stream when the callers JWT token expires', async () => {
    resetActiveStreamCountsForTesting();
    const tenantId = 'tenant_sse_expiry';
    const db = getDb();
    await db.collection('organization').insertOne({ id: tenantId, name: 'Expiry Org' });
    await db.collection('member').insertOne({
      userId: 'usr_expiring',
      organizationId: tenantId,
      role: 'owner',
    });

    // Token expires in 1 second
    const shortLivedToken = await issueToken('usr_expiring', '1s');

    await new Promise<void>((resolve, reject) => {
      const req = http.request(
        {
          hostname: '127.0.0.1',
          port,
          path: '/api/v1/events/stream',
          method: 'GET',
          headers: {
            Authorization: `Bearer ${shortLivedToken}`,
            'X-Tenant-Id': tenantId,
            Accept: 'text/event-stream',
          },
        },
        (res) => {
          expect(res.statusCode).toBe(200);
          res.resume();

          res.on('end', () => {
            // Server ended response when token expired
            resolve();
          });

          res.on('error', reject);
        },
      );

      req.on('error', reject);
      req.end();
    });
  });

  it('rejects with 429 when user exceeds max 5 concurrent streams', async () => {
    resetActiveStreamCountsForTesting();
    const tenantId = 'tenant_sse_limit';
    const db = getDb();
    await db.collection('organization').insertOne({ id: tenantId, name: 'Limit Org' });
    await db.collection('member').insertOne({
      userId: 'usr_stream_limit',
      organizationId: tenantId,
      role: 'owner',
    });

    const token = await issueToken('usr_stream_limit');
    const openRequests: http.ClientRequest[] = [];

    try {
      // Open 5 concurrent connections
      for (let i = 0; i < 5; i++) {
        await new Promise<void>((resolve) => {
          const req = http.request(
            {
              hostname: '127.0.0.1',
              port,
              path: '/api/v1/events/stream',
              method: 'GET',
              headers: {
                Authorization: `Bearer ${token}`,
                'X-Tenant-Id': tenantId,
                Accept: 'text/event-stream',
              },
            },
            (res) => {
              expect(res.statusCode).toBe(200);
              resolve();
            },
          );
          req.end();
          openRequests.push(req);
        });
      }

      // The 6th connection attempt must receive 429 RATE_LIMITED
      const res6 = await request(app)
        .get('/api/v1/events/stream')
        .set('Authorization', `Bearer ${token}`)
        .set('X-Tenant-Id', tenantId);

      expect(res6.status).toBe(429);
      expect(res6.body.error.code).toBe('RATE_LIMITED');
    } finally {
      // Clean up open connections
      for (const req of openRequests) {
        req.destroy();
      }
    }
  });
});
