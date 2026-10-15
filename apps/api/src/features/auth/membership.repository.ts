import mongoose from 'mongoose';
import { roleSchema, type Role } from '@harbor/contracts';
import { getDb } from '../../core/db/mongo';

const { ObjectId } = mongoose.Types;

export type IdQuery =
  | string
  | mongoose.Types.ObjectId
  | { $in: (string | mongoose.Types.ObjectId)[] };

interface BetterAuthOrgDoc {
  _id?: IdQuery;
  id?: string;
}

interface BetterAuthMemberDoc {
  _id?: IdQuery;
  id?: string;
  userId?: IdQuery;
  organizationId?: IdQuery;
  role?: string;
}

/**
 * Normalizes an identifier query to match either string or ObjectId representation
 * in MongoDB collections owned by Better Auth.
 */
export function toIdQuery(id: string): IdQuery {
  if (ObjectId.isValid(id) && id.length === 24) {
    try {
      return { $in: [id, new ObjectId(id)] };
    } catch {
      return id;
    }
  }
  return id;
}

/**
 * Verifies that the tenant organization exists in the database.
 */
export async function findOrganization(tenantId: string): Promise<{ id: string } | null> {
  const db = getDb();
  const idQuery = toIdQuery(tenantId);
  const org = await db.collection<BetterAuthOrgDoc>('organization').findOne({
    $or: [{ _id: idQuery }, { id: tenantId }],
  });

  if (!org) {
    return null;
  }

  return { id: String(org.id ?? org._id) };
}

/**
 * Finds a member record for the given (userId, tenantId) pair.
 * Verifies the organization exists and validates that the member's role is a known Role.
 */
export async function findMembership(
  userId: string,
  tenantId: string,
): Promise<{ role: Role } | null> {
  const db = getDb();

  const org = await findOrganization(tenantId);
  if (!org) {
    return null;
  }

  const member = await db.collection<BetterAuthMemberDoc>('member').findOne({
    userId: toIdQuery(userId),
    organizationId: toIdQuery(tenantId),
  });

  if (!member || typeof member.role !== 'string') {
    return null;
  }

  const parsed = roleSchema.safeParse(member.role);
  if (!parsed.success) {
    return null;
  }

  return { role: parsed.data };
}

export const membershipRepository = {
  toIdQuery,
  findOrganization,
  findMembership,
};
