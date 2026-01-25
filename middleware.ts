
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const url = request.nextUrl;
  
  if (url.pathname.startsWith('/auth/')) {
      const newUrl = url.clone();
      // Replace /auth with /handler (e.g., /auth/callback -> /handler/callback)
      newUrl.pathname = url.pathname.replace(/^\/auth/, '/handler');
      return NextResponse.redirect(newUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/auth/:path*'],
};
