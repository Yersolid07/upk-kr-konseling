// src/app/auth/confirm/route.ts
//
// Titik masuk tautan email berbasis `token_hash`.
//
// MENGAPA ADA
// Template email Supabase secara bawaan memakai {{ .ConfirmationURL }}, yang
// menunjuk ke `{SUPABASE_URL}/auth/v1/verify?token=...&redirect_to=<site_url>`.
// Artinya setiap tautan verifikasi dan reset melewati konfigurasi `site_url` di
// Dashboard. Pada proyek ini `site_url` masih `http://localhost:3000` dan
// daftar Redirect URLs kosong, sehingga:
//   - Supabase MENGABAIKAN `redirect_to` yang dikirim aplikasi (dibuktikan:
//     `options.redirect_to` berisi localhost:3002 tetapi tautan yang dihasilkan
//     tetap localhost:3000),
//   - setiap tautan di email mendarat di localhost milik penerima.
//
// Rute ini memakai `token_hash` + `type`, yang diverifikasi DI SINI memakai
// kode aplikasi sendiri, lalu diarahkan ke path relatif terhadap permintaan
// yang sedang berjalan. Dengan begitu alamat tujuan tidak lagi bergantung pada
// `site_url` dan tetap benar di localhost maupun di domain produksi.
//
// Template email harus memakai bentuk:
//   {{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email&next=/auth/login?verified=1
// atau, bila Site URL belum bisa diubah, tautan manual ke domain aplikasi.

import { type EmailOtpType } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const ALLOWED_TYPES: EmailOtpType[] = [
  'signup',
  'invite',
  'magiclink',
  'recovery',
  'email_change',
  'email',
]

// Tujuan hanya boleh path internal. Tanpa batas ini, tautan email buatan
// penyerang bisa dipakai untuk melempar pengguna ke situs lain setelah login.
function safeNext(raw: string | null, fallback: string) {
  if (!raw) return fallback
  if (!raw.startsWith('/') || raw.startsWith('//')) return fallback
  return raw
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const tokenHash = searchParams.get('token_hash')
  const type = searchParams.get('type') as EmailOtpType | null

  if (tokenHash && type && ALLOWED_TYPES.includes(type)) {
    const supabase = createClient()
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash })

    if (!error) {
      const next = safeNext(
        searchParams.get('next'),
        type === 'recovery' ? '/auth/reset-password' : '/auth/login?verified=1'
      )
      return NextResponse.redirect(`${origin}${next}`)
    }

    console.error('verifyOtp:', type, error.message)
  }

  const reason = type === 'recovery' ? 'reset' : 'verify'
  return NextResponse.redirect(`${origin}/auth/login?error=${reason}`)
}
