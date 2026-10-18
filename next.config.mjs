// next.config.mjs

/**
 * Content Security Policy.
 *
 * Kenapa ada: aplikasi ini menampilkan konten buatan pengguna (thread, komentar,
 * doa, artikel) dan menyematkan media pihak ketiga (YouTube, Vimeo, Spotify,
 * Google Drive). Tanpa CSP, satu celah penyisipan HTML saja langsung berarti
 * eksekusi skrip di browser orang lain.
 *
 * Catatan penting soal 'unsafe-inline' pada script-src:
 * Next.js menyisipkan skrip bootstrap inline dan data hydration, jadi
 * 'unsafe-inline' masih diperlukan kecuali kita pindah ke nonce berbasis
 * middleware. Yang benar-benar penting di sini adalah `frame-src`,
 * `object-src`, dan `base-uri` — tiga-tiganya menutup vektor yang ditemukan
 * di audit (iframe ke situs sembarang, plugin lama, dan pembajakan <base>).
 */
const CSP = [
  "default-src 'self'",
  // Next.js butuh inline untuk bootstrap; 'unsafe-eval' TIDAK dipakai.
  "script-src 'self' 'unsafe-inline' https://vercel.live",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' data: https://fonts.gstatic.com",
  // Gambar: storage Supabase, avatar pihak ketiga, data URI untuk ikon.
  "img-src 'self' data: blob: https://*.supabase.co https://images.unsplash.com https://www.transparenttextures.com",
  "media-src 'self' blob: https://*.supabase.co",
  // IFRAME: hanya host embed yang diizinkan — selaras dengan
  // src/lib/attachment-policy.ts. Tanpa daftar ini, lampiran `kind: 'embed'`
  // bisa memuat situs apa pun.
  "frame-src 'self' https://www.youtube.com https://www.youtube-nocookie.com https://player.vimeo.com https://open.spotify.com https://drive.google.com https://docs.google.com https://www.google.com https://maps.google.com https://vercel.live",
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.resend.com https://api.fonnte.com",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  'upgrade-insecure-requests',
].join('; ')

/** @type {import('next').NextConfig} */
const nextConfig = {
  /**
   * Alias /tos -> /terms.
   *
   * Semula halaman `src/app/tos/page.tsx` berisi `permanentRedirect('/terms')`.
   * Next memprerender hasilnya saat build menjadi 308 TANPA header `Location`
   * (lihat `.next/server/app/tos.meta`), sehingga tautan "Syarat & Ketentuan"
   * di formulir pendaftaran berputar ke dirinya sendiri dan tidak pernah
   * sampai ke dokumennya. `redirects()` berjalan di lapisan HTTP sebelum
   * router, jadi tidak bisa di-prerender salah seperti itu.
   */
  async redirects() {
    return [{ source: '/tos', destination: '/terms', permanent: true }]
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '*.supabase.co', pathname: '/storage/v1/object/**' },
    ],
  },
  experimental: {
    serverActions: { bodySizeLimit: '2mb' },
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'Content-Security-Policy', value: CSP },
          // Paksa HTTPS selama 2 tahun. Tanpa `preload` dulu supaya tidak
          // mengunci subdomain yang mungkin belum siap HTTPS.
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
      {
        // Service worker TIDAK boleh di-cache: kalau versi lama tertahan,
        // pengguna terus melihat berkas lama meski sudah deploy.
        source: '/sw.js',
        headers: [
          { key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' },
        ],
      },
    ]
  },
}

export default nextConfig
