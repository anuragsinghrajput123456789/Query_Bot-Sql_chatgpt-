import { NextRequest, NextResponse } from 'next/server';
import { verifySessionToken, SESSION_COOKIE_NAME } from '@/lib/auth/session';

const PROTECTED_PAGE_PREFIXES = ['/workspace'];
const PROTECTED_API_PREFIXES = ['/api/query', '/api/schema', '/api/history', '/api/upload'];
const AUTH_PAGES = ['/login', '/signup'];

function isProtectedPage(pathname: string) {
  return PROTECTED_PAGE_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

function isProtectedApi(pathname: string) {
  return PROTECTED_API_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

export async function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  const session = await verifySessionToken(req.cookies.get(SESSION_COOKIE_NAME)?.value);

  if (AUTH_PAGES.includes(pathname) && session) {
    return NextResponse.redirect(new URL('/workspace', req.url));
  }

  if (isProtectedApi(pathname) && !session) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized' },
      { status: 401 }
    );
  }

  if (isProtectedPage(pathname) && !session) {
    const loginUrl = new URL('/login', req.url);
    loginUrl.searchParams.set('next', `${pathname}${search}`);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/workspace/:path*', '/api/query/:path*', '/api/schema/:path*', '/api/history/:path*', '/api/upload/:path*', '/login', '/signup'],
};
