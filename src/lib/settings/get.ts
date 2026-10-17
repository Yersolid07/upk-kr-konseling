// src/lib/settings/get.ts
// Membaca pengaturan situs dengan nilai default yang aman.
//
// ATURAN
//   - Nilai dari database SELALU divalidasi terhadap skema registry. Nilai
//     yang tidak valid (atau belum ada) jatuh ke default — halaman tidak
//     pernah gagal hanya karena satu pengaturan salah ketik.
//   - Kegagalan database (tabel belum dimigrasi, jaringan) juga jatuh ke
//     default. Aplikasi harus tetap jalan sebelum migrasi dijalankan.
//   - Format penyimpanan: kolom JSONB `value` menyimpan objek { value: X }.
//     Toleransi juga membaca bentuk lama (nilai telanjang) supaya data yang
//     sudah ada tidak hilang.
//
// Versi server memakai cache Next.js bertag 'settings' supaya tidak menembak
// database di setiap render; setiap kali CMS menyimpan, tag itu di-revalidate.

import { cache } from 'react'
import { SETTINGS_BY_KEY, PUBLIC_SETTING_KEYS, coerceSetting, type SettingKey } from './registry'

// coerceSetting pindah ke registry.ts (murni, bisa diuji). Diekspor ulang di
// sini supaya pemanggil lama tidak perlu diubah.
export { coerceSetting }

// ─────────────────────────────────────────────────────────────
// Jalur server
// ─────────────────────────────────────────────────────────────

/**
 * Muat SEMUA pengaturan dari database. Dipakai jalur server saja.
 * Mengembalikan peta key -> nilai yang SUDAH divalidasi.
 */
export async function loadSettings(): Promise<Record<string, unknown>> {
  const out: Record<string, unknown> = {}
  for (const [key, def] of Object.entries(SETTINGS_BY_KEY)) out[key] = def.default

  try {
    // Impor dinamis: file ini juga dipakai jalur klien (PUBLIC_SETTING_KEYS),
    // dan modul server tidak boleh masuk bundle browser.
    const { createClient } = await import('@/lib/supabase/server')
    const supabase = createClient()
    const { data, error } = await supabase.from('site_settings').select('key, value')
    if (error) throw error

    for (const row of (data ?? []) as { key: string; value: unknown }[]) {
      if (!(row.key in SETTINGS_BY_KEY)) continue
      out[row.key] = coerceSetting(row.key, row.value)
    }
  } catch (err) {
    // Tabel belum ada / DB tidak terjangkau: pakai default. Jangan jatuhkan
    // seluruh halaman hanya karena pengaturan tidak terbaca.
    console.error('[settings] gagal memuat, memakai nilai default', err)
  }

  return out
}

/** Versi ter-cache per request (React `cache`) agar tidak query berkali-kali. */
export const getSettings = cache(loadSettings)

/** Ambil satu pengaturan dengan tipe yang benar. */
export async function getSetting<K extends SettingKey>(key: K): Promise<unknown> {
  const all = await getSettings()
  return all[key]
}

/** Ambil hanya pengaturan yang boleh dibaca tanpa login. */
export async function getPublicSettings(): Promise<Record<string, unknown>> {
  const all = await getSettings()
  const out: Record<string, unknown> = {}
  for (const key of PUBLIC_SETTING_KEYS) out[key] = all[key]
  return out
}

// ─────────────────────────────────────────────────────────────
// Jalur klien
// ─────────────────────────────────────────────────────────────

/**
 * Baca pengaturan PUBLIK dari klien (mis. halaman masuk). Hanya kunci yang
 * ditandai `public: true` yang boleh dibaca tanpa login — sisanya dilindungi
 * RLS dan memang tidak akan kembali.
 */
export async function fetchPublicSettings(): Promise<Record<string, unknown>> {
  const out: Record<string, unknown> = {}
  for (const key of PUBLIC_SETTING_KEYS) out[key] = SETTINGS_BY_KEY[key].default

  try {
    const { createClient } = await import('@/lib/supabase/client')
    const supabase = createClient()
    const { data } = await supabase
      .from('site_settings')
      .select('key, value')
      .in('key', PUBLIC_SETTING_KEYS)

    for (const row of (data ?? []) as { key: string; value: unknown }[]) {
      out[row.key] = coerceSetting(row.key, row.value)
    }
  } catch {
    // diamkan: nilai default sudah terisi
  }

  return out
}
