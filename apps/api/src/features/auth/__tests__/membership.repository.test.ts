import { describe, it, expect } from 'vitest';
import mongoose from 'mongoose';
import { useTestDb } from '../../../core/db/test/mongo-test-harness';
import { getDb } from '../../../core/db/mongo';
import {
  findMembership,
  findOrganization,
  toIdQuery,
} from '../membership.repository';

const { ObjectId } = mongoose.Types;

describe('membership.repository', () => {
  useTestDb();

  describe('toIdQuery', () => {
    it('returns raw string for non-24-char IDs', () => {
      const id = 'custom_slug_123';
      expect(toIdQuery(id)).toBe(id);
    });

    it('returns $in with string and ObjectId for valid 24-character hex string', () => {
      const validHex = new ObjectId().toHexString();
      const query = toIdQuery(validHex);

      expect(query).toEqual({
        $in: [validHex, new ObjectId(validHex)],
      });
    });
  });

  describe('findOrganization', () => {
    it('finds organization stored with string _id', async () => {
      const db = getDb();
      await db.collection('organization').insertOne({
        _id: 'org_string_id' as unknown as mongoose.Types.ObjectId,
        name: 'Harbor Demo Inc',
      });

      const found = await findOrganization('org_string_id');
      expect(found).not.toBeNull();
      expect(found?.id).toBe('org_string_id');
    });

    it('finds organization stored with ObjectId _id', async () => {
      const db = getDb();
      const orgId = new ObjectId();
      await db.collection('organization').insertOne({
        _id: orgId,
        name: 'Harbor Tech Ltd',
      });

      const found = await findOrganization(orgId.toHexString());
      expect(found).not.toBeNull();
      expect(found?.id).toBe(orgId.toHexString());
    });

    it('finds organization stored with string id field', async () => {
      const db = getDb();
      await db.collection('organization').insertOne({
        id: 'org_field_custom',
        name: 'Custom Org Field',
      });

      const found = await findOrganization('org_field_custom');
      expect(found).not.toBeNull();
      expect(found?.id).toBe('org_field_custom');
    });

    it('returns null if organization does not exist', async () => {
      const found = await findOrganization('org_nonexistent');
      expect(found).toBeNull();
    });
  });

  describe('findMembership', () => {
    it('resolves member when stored as string userId and organizationId', async () => {
      const db = getDb();
      await db.collection('organization').insertOne({
        _id: 'tenant_str_01' as unknown as mongoose.Types.ObjectId,
        name: 'Test Tenant',
      });
      await db.collection('member').insertOne({
        userId: 'user_str_01',
        organizationId: 'tenant_str_01',
        role: 'owner',
      });

      const membership = await findMembership('user_str_01', 'tenant_str_01');
      expect(membership).toEqual({ role: 'owner' });
    });

    it('resolves member when stored as ObjectId userId and organizationId', async () => {
      const db = getDb();
      const orgId = new ObjectId();
      const userId = new ObjectId();

      await db.collection('organization').insertOne({
        _id: orgId,
        name: 'Test Tenant ObjectIds',
      });
      await db.collection('member').insertOne({
        userId: userId,
        organizationId: orgId,
        role: 'employee',
      });

      const membership = await findMembership(userId.toHexString(), orgId.toHexString());
      expect(membership).toEqual({ role: 'employee' });
    });

    it('resolves reviewer role correctly', async () => {
      const db = getDb();
      await db.collection('organization').insertOne({
        _id: 'tenant_rev' as unknown as mongoose.Types.ObjectId,
        name: 'Reviewer Tenant',
      });
      await db.collection('member').insertOne({
        userId: 'user_rev',
        organizationId: 'tenant_rev',
        role: 'reviewer',
      });

      const membership = await findMembership('user_rev', 'tenant_rev');
      expect(membership).toEqual({ role: 'reviewer' });
    });

    it('returns null if tenant does not exist even if member row exists', async () => {
      const db = getDb();
      await db.collection('member').insertOne({
        userId: 'user_orphan',
        organizationId: 'missing_tenant',
        role: 'owner',
      });

      const membership = await findMembership('user_orphan', 'missing_tenant');
      expect(membership).toBeNull();
    });

    it('returns null if user is not a member of the organization', async () => {
      const db = getDb();
      await db.collection('organization').insertOne({
        _id: 'org_real' as unknown as mongoose.Types.ObjectId,
        name: 'Real Org',
      });

      const membership = await findMembership('user_nonmember', 'org_real');
      expect(membership).toBeNull();
    });

    it('returns null if member record contains an unknown or invalid role', async () => {
      const db = getDb();
      await db.collection('organization').insertOne({
        _id: 'org_invalid_role' as unknown as mongoose.Types.ObjectId,
        name: 'Invalid Role Org',
      });
      await db.collection('member').insertOne({
        userId: 'user_superadmin',
        organizationId: 'org_invalid_role',
        role: 'superadmin', // Not in contracts ROLES ('owner' | 'employee' | 'reviewer')
      });

      const membership = await findMembership('user_superadmin', 'org_invalid_role');
      expect(membership).toBeNull();
    });
  });
});
