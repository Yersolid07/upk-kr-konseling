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

  test('awalan 0 diubah jadi kode negara 62', () => {
    // Bug nyata: nomor diisi pengurus sebagai "0811 979 10000" dan tautannya
    // menjadi wa.me/081197910000 — WhatsApp menolaknya, karena wa.me mewajibkan
    // kode negara. Nomor lokal Indonesia harus diubah, bukan hanya dirapikan.
    assert.equal(normalizeWaNumber('0811 979 10000'), '6281197910000')
    assert.equal(normalizeWaNumber('081197910000'), '6281197910000')
  })

  test('0 setelah kode negara juga diratakan', () => {
    assert.equal(normalizeWaNumber('+62 0811 9791 0000'), '6281197910000')
    assert.equal(normalizeWaNumber('62081197910000'), '6281197910000')
  })

  test('menolak nomor non-Indonesia', () => {
    // wa.me memang menerima nomor negara lain, tetapi tombol ini khusus
    // konselor piket UPK-Kr. Nomor asing hampir pasti salah ketik.
    assert.equal(normalizeWaNumber('+1 415 555 0100'), null)
    assert.equal(normalizeWaNumber('6581234567'), null)
  })

  test('menolak nomor terlalu panjang', () => {
    assert.equal(normalizeWaNumber('62' + '9'.repeat(20)), null)
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
    assert.equal(normalizeWaNumber('0812345'), null)
  })

  test('menerima tepat di ambang minimum (62 + 8 digit)', () => {
    assert.equal(normalizeWaNumber('6212345678'), '6212345678')
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
