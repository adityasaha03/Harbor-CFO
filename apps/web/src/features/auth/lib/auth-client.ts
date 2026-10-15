import { createAuthClient } from 'better-auth/react';
import { organizationClient, jwtClient } from 'better-auth/client/plugins';

/**
 * Better Auth frontend client configured with organization and jwt plugins.
 */
export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
  plugins: [
    organizationClient(),
    jwtClient(),
  ],
});

export type AuthClient = typeof authClient;
