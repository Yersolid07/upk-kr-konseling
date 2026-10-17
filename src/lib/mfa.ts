// src/lib/mfa.ts
// Penegakan verifikasi dua langkah (TOTP) untuk peran administratif.
//
// MASALAH YANG DIPERBAIKI
// Pengaturan `require_mfa_for_admins` sudah ada di registry sejak Fase 2, bisa
// diubah lewat panel, dan TIDAK PERNAH DIBACA oleh kode mana pun. Toggle itu
// tampak berfungsi dan tidak melakukan apa-apa — admin mengira dirinya terlindungi
// padahal tidak. Berkas ini yang membaca dan menegakkannya.
//
// CARA KERJA
// Supabase menandai sesi dengan Assurance Level:
//   aal1 — masuk dengan kata sandi saja
//   aal2 — kata sandi + kode TOTP yang diverifikasi pada sesi itu
//
// `currentLevel` dibaca dari klaim `aal` pada token sesi: 'aal1' berarti sesi
// ini hanya melewati kata sandi.
//
// SENGAJA TIDAK memakai `nextLevel`. Nilai itu dihitung dari daftar faktor
// yang tertanam di token saat masuk; token tidak diperbarui ketika faktor
// didaftarkan, sehingga admin yang SUDAH punya faktor tetap diminta mendaftar
// ulang — dan pendaftaran kedua gagal karena namanya bentrok. Keberadaan
// faktor dibaca langsung dari listFactors(), yang selalu segar.
//
// Admin tanpa faktor TIDAK dikunci di luar panel: ia harus tetap bisa masuk
// untuk MENDAFTARKAN faktor. Karena itu hasilnya 'enroll', dan pemanggil
// mengarahkan ke halaman keamanan, bukan menolak akses.

import { createClient } from '@/lib/supabase/server'
import { hasMinRole } from '@/lib/rbac'
import type { UserRole } from '@/types/database'
import { getSetting } from '@/lib/settings/get'

export type MfaState =
  /** Tidak wajib, atau sudah terpenuhi. */
  | 'ok'
  /** Wajib, faktor sudah ada, tetapi sesi ini belum naik ke aal2. */
  | 'verify'
  /** Wajib, tetapi akun belum punya faktor TOTP sama sekali. */
  | 'enroll'

/**
 * Apakah peran ini terkena kewajiban MFA, dan bila ya, apa langkah berikutnya.
 *
 * Sengaja mengembalikan keadaan, bukan boolean: pemanggil perlu membedakan
 * "belum mendaftarkan faktor" dari "sudah mendaftar tapi belum memverifikasi".
 * Keduanya butuh halaman yang sama, tetapi pesannya berbeda.
 */
export async function mfaState(role: UserRole): Promise<MfaState> {
  // Hanya peran administratif. Konselor dan anggota tidak terkena — memaksa
  // MFA pada seluruh anggota akan menurunkan jumlah yang mau mendaftar, dan
  // mereka tidak punya akses ke data orang lain.
  if (!hasMinRole(role, 'admin')) return 'ok'

  const required = await getSetting('require_mfa_for_admins')
  if (required !== true) return 'ok'

  const supabase = createClient()
  const [{ data, error }, { data: factorData, error: factorErr }] = await Promise.all([
    supabase.auth.mfa.getAuthenticatorAssuranceLevel(),
    supabase.auth.mfa.listFactors(),
  ])

  // Gagal membaca level (mis. endpoint Supabase tidak menjawab) TIDAK boleh
  // mengunci admin di luar panelnya sendiri. Kegagalan di sini berarti fitur
  // keamanan tidak tersedia, bukan bahwa pengguna berbahaya.
  if (error || !data) {
    console.error('[mfa] gagal membaca assurance level', error?.message)
    return 'ok'
  }

  if (data.currentLevel === 'aal2') return 'ok'

  // Faktor yang benar-benar terverifikasi — bukan yang masih menggantung dari
  // pendaftaran yang gagal di tengah jalan.
  const punyaFaktor = !factorErr && (factorData?.totp ?? []).some((f) => f.status === 'verified')
  return punyaFaktor ? 'verify' : 'enroll'
}

/** Daftar faktor TOTP milik pengguna yang sedang masuk. */
export async function listTotpFactors() {
  const supabase = createClient()
  const { data, error } = await supabase.auth.mfa.listFactors()
  if (error) return { factors: [], error: error.message }

  const totp = (data?.totp ?? []).map((f) => ({
    id: f.id,
    friendlyName: f.friendly_name ?? null,
    status: f.status,
    createdAt: f.created_at,
  }))
  return { factors: totp, error: null }
}
