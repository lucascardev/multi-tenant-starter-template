
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const url = request.nextUrl;
  
  if (url.pathname.startsWith('/auth/')) {
      const newUrl = url.clone();
      // Redirect /auth/callback -> /handler/team-invitation (Correct Stack Auth Flow)
      // This is the specific handler for processing team invites.
      if (url.pathname === '/auth/callback') {
          newUrl.pathname = '/handler/team-invitation';
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
