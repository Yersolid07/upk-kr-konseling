// test/auth-email.test.ts
//
// Dua hal di sini pernah rusak dan tidak terdeteksi:
//   1. Template email memakai {{ .ConfirmationURL }}, yang bergantung pada
//      `site_url` Supabase — dan `site_url` proyek ini masih localhost.
//   2. Rute /auth/confirm menerima `next` mentah, artinya tautan bisa dipakai
//      untuk melempar pengguna ke situs lain setelah login.
//
// Uji ini mengunci keduanya.

import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const ROOT = path.resolve(import.meta.dirname, '..')
const TEMPLATES = path.join(ROOT, 'supabase', 'email-templates')
const CONFIRM_ROUTE = path.join(ROOT, 'src', 'app', 'auth', 'confirm', 'route.ts')

const EXPECTED: Record<string, string> = {
  'confirm-signup.html': 'signup',
  'reset-password.html': 'recovery',
  'change-email.html': 'email_change',
  'magic-link.html': 'magiclink',
}

test('setiap template ada dan memakai token_hash, bukan ConfirmationURL', () => {
  for (const file of Object.keys(EXPECTED)) {
    const full = path.join(TEMPLATES, file)
    assert.ok(fs.existsSync(full), `${file} tidak ditemukan`)
    const body = fs.readFileSync(full, 'utf8')

    assert.ok(
      body.includes('{{ .TokenHash }}'),
      `${file}: tidak memakai {{ .TokenHash }}`
    )
    assert.ok(
      !body.includes('{{ .ConfirmationURL }}'),
      `${file}: masih memakai {{ .ConfirmationURL }} — tautan akan mendarat di site_url Supabase`
    )
    assert.ok(
      body.includes('/auth/confirm?token_hash='),
      `${file}: tidak menunjuk ke /auth/confirm`
    )
  }
})

test('setiap template memakai tipe OTP yang diterima Supabase', () => {
  for (const [file, expectedType] of Object.entries(EXPECTED)) {
    const body = fs.readFileSync(path.join(TEMPLATES, file), 'utf8')
    const types = (body.match(/&type=([a-z_]+)/g) ?? []).map((m) => m.replace('&type=', ''))
    assert.ok(types.length > 0, `${file}: tidak ada parameter type`)
    for (const t of types) {
      assert.equal(t, expectedType, `${file}: type ${t} tidak sesuai`)
    }
  }
})

test('template memakai logo absolut, bukan path relatif', () => {
  for (const file of Object.keys(EXPECTED)) {
    const body = fs.readFileSync(path.join(TEMPLATES, file), 'utf8')
    const imgs = (body.match(/<img[^>]+src="[^"]+"/g) ?? []).map((m) => m.replace(/^.*src="/, '').replace(/"$/, ''))
    assert.ok(imgs.length > 0, `${file}: tidak ada logo`)
    for (const src of imgs) {
      assert.match(src, /^https:\/\//, `${file}: src "${src}" bukan URL absolut`)
    }
  }
})

test('template tidak membocorkan komentar operator ke dalam email', () => {
  for (const file of Object.keys(EXPECTED)) {
    const body = fs.readFileSync(path.join(TEMPLATES, file), 'utf8')
    // Subjek ditulis di komentar kepala berkas; skrip pemasang membuangnya.
    // Yang diuji di sini: komentar hanya boleh ada di awal berkas.
    const afterComment = body.replace(/^<!--[\s\S]*?-->/, '')
    assert.ok(
      !afterComment.includes('SUBJEK:'),
      `${file}: komentar petunjuk bocor ke isi email`
    )
  }
})

test('/auth/confirm menolak tujuan eksternal (open redirect)', () => {
  const src = fs.readFileSync(CONFIRM_ROUTE, 'utf8')

  assert.ok(src.includes('startsWith(\'/\')'), 'tidak memeriksa awalan "/"')
  assert.ok(src.includes("startsWith('//')"), 'tidak memblokir "//" (protokol-relatif)')
  assert.ok(
    src.includes('safeNext'),
    'tidak ada penyaring tujuan — `next` dipakai mentah'
  )
})

test('/auth/confirm hanya menerima tipe OTP yang dikenal', () => {
  const src = fs.readFileSync(CONFIRM_ROUTE, 'utf8')
  for (const t of ['signup', 'recovery', 'email_change', 'magiclink', 'invite', 'email']) {
    assert.ok(src.includes(`'${t}'`), `tipe ${t} tidak ada di daftar izin`)
  }
  assert.ok(
    src.includes('ALLOWED_TYPES.includes(type)'),
    'daftar izin tidak benar-benar dipakai'
  )
})

test('/auth/confirm tidak bergantung pada site_url Supabase', () => {
  const raw = fs.readFileSync(CONFIRM_ROUTE, 'utf8')
  // Buang komentar dulu: berkas ini MENJELASKAN site_url, dan penjelasan itu
  // bukan pelanggaran. Yang diuji adalah kode yang benar-benar berjalan.
  const src = raw
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n')
    .map((line) => line.replace(/\/\/.*$/, ''))
    .join('\n')

  // Tujuan dibangun dari `origin` permintaan, bukan dari env atau site_url.
  assert.ok(src.includes('origin'), 'tidak memakai origin permintaan')
  assert.ok(
    !src.includes('site_url'),
    'kode memakai site_url — itulah yang menyebabkan tautan ke localhost'
  )
})

test('template reset menuju halaman reset, bukan dashboard', () => {
  const body = fs.readFileSync(path.join(TEMPLATES, 'reset-password.html'), 'utf8')
  assert.ok(
    !body.includes('next=/dashboard'),
    'reset password mengarah ke dashboard — sesi pemulihan belum tentu berlaku'
  )
})
