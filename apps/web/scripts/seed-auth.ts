import path from 'path';
import { fileURLToPath } from 'url';
import { DEMO_EMAILS, DEMO_TENANTS } from '@harbor/contracts';
import { auth, testMemoryDb } from '../src/features/auth/server/auth';
import { mongoDb, mongoClient } from '../src/features/auth/server/mongo';

// Ensure .env is loaded if running directly via tsx / node
if (typeof process.loadEnvFile === 'function') {
  try {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    process.loadEnvFile(path.resolve(__dirname, '../.env'));
  } catch {
    // Handled if environment is already configured
  }
}

export interface SeededUser {
  id: string;
  email: string;
  name: string;
  created: boolean;
}

export interface SeededOrg {
  id: string;
  name: string;
  slug: string;
  created: boolean;
}

export interface SeededMember {
  id: string;
  userId: string;
  organizationId: string;
  role: string;
  created: boolean;
}

export interface SeedAuthResult {
  users: SeededUser[];
  organizations: SeededOrg[];
  members: SeededMember[];
}

interface MongoDocWithId {
  _id?: unknown;
  id?: string;
  [key: string]: unknown;
}

function extractId(doc: MongoDocWithId): string {
  if (doc.id && typeof doc.id === 'string') {
    return doc.id;
  }
  if (doc._id) {
    return String(doc._id);
  }
  throw new Error('Document has no id or _id');
}

async function findDoc(
  collection: 'user' | 'organization' | 'member',
  filter: Record<string, unknown>,
): Promise<MongoDocWithId | null> {
  if (process.env.NODE_ENV === 'test') {
    const list = testMemoryDb[collection] ?? [];
    const found = list.find((item) =>
      Object.entries(filter).every(([k, v]) => {
        if (k === '$or' && Array.isArray(v)) {
          return v.some((sub) =>
            Object.entries(sub as Record<string, unknown>).every(
              ([subK, subV]) => String(item[subK]) === String(subV),
            ),
          );
        }
        return String(item[k]) === String(v);
      }),
    );
    return (found as MongoDocWithId) ?? null;
  }

  return await mongoDb.collection<MongoDocWithId>(collection).findOne(filter);
}

/**
 * Idempotently seeds demo users, organizations, and team memberships through Better Auth.
 * Safe to execute repeatedly without duplicating records or corrupting roles.
 */
export async function seedAuth(options?: { password?: string }): Promise<SeedAuthResult> {
  const password = options?.password ?? process.env.DEMO_PASSWORD ?? 'Password123!';
  const users: SeededUser[] = [];
  const organizations: SeededOrg[] = [];
  const members: SeededMember[] = [];

  const demoUserDefs = [
    { email: DEMO_EMAILS.HARBOR_OWNER, name: 'Harbor Owner' },
    { email: DEMO_EMAILS.HARBOR_EMPLOYEE, name: 'Harbor Employee' },
    { email: DEMO_EMAILS.HARBOR_REVIEWER, name: 'Harbor Reviewer' },
    { email: DEMO_EMAILS.PEARL_OWNER, name: 'Pearl Owner' },
  ];

  // 1. Seed or retrieve users
  for (const def of demoUserDefs) {
    const existing = await findDoc('user', { email: def.email });
    if (existing) {
      users.push({
        id: extractId(existing),
        email: def.email,
        name: def.name,
        created: false,
      });
      continue;
    }

    const created = await auth.api.signUpEmail({
      body: {
        email: def.email,
        password,
        name: def.name,
      },
    });

    users.push({
      id: created.user.id,
      email: created.user.email,
      name: created.user.name,
      created: true,
    });
  }

  const harborOwner = users.find((u) => u.email === DEMO_EMAILS.HARBOR_OWNER);
  const pearlOwner = users.find((u) => u.email === DEMO_EMAILS.PEARL_OWNER);
  const harborEmployee = users.find((u) => u.email === DEMO_EMAILS.HARBOR_EMPLOYEE);
  const harborReviewer = users.find((u) => u.email === DEMO_EMAILS.HARBOR_REVIEWER);

  if (!harborOwner || !pearlOwner || !harborEmployee || !harborReviewer) {
    throw new Error('Failed to resolve all demo users during seeding');
  }

  // 2. Seed or retrieve organizations
  const orgDefs = [
    { name: 'Harbor Wholesale', slug: DEMO_TENANTS.HARBOR_WHOLESALE, ownerId: harborOwner.id },
    { name: 'Pearl Bakery', slug: DEMO_TENANTS.PEARL_BAKERY, ownerId: pearlOwner.id },
  ];

  for (const def of orgDefs) {
    const existing = await findDoc('organization', { slug: def.slug });
    if (existing) {
      organizations.push({
        id: extractId(existing),
        name: def.name,
        slug: def.slug,
        created: false,
      });
      continue;
    }

    const created = await auth.api.createOrganization({
      body: {
        name: def.name,
        slug: def.slug,
        userId: def.ownerId,
      },
    });

    if (!created) {
      throw new Error(`Failed to create organization ${def.slug}`);
    }

    organizations.push({
      id: created.id,
      name: created.name,
      slug: created.slug,
      created: true,
    });
  }

  const harborOrg = organizations.find((o) => o.slug === DEMO_TENANTS.HARBOR_WHOLESALE);
  const pearlOrg = organizations.find((o) => o.slug === DEMO_TENANTS.PEARL_BAKERY);

  if (!harborOrg || !pearlOrg) {
    throw new Error('Failed to resolve all demo organizations during seeding');
  }

  // 3. Seed or verify members of Harbor Wholesale
  type OrgRole = 'owner' | 'employee' | 'reviewer';
  const targetMembers: { userId: string; orgId: string; role: OrgRole }[] = [
    { userId: harborOwner.id, orgId: harborOrg.id, role: 'owner' },
    { userId: harborEmployee.id, orgId: harborOrg.id, role: 'employee' },
    { userId: harborReviewer.id, orgId: harborOrg.id, role: 'reviewer' },
    { userId: pearlOwner.id, orgId: pearlOrg.id, role: 'owner' },
  ];

  for (const target of targetMembers) {
    const existingMember = await findDoc('member', {
      $or: [
        { userId: target.userId, organizationId: target.orgId },
        { 'userId.id': target.userId, 'organizationId.id': target.orgId },
      ],
    });

    if (existingMember) {
      members.push({
        id: extractId(existingMember),
        userId: target.userId,
        organizationId: target.orgId,
        role: String(existingMember.role ?? target.role),
        created: false,
      });
      continue;
    }

    const created = await auth.api.addMember({
      body: {
        userId: target.userId,
        organizationId: target.orgId,
        role: target.role,
      },
    });

    if (!created) {
      throw new Error(`Failed to add user ${target.userId} to org ${target.orgId}`);
    }

    members.push({
      id: created.id,
      userId: target.userId,
      organizationId: target.orgId,
      role: target.role,
      created: true,
    });
  }

  return { users, organizations, members };
}

// Standalone CLI runner
async function runCli(): Promise<void> {
  const isDirectRun =
    typeof process !== 'undefined' &&
    process.argv[1] &&
    process.argv[1].replace(/\\/g, '/').endsWith('scripts/seed-auth.ts');

  if (!isDirectRun) {
    return;
  }

  try {
    const result = await seedAuth();
    const createdUsers = result.users.filter((u) => u.created).length;
    const createdOrgs = result.organizations.filter((o) => o.created).length;
    const createdMembers = result.members.filter((m) => m.created).length;

    // eslint-disable-next-line no-console
    console.log(
      `[Seed Auth] Success: ${result.users.length} users (${createdUsers} new), ${result.organizations.length} orgs (${createdOrgs} new), ${result.members.length} members (${createdMembers} new)`
    );
  } finally {
    if (process.env.NODE_ENV !== 'test') {
      await mongoClient.close();
    }
  }
}

void runCli().catch((err: unknown) => {
  // eslint-disable-next-line no-console
  console.error('[Seed Auth] Fatal error:', err);
  process.exit(1);
});
