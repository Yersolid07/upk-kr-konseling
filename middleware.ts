import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  // Bypassing all Supabase Edge runtime fetch bugs!
  // All auth protection is now handled securely in layout.tsx (Node.js runtime)
  const { pathname } = request.nextUrl
  const publicPaths = ['/auth/login', '/auth/register', '/auth/forgot-password', '/auth/callback', '/auth/setup-error', '/privacy', '/terms', '/contact']
  const isPublicPath = pathname === '/' || publicPaths.some(p => pathname.startsWith(p))

  // We can't reliably check user here without triggering Edge DNS bugs.
  // We'll just let the layout.tsx handle the actual redirection!
  // This middleware now only prevents logged-in users (who have the cookie) from accessing public auth pages.
  const hasCookie = request.cookies.getAll().some(c => c.name.includes('-auth-token'))

  if (hasCookie && isPublicPath && !pathname.startsWith('/auth/setup-error')) {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}

