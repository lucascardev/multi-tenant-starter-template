
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const url = request.nextUrl;
  
  if (url.pathname.startsWith('/auth/')) {
      const newUrl = url.clone();
      newUrl.pathname = `/handler${url.pathname}`;
      return NextResponse.redirect(newUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/auth/:path*'],
};
