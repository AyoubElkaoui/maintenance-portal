import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

const PUBLIC_FILE = /\.(.*)$/;

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Allow Next.js internals and public files
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/static') ||
    pathname === '/favicon.ico' ||
    PUBLIC_FILE.test(pathname) ||
    pathname.startsWith('/public') ||
    pathname === '/signin' ||
    pathname.startsWith('/download')
  ) {
    return NextResponse.next();
  }

  // Get NextAuth token (session) from the request
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });

  if (!token) {
    const signInUrl = new URL('/signin', req.url);
    return NextResponse.redirect(signInUrl);
  }

  // All other requests allowed if authenticated
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api/auth|_next|static|favicon.ico).*)'],
};
