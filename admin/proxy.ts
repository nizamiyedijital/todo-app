import { NextResponse, type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

/**
 * Next.js 16 Proxy (eski adı: middleware) — her request'te session refresh +
 * admin route koruması.
 *
 * Akış:
 *   /admin/* → user yok mu? → /login?next=...
 *           → user var ama admin değil mi? → /forbidden
 *           → admin → geç
 */
export async function proxy(request: NextRequest) {
  const { response, user, supabase } = await updateSession(request);

  const { pathname } = request.nextUrl;

  const isAdminRoute = pathname.startsWith('/admin');
  const isAuthRoute = pathname === '/login' || pathname === '/forbidden';

  // Auth sayfaları herkese açık (zaten login ise login sayfası kendi yönlendirir)
  if (isAuthRoute) return response;

  if (isAdminRoute) {
    // 1) Login değil → /login
    if (!user) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('next', pathname);
      return NextResponse.redirect(loginUrl);
    }

    // 2) Login ama admin değil → /forbidden
    // RPC çağrısı: is_admin() — Supabase'de tanımlı, oturum context'iyle çalışır
    const { data: isAdminRow, error } = await supabase.rpc('is_admin');
    if (error) {
      console.error('[proxy] is_admin RPC hatası:', error.message);
    }
    if (!isAdminRow) {
      return NextResponse.redirect(new URL('/forbidden', request.url));
    }
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Şu istekleri ATLA:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico, robots.txt
     * - public assets (.svg, .png, .jpg, .jpeg, .gif, .webp)
     */
    '/((?!_next/static|_next/image|favicon.ico|robots.txt|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
