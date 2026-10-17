// src/lib/app-url.ts
// Alamat publik aplikasi ini, tanpa perlu variabel lingkungan tambahan.
//
// MASALAH YANG DIPERBAIKI
// Kode memakai `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback` di tiga
// tempat. Variabel itu tidak pernah disetel di Vercel, sehingga tautan
// verifikasi email dan reset kata sandi yang dikirim Supabase berbunyi
// "undefined/auth/callback" — pendaftaran berhasil, tetapi pengguna tidak
// pernah bisa mengaktifkan akunnya, dan tidak ada error di log karena
// string-nya tetap "sah" secara sintaksis.
//
// Menambah satu variabel lagi berarti bergantung pada orang mengingatnya di
// setiap environment. Header permintaan sudah membawa alamat yang benar,
// termasuk domain preview Vercel dan localhost saat pengembangan.
//
// ATURAN
//   1. APP_URL bila disetel — satu-satunya jalan memaksa domain kanonik
//      (mis. saat aplikasi di belakang proxy yang menulis header berbeda).
//   2. x-forwarded-host / host dari permintaan — dipakai Vercel.
//   3. localhost — pengembangan.

/** Buang garis miring di akhir, tanpa regex (menghindari escaping ganda). */
function stripSlash(s: string): string {
  let out = s.trim()
  while (out.endsWith('/')) out = out.slice(0, -1)
  return out
}

/**
 * Alamat absolut aplikasi, tanpa garis miring di akhir.
 *
 * `next/headers` diimpor DINAMIS, bukan di puncak berkas: Node tidak bisa
 * me-resolve subpath itu di luar bundler Next (exports map), sehingga impor
 * statis membuat berkas ini mustahil diuji. Impor dinamis hanya berjalan di
 * jalur server, yang memang satu-satunya tempat fungsi ini dipakai.
 */
export async function appUrl(): Promise<string> {
  const forced = process.env.APP_URL?.trim()
  if (forced) return stripSlash(forced)

  try {
    const { headers } = await import('next/headers')
    const h = headers()
    const host = h.get('x-forwarded-host') ?? h.get('host')
    if (host) {
      // x-forwarded-proto hanya ada di belakang proxy; Vercel selalu menulisnya.
      const proto = h.get('x-forwarded-proto') ?? (host.startsWith('localhost') ? 'http' : 'https')
      return `${proto}://${stripSlash(host)}`
    }
  } catch {
    // Di luar konteks permintaan (mis. skrip build). Jatuh ke bawah.
  }

  return 'http://localhost:3000'
}

/** Versi yang menerima header eksplisit — untuk Route Handler yang sudah punya `request`. */
export function appUrlFrom(request: Request): string {
  const forced = process.env.APP_URL?.trim()
  if (forced) return stripSlash(forced)

  const h = request.headers
  const host = h.get('x-forwarded-host') ?? h.get('host')
  if (!host) return stripSlash(new URL(request.url).origin)

  const cleanHost = stripSlash(host)
  const proto = h.get('x-forwarded-proto') ?? (cleanHost.startsWith('localhost') ? 'http' : 'https')
  return `${proto}://${cleanHost}`
}
