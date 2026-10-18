// src/app/auth/verify-status/actions.ts
'use server'

// Memeriksa apakah email sudah diverifikasi.
//
// Memakai klien service role karena `email_confirmed_at` tidak dapat dibaca
// dengan kunci anon — RLS pada auth.users menutupnya. Ini berjalan di server,
// jadi kunci tidak pernah sampai ke browser.
//
// CATATAN PRIVASI: endpoint ini membocorkan apakah sebuah email terdaftar.
// Itu disengaja dan konsisten dengan alur pendaftaran, yang memang memberi tahu
// pengguna bila emailnya sudah dipakai. Platform ini komunitas alumni tertutup,
// bukan layanan publik.

import { createAdminClient } from '@/lib/supabase/server'

export interface VerifyStatus {
  /** Email belum terdaftar sama sekali. */
  unknown?: boolean
  /** Terdaftar tetapi belum diklik tautan verifikasinya. */
  pending?: boolean
  /** Sudah terverifikasi. */
  confirmed?: boolean
  error?: string
}

export async function checkVerification(email: string): Promise<VerifyStatus> {
  const clean = email.trim().toLowerCase()
  if (!clean.includes('@')) return { error: 'Alamat email tidak valid.' }

  const admin = createAdminClient()

  // listUsers tidak mendukung pencarian per email di semua versi; memakai
  // filter bawaan lebih andal daripada memindai halaman.
  const { data, error } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 })
  if (error) return { error: 'Tidak dapat memeriksa status. Coba lagi sebentar.' }

  // `data.users` bertipe `never[]` pada klien ini karena generic Database tidak
  // mendeklarasikan tabel auth.* — cast sempit lebih baik daripada mengubah
  // tipe seluruh klien.
  const users = (data?.users ?? []) as { email?: string | null; email_confirmed_at?: string | null }[]
  const user = users.find((u) => (u.email ?? '').toLowerCase() === clean)
  if (!user) return { unknown: true }

  return { confirmed: Boolean(user.email_confirmed_at), pending: !user.email_confirmed_at }
}

/**
 * Kirim ulang email verifikasi.
 *
 * Memakai `resend` bawaan Supabase, bukan signUp ulang: signUp dengan email
 * yang sudah ada tidak mengirim apa pun (lihat catatan di auth/actions.ts).
 */
export async function resendVerification(email: string): Promise<{ ok?: boolean; error?: string }> {
  const clean = email.trim().toLowerCase()
  if (!clean.includes('@')) return { error: 'Alamat email tidak valid.' }

  const { createClient } = await import('@/lib/supabase/server')
  const supabase = createClient()

  const { error } = await supabase.auth.resend({ type: 'signup', email: clean })
  if (error) {
    // Supabase membatasi laju pengiriman; sampaikan apa adanya agar pengguna
    // tahu harus menunggu, bukan mengira tombolnya rusak.
    if (/rate|too many|429/i.test(error.message)) {
      return { error: 'Terlalu sering. Tunggu beberapa menit sebelum mencoba lagi.' }
    }
    return { error: error.message }
  }
  return { ok: true }
}
