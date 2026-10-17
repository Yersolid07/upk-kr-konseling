// src/app/(app)/keamanan/actions.ts
'use server'

// Aksi pendaftaran & verifikasi faktor TOTP.
//
// Semua di sini memakai klien PENGGUNA (bukan service role) karena Supabase
// mengikat operasi MFA ke sesi yang sedang berjalan. Memakai service role akan
// mendaftarkan faktor ke akun lain tanpa sepengetahuannya.

import { createClient } from '@/lib/supabase/server'
import { getAuthContext } from '@/lib/auth-guard'

export interface EnrollResult {
  factorId?: string
  qr?: string
  secret?: string
  error?: string
}

/**
 * Mulai pendaftaran faktor baru. Mengembalikan QR (data URL) dan rahasia teks.
 *
 * Bila sudah ada faktor belum terverifikasi dengan nama sama, faktor itu
 * dibersihkan dulu — Supabase menolak nama ganda, dan pendaftaran yang gagal
 * di tengah jalan meninggalkan faktor "unverified" yang tidak bisa dipakai
 * tetapi menghalangi percobaan berikutnya.
 */
export async function beginEnroll(friendlyName = 'Aplikasi autentikator'): Promise<EnrollResult> {
  const ctx = await getAuthContext()
  if (!ctx) return { error: 'Masuk dulu.' }

  const supabase = createClient()

  const { data: existing } = await supabase.auth.mfa.listFactors()
  const stale = (existing?.all ?? []).filter(
    (f) => f.factor_type === 'totp' && f.status === 'unverified'
  )
  for (const f of stale) {
    await supabase.auth.mfa.unenroll({ factorId: f.id })
  }

  const { data, error } = await supabase.auth.mfa.enroll({
    factorType: 'totp',
    friendlyName: friendlyName.slice(0, 40),
  })

  if (error) return { error: error.message }
  return { factorId: data.id, qr: data.totp.qr_code, secret: data.totp.secret }
}

/** Selesaikan pendaftaran dengan kode 6 digit dari aplikasi autentikator. */
export async function confirmEnroll(factorId: string, code: string): Promise<{ error?: string }> {
  const ctx = await getAuthContext()
  if (!ctx) return { error: 'Masuk dulu.' }

  const digits = code.replace(/\D/g, '')
  if (digits.length !== 6) return { error: 'Kode terdiri dari 6 angka.' }

  const supabase = createClient()
  const { data: challenge, error: chErr } = await supabase.auth.mfa.challenge({ factorId })
  if (chErr) return { error: chErr.message }

  const { error } = await supabase.auth.mfa.verify({
    factorId,
    challengeId: challenge.id,
    code: digits,
  })
  if (error) return { error: 'Kode tidak cocok. Pastikan jam perangkat Anda benar, lalu coba lagi.' }

  return {}
}

/** Naikkan sesi ini ke aal2 memakai faktor yang sudah terdaftar. */
export async function verifySession(code: string): Promise<{ error?: string }> {
  const ctx = await getAuthContext()
  if (!ctx) return { error: 'Masuk dulu.' }

  const digits = code.replace(/\D/g, '')
  if (digits.length !== 6) return { error: 'Kode terdiri dari 6 angka.' }

  const supabase = createClient()
  const { data: factors, error: fErr } = await supabase.auth.mfa.listFactors()
  if (fErr) return { error: fErr.message }

  const verified = (factors?.totp ?? []).find((f) => f.status === 'verified')
  if (!verified) return { error: 'Belum ada faktor terverifikasi. Daftarkan dulu.' }

  const { data: challenge, error: chErr } = await supabase.auth.mfa.challenge({
    factorId: verified.id,
  })
  if (chErr) return { error: chErr.message }

  const { error } = await supabase.auth.mfa.verify({
    factorId: verified.id,
    challengeId: challenge.id,
    code: digits,
  })
  if (error) return { error: 'Kode tidak cocok. Coba lagi.' }

  return {}
}

/**
 * Hapus faktor. Ditolak bila kewajiban MFA sedang aktif dan ini faktor
 * terakhir — tanpa faktor, admin tidak bisa naik ke aal2 dan akan terkunci
 * dari panelnya sendiri pada login berikutnya.
 */
export async function removeFactor(factorId: string): Promise<{ error?: string }> {
  const ctx = await getAuthContext()
  if (!ctx) return { error: 'Masuk dulu.' }

  const supabase = createClient()
  const { data: factors } = await supabase.auth.mfa.listFactors()
  const verified = (factors?.totp ?? []).filter((f) => f.status === 'verified')

  const required = await import('@/lib/settings/get').then((m) =>
    m.getSetting('require_mfa_for_admins')
  )
  if (required === true && verified.length <= 1) {
    return {
      error:
        'Kewajiban verifikasi dua langkah sedang aktif. Daftarkan faktor pengganti sebelum menghapus yang terakhir.',
    }
  }

  const { error } = await supabase.auth.mfa.unenroll({ factorId })
  if (error) return { error: error.message }
  return {}
}
