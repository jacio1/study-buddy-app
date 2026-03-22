import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  
  // Публичные маршруты, которые не требуют авторизации
  const publicPaths = ['/auth'];
  const isPublicPath = publicPaths.some(path => req.nextUrl.pathname.startsWith(path));

  if (isPublicPath) {
    return res;
  }

  // Для остальных маршрутов проверяем авторизацию
  // Примечание: это опциональный middleware
  // Каждая страница также проверяет авторизацию самостоятельно
  
  return res;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};