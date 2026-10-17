// test/app-url.test.ts
// Uji penurunan alamat publik dari header permintaan.
//
// Ini bukan detail kosmetik: alamat ini masuk ke tautan verifikasi email dan
// reset kata sandi. Alamat yang salah berarti pendaftaran berhasil tetapi akun
// tidak pernah bisa diaktifkan — tanpa satu pun error di log, karena string-nya
// tetap sah secara sintaksis.

import { test, describe } from 'node:test'
import assert from 'node:assert/strict'

import { appUrlFrom } from '../src/lib/app-url.ts'

const req = (url: string, headers: Record<string, string> = {}) =>
  new Request(url, { headers })

describe('appUrlFrom', () => {
  test('memakai x-forwarded-host dan x-forwarded-proto (Vercel)', () => {
    assert.equal(
      appUrlFrom(
        req('http://internal:3000/auth/callback', {
          'x-forwarded-host': 'upk-kr-konseling.vercel.app',
          'x-forwarded-proto': 'https',
        })
      ),
      'https://upk-kr-konseling.vercel.app'
    )
  })

  test('jatuh ke host biasa bila header proxy tidak ada', () => {
    assert.equal(
      appUrlFrom(req('http://localhost:3000/auth/callback', { host: 'localhost:3000' })),
      'http://localhost:3000'
    )
  })

  test('host non-localhost dianggap https', () => {
    assert.equal(
      appUrlFrom(req('http://x/y', { host: 'contoh.id' })),
      'https://contoh.id'
    )
  })

  test('tanpa header host sama sekali memakai origin permintaan', () => {
    assert.equal(
      appUrlFrom(req('https://contoh.id/auth/callback')),
      'https://contoh.id'
    )
  })

  test('tidak pernah menghasilkan alamat berakhiran garis miring', () => {
    const u = appUrlFrom(
      req('http://x/y', { 'x-forwarded-host': 'contoh.id/', 'x-forwarded-proto': 'https' })
    )
    assert.equal(u.endsWith('/'), false, u)
  })

  test('x-forwarded-host didahulukan dari host', () => {
    // Vercel menulis host internal di `host` dan domain publik di
    // `x-forwarded-host`. Memakai yang salah menghasilkan tautan yang tidak
    // bisa dibuka pengguna.
    assert.equal(
      appUrlFrom(
        req('http://x/y', {
          host: 'internal-abc.vercel.internal',
          'x-forwarded-host': 'upk-kr-konseling.vercel.app',
          'x-forwarded-proto': 'https',
        })
      ),
      'https://upk-kr-konseling.vercel.app'
    )
  })
})
