// test/settings.test.ts
// Uji validasi pengaturan situs.
//
// coerceSetting adalah satu-satunya pintu antara isi tabel site_settings dan
// perilaku aplikasi. Nilai yang lolos di sini menentukan apakah pendaftaran
// terbuka, apakah situs masuk mode pemeliharaan, dan apakah sebuah konten
// memicu jalur krisis. Kesalahan di sini tidak memunculkan error — ia diam-diam
// mengubah perilaku situs.

import { test, describe } from 'node:test'
import assert from 'node:assert/strict'

import {
  SETTINGS,
  SETTINGS_BY_KEY,
  PUBLIC_SETTING_KEYS,
  SETTING_GROUPS,
  coerceSetting,
} from '../src/lib/settings/registry.ts'

describe('registry pengaturan', () => {
  test('kunci unik', () => {
    const keys = SETTINGS.map((s) => s.key)
    assert.equal(new Set(keys).size, keys.length)
  })

  test('SETTINGS_BY_KEY memuat setiap entri', () => {
    assert.equal(Object.keys(SETTINGS_BY_KEY).length, SETTINGS.length)
    for (const s of SETTINGS) assert.equal(SETTINGS_BY_KEY[s.key], s)
  })

  test('setiap entri punya grup yang dikenal', () => {
    for (const s of SETTINGS) {
      assert.ok(s.group in SETTING_GROUPS, `${s.key}: grup asing ${s.group}`)
    }
  })

  test('setiap entri punya label', () => {
    for (const s of SETTINGS) assert.ok(s.label.trim().length > 0, `${s.key} tanpa label`)
  })

  test('nilai default lolos skemanya sendiri', () => {
    // Kalau default tidak valid, halaman jatuh ke default yang juga ditolak
    // skema — hasilnya perilaku tak terdefinisi.
    for (const s of SETTINGS) {
      const r = s.schema.safeParse(s.default)
      assert.ok(r.success, `${s.key}: default tidak valid — ${r.error?.message}`)
    }
  })

  test('tidak ada kunci rahasia yang boleh dibaca tanpa login', () => {
    const sensitif = [
      'require_mfa_for_admins',
      'session_timeout_minutes',
      'audit_retention_days',
      'auto_hide_report_threshold',
      'crisis_keywords',
      'trash_retention_days',
    ]
    for (const key of sensitif) {
      assert.equal(PUBLIC_SETTING_KEYS.includes(key), false, `${key} bocor ke publik`)
    }
  })

  test('PUBLIC_SETTING_KEYS sinkron dengan tanda public', () => {
    assert.deepEqual(
      [...PUBLIC_SETTING_KEYS].sort(),
      SETTINGS.filter((s) => s.public).map((s) => s.key).sort()
    )
  })
})

describe('coerceSetting — boolean', () => {
  test('menerima boolean asli', () => {
    assert.equal(coerceSetting('registration_open', true), true)
    assert.equal(coerceSetting('registration_open', false), false)
  })

  test('menerima bentuk terbungkus { value }', () => {
    assert.equal(coerceSetting('registration_open', { value: false }), false)
  })

  test('menerima string lama "on"/"off"/"true"/"false"', () => {
    // Inilah bug lamanya: "on" tersimpan sebagai string, lalu dibaca dengan
    // Boolean('') === false — toggle tampak tertutup padahal terbuka.
    assert.equal(coerceSetting('registration_open', 'on'), true)
    assert.equal(coerceSetting('registration_open', 'true'), true)
    assert.equal(coerceSetting('registration_open', 'off'), false)
    assert.equal(coerceSetting('registration_open', 'false'), false)
  })

  test('string kosong jatuh ke default, bukan false', () => {
    assert.equal(coerceSetting('registration_open', ''), true)
  })

  test('nilai sampah jatuh ke default', () => {
    assert.equal(coerceSetting('registration_open', 'mungkin'), true)
    assert.equal(coerceSetting('registration_open', 42), true)
    assert.equal(coerceSetting('registration_open', null), true)
  })
})

describe('coerceSetting — angka', () => {
  test('menerima angka dalam batas', () => {
    assert.equal(coerceSetting('auto_hide_report_threshold', 5), 5)
    assert.equal(coerceSetting('auto_hide_report_threshold', 0), 0)
  })

  test('menolak angka di luar batas', () => {
    // Di luar batas berarti admin salah ketik; memakai nilai itu bisa
    // menyembunyikan setiap konten baru seketika.
    assert.equal(coerceSetting('auto_hide_report_threshold', 999), 3)
    assert.equal(coerceSetting('auto_hide_report_threshold', -1), 3)
  })

  test('menolak pecahan', () => {
    assert.equal(coerceSetting('auto_hide_report_threshold', 2.5), 3)
  })

  test('menerima angka berbentuk string', () => {
    assert.equal(coerceSetting('auto_hide_report_threshold', '7'), 7)
  })

  test('menolak string yang bukan angka', () => {
    assert.equal(coerceSetting('auto_hide_report_threshold', 'tujuh'), 3)
  })
})

describe('coerceSetting — teks', () => {
  test('menerima teks biasa', () => {
    assert.equal(coerceSetting('site_name', 'IKA UPK-Kr FT UNSRAT'), 'IKA UPK-Kr FT UNSRAT')
  })

  test('menolak teks melebihi batas', () => {
    assert.equal(coerceSetting('site_name', 'x'.repeat(200)), 'IKA UPK-Kr FT UNSRAT')
  })

  test('crisis_keywords boleh kosong (mematikan deteksi)', () => {
    assert.equal(coerceSetting('crisis_keywords', ''), '')
  })
})

describe('coerceSetting — kunci asing', () => {
  test('mengembalikan undefined, bukan nilai mentah', () => {
    // Penting: mengembalikan nilai mentah berarti kunci apa pun yang ditulis
    // langsung ke tabel akan terbaca aplikasi tanpa validasi.
    assert.equal(coerceSetting('kunci_yang_tidak_terdaftar', 'apa saja'), undefined)
    assert.equal(coerceSetting('kunci_yang_tidak_terdaftar', { value: 'x' }), undefined)
  })
})
