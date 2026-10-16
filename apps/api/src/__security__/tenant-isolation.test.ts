import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../app';
import { useTestDb } from '../core/db/test/mongo-test-harness';
import { setupTestAuth } from '../test-utils/test-auth-helper';
import { setupTwoTenants, type SecurityTestFixtures } from './helpers';
import { eventsBus } from '../features/events/events.bus';
import type { EventDto } from '@harbor/contracts';

describe('B18 Security Suite 1: Tenant Isolation', () => {
  useTestDb();
  const app = createApp();
  let fix: SecurityTestFixtures;

  beforeAll(async () => {
    await setupTestAuth();
  });

  beforeEach(async () => {
    fix = await setupTwoTenants();
  });

  describe('Direct Resource ID Lookups', () => {
    it('returns 404 when Tenant B queries Tenant A invoice by id', async () => {
      const res = await request(app)
        .get(`/api/v1/invoices/${fix.sampleIds.invoiceAId}`)
        .set('Authorization', `Bearer ${fix.tenantB.owner.token}`)
        .set('X-Tenant-Id', fix.tenantB.id);

      expect(res.status).toBe(404);
      expect(res.body.error?.code).toBe('NOT_FOUND');
      expect(res.body.data).toBeUndefined();
    });

    it('returns 404 when Tenant B queries Tenant A alert by id', async () => {
      const res = await request(app)
        .get(`/api/v1/alerts/${fix.sampleIds.alertAId}`)
        .set('Authorization', `Bearer ${fix.tenantB.owner.token}`)
        .set('X-Tenant-Id', fix.tenantB.id);

      expect(res.status).toBe(404);
      expect(res.body.error?.code).toBe('NOT_FOUND');
    });

    it('returns 404 when Tenant B queries Tenant A action proposal by id', async () => {
      const res = await request(app)
        .get(`/api/v1/action-proposals/${fix.sampleIds.proposalAId}`)
        .set('Authorization', `Bearer ${fix.tenantB.owner.token}`)
        .set('X-Tenant-Id', fix.tenantB.id);

      expect(res.status).toBe(404);
      expect(res.body.error?.code).toBe('NOT_FOUND');
    });

    it('returns 404 when Tenant B queries Tenant A agent run by id', async () => {
      const res = await request(app)
        .get(`/api/v1/agent/runs/${fix.sampleIds.agentRunAId}`)
        .set('Authorization', `Bearer ${fix.tenantB.owner.token}`)
        .set('X-Tenant-Id', fix.tenantB.id);

      expect(res.status).toBe(404);
      expect(res.body.error?.code).toBe('NOT_FOUND');
    });
  });

  describe('List and Aggregate Isolation', () => {
    it('never leaks Tenant A accounts in Tenant B accounts list', async () => {
      const res = await request(app)
        .get('/api/v1/accounts')
        .set('Authorization', `Bearer ${fix.tenantB.owner.token}`)
        .set('X-Tenant-Id', fix.tenantB.id);

      expect(res.status).toBe(200);
      expect(res.body.data).toEqual([]);
    });

    it('never leaks Tenant A invoices in Tenant B invoices list', async () => {
      const res = await request(app)
        .get('/api/v1/invoices')
        .set('Authorization', `Bearer ${fix.tenantB.owner.token}`)
        .set('X-Tenant-Id', fix.tenantB.id);

      expect(res.status).toBe(200);
      expect(res.body.data).toEqual([]);
    });

    it('never leaks Tenant A commitments in Tenant B commitments list', async () => {
      const res = await request(app)
        .get('/api/v1/commitments')
        .set('Authorization', `Bearer ${fix.tenantB.owner.token}`)
        .set('X-Tenant-Id', fix.tenantB.id);

      expect(res.status).toBe(200);
      expect(res.body.data).toEqual([]);
    });

    it('never leaks Tenant A alerts in Tenant B alerts list', async () => {
      const res = await request(app)
        .get('/api/v1/alerts')
        .set('Authorization', `Bearer ${fix.tenantB.owner.token}`)
        .set('X-Tenant-Id', fix.tenantB.id);

      expect(res.status).toBe(200);
      expect(res.body.data).toEqual([]);
    });

    it('never leaks Tenant A proposals in Tenant B action proposals list', async () => {
      const res = await request(app)
        .get('/api/v1/action-proposals')
        .set('Authorization', `Bearer ${fix.tenantB.owner.token}`)
        .set('X-Tenant-Id', fix.tenantB.id);

      expect(res.status).toBe(200);
      expect(res.body.data).toEqual([]);
    });

    it('never leaks Tenant A agent runs in Tenant B agent runs list', async () => {
      const res = await request(app)
        .get('/api/v1/agent/runs')
        .set('Authorization', `Bearer ${fix.tenantB.owner.token}`)
        .set('X-Tenant-Id', fix.tenantB.id);

      expect(res.status).toBe(200);
      expect(res.body.data).toEqual([]);
    });
  });

  describe('Header Spoofing & Cross-Tenant Impersonation', () => {
    it('rejects with 403 when user from Tenant B sends forged X-Tenant-Id of Tenant A', async () => {
      const res = await request(app)
        .get('/api/v1/accounts')
        .set('Authorization', `Bearer ${fix.tenantB.owner.token}`)
        .set('X-Tenant-Id', fix.tenantA.id); // Forged Tenant A header

      expect(res.status).toBe(403);
      expect(res.body.error?.code).toBe('FORBIDDEN');
    });

    it('rejects with 403 when a non-member tries to access Tenant A', async () => {
      const res = await request(app)
        .get('/api/v1/accounts')
        .set('Authorization', `Bearer ${fix.stranger.token}`)
        .set('X-Tenant-Id', fix.tenantA.id);

      expect(res.status).toBe(403);
      expect(res.body.error?.code).toBe('FORBIDDEN');
    });
  });

  describe('SSE Stream Isolation', () => {
    it('ensures Tenant B event bus listeners never receive Tenant A domain events', async () => {
      let tenantBReceivedCount = 0;

      // Register listener for Tenant B on the internal bus
      const unsubscribeB = eventsBus.onTenantEvent(fix.tenantB.id, () => {
        tenantBReceivedCount += 1;
      });

      // Broadcast an event strictly for Tenant A
      const eventA: EventDto = {
        id: 'evt_sec_a_1',
        tenantId: fix.tenantA.id,
        sequence: 1,
        kind: 'forecast.updated',
        publicSummary: 'Tenant A forecast updated',
        resourceRefs: ['forecast:latest'],
        createdAt: new Date().toISOString(),
      };
      eventsBus.emitEvent(eventA);

      unsubscribeB();

      // Tenant B listener should have received 0 events
      expect(tenantBReceivedCount).toBe(0);
    });
  });
});
