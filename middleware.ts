
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const url = request.nextUrl;
  
  if (url.pathname.startsWith('/auth/')) {
      const newUrl = url.clone();
      // Redirect /auth/callback -> /handler/sign-in (Invite Link Flow)
      // We send them to sign-in so they can authenticate/register and the SDK handles the 'code'.
      if (url.pathname === '/auth/callback') {
          newUrl.pathname = '/handler/sign-in';
      } else {
          // General fallback: /auth/foo -> /handler/foo
          newUrl.pathname = url.pathname.replace(/^\/auth/, '/handler');
      }
      return NextResponse.redirect(newUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/auth/:path*'],
};
