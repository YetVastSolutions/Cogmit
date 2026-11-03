import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { decode } from 'next-auth/jwt';
import { COOKIE_SESSION_TOKEN_SECURE, COOKIE_SESSION_TOKEN_STANDARD } from '@/constants';

export async function proxy(request: NextRequest) {
  // Use the correct cookie name based on the environment
  const cookieName =
    process.env.NODE_ENV === 'production'
      ? COOKIE_SESSION_TOKEN_SECURE
      : COOKIE_SESSION_TOKEN_STANDARD;

  const sessionCookie = request.cookies.get(cookieName);

  if (sessionCookie) {
    try {
      await decode({
        token: sessionCookie.value,
        salt: cookieName,
        secret: process.env.AUTH_SECRET as string,
      });
    } catch {
      // If the token fails to decode (e.g. JWTSessionError due to secret rotation),
      // delete the cookie so it doesn't cause repeated errors in Server Components.
      const response = NextResponse.next();
      response.cookies.delete(cookieName);
      return response;
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Apply to all paths except static assets and Next.js internals
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
