import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const token = request.cookies.get('token');
  const pathname = request.nextUrl.pathname;

  // 認証が必要なページ
  const protectedPaths = ['/dashboard', '/profile', '/create-profile'];
  
  // 認証済みユーザーがアクセスすべきでないページ
  const publicOnlyPaths = ['/auth'];

  // 認証が必要なページで未認証の場合
  if (protectedPaths.some(path => pathname.startsWith(path))) {
    if (!token) {
      return NextResponse.redirect(new URL('/auth', request.url));
    }
  }

  // 認証済みユーザーが認証ページにアクセスした場合
  if (publicOnlyPaths.some(path => pathname.startsWith(path))) {
    if (token) {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}; 