import { NextResponse, type NextRequest } from 'next/server'

// Middleware ini SENGAJA tipis.
//
// Proteksi route yang sebenarnya ada di layout.tsx (Node.js runtime) — middleware
// berjalan di Edge dan pemanggilan Supabase di sini pernah memicu bug DNS.
//
// Tugas middleware sekarang HANYA satu: kalau pengguna SUDAH login (punya
// cookie sesi) lalu membuka halaman auth, arahkan ke /dashboard.
//
// PENTING: halaman KONTEN publik (/hotline, /privacy, /terms, /contact,
// /legal) TIDAK boleh ikut di-redirect — dulu ikut, sehingga pengguna yang
// sudah login dikirim ke /dashboard saat menekan menu "Hotline Darurat" di
// sidebar dan tidak pernah bisa membukanya. Halaman itu memang publik dan
// harus tetap dapat diakses siapa pun, login atau tidak.
const AUTH_PATHS = [
  '/auth/login',
  '/auth/register',
  '/auth/forgot-password',
  '/auth/reset-password',
  '/auth/callback',
]

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // /auth/setup-error harus selalu bisa dibuka: ia justru dipakai saat sesi
  // ada tetapi profilnya bermasalah.
  if (pathname.startsWith('/auth/setup-error')) return NextResponse.next()

  const isAuthPath = AUTH_PATHS.some((p) => pathname.startsWith(p))
  if (!isAuthPath) return NextResponse.next()

  const hasCookie = request.cookies.getAll().some((c) => c.name.includes('-auth-token'))
  if (hasCookie) {
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

