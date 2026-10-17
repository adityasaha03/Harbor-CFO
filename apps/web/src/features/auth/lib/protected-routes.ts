/**
 * Canonical list of protected application routes requiring authentication.
 */
export const PROTECTED_ROUTES = [
  '/dashboard',
  '/forecast',
  '/imports',
  '/financing',
  '/facilities', // legacy alias
  '/scenarios',
  '/actions',
  '/agent',
  '/proof',
  '/alerts',
  '/settings',
  '/company',
] as const;

/**
 * Checks whether a given path is a valid protected application route.
 * Strips query parameters and hash fragments before matching.
 * Returns false for unknown paths like /sadsd, /unknown, etc.
 */
export function isValidProtectedRoute(path: string | null | undefined): boolean {
  if (!path || typeof path !== 'string') return false;
  const cleanPath = path.split('?')[0]?.split('#')[0]?.trim() || '';
  if (!cleanPath.startsWith('/')) return false;

  return PROTECTED_ROUTES.some(
    (route) => cleanPath === route || cleanPath.startsWith(`${route}/`),
  );
}
