// test/public-settings.test.ts
// Daftar kunci publik ada di DUA tempat: registry TypeScript (dipakai kode) dan
// policy RLS di supabase/public-settings-read.sql (dipakai database).
//
// Kalau keduanya melenceng, hasilnya tidak terlihat seperti bug:
//   * kunci ada di registry tapi tidak di policy -> halaman publik diam-diam
//     memakai nilai default, tanpa error
//   * kunci ada di policy tapi tidak di registry -> data bocor ke pengunjung
//
// Uji ini membandingkan keduanya langsung dari berkas SQL, sehingga
// ketidakcocokan gagal di CI, bukan di produksi.

import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

import { PUBLIC_SETTING_KEYS } from '../src/lib/settings/registry.ts'

const here = dirname(fileURLToPath(import.meta.url))
const SQL_PATH = join(here, '..', 'supabase', 'public-settings-read.sql')

/** Ambil daftar kunci dari blok `key IN ( ... )` di policy. */
function keysFromPolicy(): string[] {
  const sql = readFileSync(SQL_PATH, 'utf8')
  const m = sql.match(/key IN \(([\s\S]*?)\)\s*\);/)
  if (!m) throw new Error('blok "key IN (...)" tidak ditemukan di ' + SQL_PATH)
  return Array.from(m[1].matchAll(/'([^']+)'/g), (x) => x[1])
}

describe('kunci pengaturan publik', () => {
  test('policy SQL memuat SEMUA kunci publik dari registry', () => {
    const inPolicy = new Set(keysFromPolicy())
    const missing = PUBLIC_SETTING_KEYS.filter((k) => !inPolicy.has(k))
    assert.deepEqual(
      missing,
      [],
      `kunci ini publik di registry tapi tidak dibuka di policy: ${missing.join(', ')}`
    )
  })

  test('policy SQL TIDAK membuka kunci yang tidak publik', () => {
    const inPolicy = keysFromPolicy()
    const publicSet = new Set(PUBLIC_SETTING_KEYS)
    const leaked = inPolicy.filter((k) => !publicSet.has(k))
    assert.deepEqual(
      leaked,
      [],
      `kunci ini dibuka di policy tapi tidak ditandai publik di registry: ${leaked.join(', ')}`
    )
  })

  test('tidak ada kunci rahasia yang bocor ke policy', () => {
    const inPolicy = new Set(keysFromPolicy())
    const rahasia = [
      'fonnte_token',
      'crisis_keywords',
      'auto_hide_report_threshold',
      'audit_retention_days',
      'trash_retention_days',
      'require_mfa_for_admins',
      'session_timeout_minutes',
    ]
    for (const k of rahasia) {
      assert.equal(inPolicy.has(k), false, `${k} TIDAK boleh dibaca pengunjung anonim`)
    }
  })

  test('daftar di policy tidak kosong', () => {
    assert.ok(keysFromPolicy().length >= 5)
  })
})
