// test/sos.test.ts
// Uji pembentukan tautan WhatsApp.
//
// Ini bukan util kosmetik: tautan ini muncul di tombol SOS — jalur bantuan
// darurat. Tautan yang salah berarti orang yang sedang krisis menekan tombol
// dan mendarat di halaman error WhatsApp. Kesalahan sebelumnya persis itu:
// https://wa.me/undefined.

import { test, describe } from 'node:test'
import assert from 'node:assert/strict'

import { normalizeWaNumber, waLink } from '../src/lib/sos.ts'

describe('normalizeWaNumber', () => {
  test('menerima nomor internasional polos', () => {
    assert.equal(normalizeWaNumber('6281197910000'), '6281197910000')
  })

  test('membuang +, spasi, dan tanda hubung', () => {
    assert.equal(normalizeWaNumber('+62 811-9791-0000'), '6281197910000')
  })

  test('membuang titik dan kurung', () => {
    assert.equal(normalizeWaNumber('(0431) 838203'), '0431838203')
  })

  test('menolak kosong dan null', () => {
    assert.equal(normalizeWaNumber(''), null)
    assert.equal(normalizeWaNumber(null), null)
    assert.equal(normalizeWaNumber(undefined), null)
  })

  test('menolak placeholder yang tidak berisi angka cukup', () => {
    // Inilah nilai yang dulu tampil ke publik di /contact.
    assert.equal(normalizeWaNumber('628xxxxxxxxxxxx'), null)
  })

  test('menolak nomor terlalu pendek', () => {
    assert.equal(normalizeWaNumber('119'), null)
    assert.equal(normalizeWaNumber('1234567'), null)
  })

  test('menerima tepat di ambang minimum', () => {
    assert.equal(normalizeWaNumber('12345678'), '12345678')
  })

  test('menolak teks tanpa angka', () => {
    assert.equal(normalizeWaNumber('belum diatur'), null)
  })
})

describe('waLink', () => {
  test('menghasilkan tautan wa.me', () => {
    assert.equal(waLink('6281197910000'), 'https://wa.me/6281197910000')
  })

  test('mengembalikan null, BUKAN "https://wa.me/undefined"', () => {
    // Regresi langsung: tombol SOS dulu memakai template string dengan env
    // yang tidak disetel, menghasilkan wa.me/undefined.
    assert.equal(waLink(null), null)
    assert.equal(waLink(undefined), null)
    assert.equal(waLink(''), null)
    assert.equal(waLink('628xxxxxxxxxxxx'), null)
  })

  test('tidak pernah menghasilkan string berisi "undefined"', () => {
    for (const v of [null, undefined, '', 'x', '628xxxxxxxxxxxx']) {
      const link = waLink(v)
      assert.ok(link === null || !link.includes('undefined'), String(link))
    }
  })

  test('menyertakan teks yang di-encode', () => {
    const link = waLink('6281197910000', 'Butuh bantuan & dukungan')
    assert.equal(link, 'https://wa.me/6281197910000?text=Butuh%20bantuan%20%26%20dukungan')
  })

  test('tanpa teks tidak menambah tanda tanya', () => {
    assert.equal(waLink('6281197910000')?.includes('?'), false)
  })
})
