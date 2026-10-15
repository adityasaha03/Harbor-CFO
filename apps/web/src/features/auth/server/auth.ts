import { betterAuth } from 'better-auth';
import { mongodbAdapter } from '@better-auth/mongo-adapter';
import { memoryAdapter } from '@better-auth/memory-adapter';
import { organization, jwt } from 'better-auth/plugins';
import { nextCookies } from 'better-auth/next-js';
import { getServerAuthEnv } from './env';
import { mongoClient, mongoDb } from './mongo';
import { ac, roles } from './access-control';

const env = getServerAuthEnv();

const isTest = process.env.NODE_ENV === 'test';
const testMemoryDb: Record<string, Record<string, unknown>[]> = {
  user: [],
  session: [],
  account: [],
  organization: [],
  member: [],
  invitation: [],
  jwks: [],
  rateLimit: [],
  verification: [],
};

const databaseAdapter = isTest
  ? memoryAdapter(testMemoryDb)
  : mongodbAdapter(mongoDb, {
      client: mongoClient,
    });

export const auth = betterAuth({
  appName: 'HarborCFO',
  baseURL: env.BETTER_AUTH_URL,
  secret: env.BETTER_AUTH_SECRET,
  database: databaseAdapter,
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    requireEmailVerification: false,
  },
  rateLimit: {
    enabled: true,
    window: 60,
    max: 100,
    storage: 'database',
  },
  trustedOrigins: [
    env.BETTER_AUTH_URL,
    process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
  ],
  databaseHooks: {
    session: {
      create: {
        before: async (session) => {
          if (!session.activeOrganizationId && !isTest) {
            try {
              const member = await mongoDb
                .collection('member')
                .findOne({ userId: session.userId }, { sort: { createdAt: 1 } });
              if (member && member.organizationId) {
                return {
                  data: {
                    ...session,
                    activeOrganizationId: String(member.organizationId),
                  },
                };
              }
            } catch {
              // Non-blocking fallback if organization lookup is unavailable
            }
          }
          return { data: session };
        },
      },
    },
  },
  plugins: [
    organization({
      creatorRole: 'owner',
      ac,
      roles,
    }),
    jwt({
      jwt: {
        expirationTime: '15m',
        definePayload: ({ user }) => ({
          id: user.id,
          email: user.email,
        }),
      },
    }),
    nextCookies(),
  ],
});

export type Auth = typeof auth;
