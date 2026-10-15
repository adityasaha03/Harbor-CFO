import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { auth } from './auth';

/**
 * Retrieves the current user session from the server request headers.
 * Returns null if no active session exists or if headers are unavailable.
 */
export async function getServerSession() {
  try {
    const reqHeaders = await headers();
    return await auth.api.getSession({
      headers: reqHeaders,
    });
  } catch {
    return null;
  }
}

/**
 * Ensures an authenticated session is present.
 * If unauthenticated, immediately redirects the user to /sign-in.
 */
export async function requireServerSession() {
  const session = await getServerSession();
  if (!session) {
    redirect('/sign-in');
  }
  return session;
}
