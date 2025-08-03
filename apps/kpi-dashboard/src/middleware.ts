// File: apps/kpi-dashboard/src/middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Skip public and special paths
  const publicPaths = ['/login', '/signup', '/favicon.ico', '/api'];
  const isPublic = publicPaths.some(path => pathname.startsWith(path)) || pathname.startsWith('/_next');

  if (isPublic) {
    return NextResponse.next(); // allow access
  }

  // Check Supabase auth cookie
  const token = req.cookies.get('sb-access-token');
  if (!token) {
    const loginUrl = new URL('/login', req.url);
    loginUrl.searchParams.set('redirectedFrom', pathname); // optional: preserve target
    return NextResponse.redirect(loginUrl);
  }

  // Allow request to proceed
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next|api|favicon.ico).*)'], // exclude _next, api, and static files
};
