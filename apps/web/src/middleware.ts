import { NextResponse, type NextRequest } from 'next/server';
import { getSessionCookie } from 'better-auth/cookies';

const AUTH_ROUTES = ['/sign-in', '/sign-up'];
const PROTECTED_PREFIXES = [
  '/dashboard',
  '/forecast',
  '/imports',
  '/financing',
  '/facilities',
  '/scenarios',
  '/actions',
  '/agent',
  '/proof',
  '/alerts',
  '/settings',
  '/company',
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const sessionCookie = getSessionCookie(request);

  // Authenticated users trying to access auth pages are redirected to dashboard
  if (AUTH_ROUTES.some((route) => pathname.startsWith(route))) {
    if (sessionCookie) {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
    return NextResponse.next();
  }

  // Root redirect optimization
  if (pathname === '/') {
    const target = sessionCookie ? '/dashboard' : '/sign-in';
    return NextResponse.redirect(new URL(target, request.url));
  }

  // Check for protected routes
  const isProtected = PROTECTED_PREFIXES.some((prefix) => pathname.startsWith(prefix));

  if (isProtected && !sessionCookie) {
    const signInUrl = new URL('/sign-in', request.url);
    signInUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(signInUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, sitemap.xml, robots.txt (metadata files)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)',
  ],
};
