import { toNextJsHandler } from 'better-auth/next-js';
import { auth } from './auth';

/**
 * Next.js App Router route handlers for Better Auth catch-all API.
 */
export const { GET, POST } = toNextJsHandler(auth);
