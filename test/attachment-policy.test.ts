// test/attachment-policy.test.ts
// Uji validasi lampiran — ini kontrol keamanan nyata di server, bukan umpan
// balik UI. Setiap kasus di bawah adalah bentuk serangan yang harus ditolak.

import { test, describe } from 'node:test'
import assert from 'node:assert/strict'

import {
  validateAttachment,
  isAllowedEmbedUrl,
  isSafeAssetUrl,
  ALLOWED_EMBED_HOSTS,
  MAX_TITLE_LEN,
} from '../src/lib/attachment-policy.ts'

const OK_EMBED = 'https://www.youtube.com/embed/abc123'

// Host storage harus SAMA dengan project aplikasi ini. Nilainya dibaca dari
// env yang sama dengan yang dipakai kode, supaya test tidak lulus karena
// kebetulan memakai nama project yang salah.
const PROJECT_HOST = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname
  : 'project-uji.supabase.co'
const OK_IMAGE = `https://${PROJECT_HOST}/storage/v1/object/public/media/foto.jpg`

describe('skema URL', () => {
  test('menolak javascript:', () => {
    assert.ok(validateAttachment({ kind: 'link', url: 'javascript:alert(1)' }))
  })

  test('menolak data:', () => {
    assert.ok(validateAttachment({ kind: 'link', url: 'data:text/html,<script>alert(1)</script>' }))
  })

  test('menolak vbscript:', () => {
    assert.ok(validateAttachment({ kind: 'link', url: 'vbscript:msgbox(1)' }))
  })

  test('menolak http: polos', () => {
    assert.ok(validateAttachment({ kind: 'link', url: 'http://healing119.id/' }))
  })

  test('menolak URL rusak', () => {
    assert.ok(validateAttachment({ kind: 'link', url: 'bukan url' }))
  })
})

describe('embed', () => {
  test('menerima host yang diizinkan', () => {
    assert.equal(validateAttachment({ kind: 'embed', url: OK_EMBED }), null)
  })

  test('menolak host asing', () => {
    const err = validateAttachment({ kind: 'embed', url: 'https://situs-jahat.example/x' })
    assert.ok(err)
    assert.match(err, /tidak diizinkan/)
  })

  test('menolak host yang mirip tapi bukan (youtube.com.evil.tld)', () => {
    assert.ok(validateAttachment({ kind: 'embed', url: 'https://youtube.com.evil.tld/x' }))
  })

  test('isAllowedEmbedUrl menolak skema selain https', () => {
    assert.equal(isAllowedEmbedUrl('http://www.youtube.com/embed/x'), false)
    assert.equal(isAllowedEmbedUrl('javascript:alert(1)'), false)
    assert.equal(isAllowedEmbedUrl('bukan url'), false)
  })

  test('isAllowedEmbedUrl menerima host resmi', () => {
    for (const h of ALLOWED_EMBED_HOSTS) {
      assert.equal(isAllowedEmbedUrl(`https://${h}/x`), true, h)
    }
  })
})

describe('berkas unggahan', () => {
  test('menerima berkas dari storage sendiri', () => {
    assert.equal(validateAttachment({ kind: 'image', url: OK_IMAGE }), null)
  })

  test('menolak gambar dari host luar', () => {
    const err = validateAttachment({ kind: 'image', url: 'https://situs-lain.example/a.jpg' })
    assert.ok(err)
    assert.match(err, /diunggah lewat aplikasi/)
  })

  test('menolak storage milik project Supabase lain', () => {
    // Inilah celah yang ditemukan test ini: pemeriksaan lama hanya
    // `endsWith('.supabase.co')`, sehingga project milik siapa pun diterima.
    assert.ok(
      validateAttachment({
        kind: 'image',
        url: 'https://project-lain-yang-bukan-kita.supabase.co/storage/v1/object/public/media/a.jpg',
      })
    )
  })

  test('menolak path storage yang bukan bucket media', () => {
    assert.ok(
      validateAttachment({
        kind: 'image',
        url: `https://${PROJECT_HOST}/storage/v1/object/public/privat/a.jpg`,
      })
    )
  })
})

describe('judul', () => {
  test('menolak judul kepanjangan', () => {
    const err = validateAttachment({
      kind: 'link',
      url: 'https://healing119.id/',
      title: 'x'.repeat(MAX_TITLE_LEN + 1),
    })
    assert.ok(err)
    assert.match(err, /maksimal/)
  })

  test('menerima judul tepat di batas', () => {
    assert.equal(
      validateAttachment({
        kind: 'link',
        url: 'https://healing119.id/',
        title: 'x'.repeat(MAX_TITLE_LEN),
      }),
      null
    )
  })
})

describe('jenis tidak dikenal', () => {
  test('ditolak, bukan diloloskan', () => {
    // Jenis asing harus gagal TERTUTUP. Kalau default-nya `return null`,
    // penambahan jenis baru di masa depan otomatis membuka lubang.
    const err = validateAttachment({ kind: 'iframe' as never, url: 'https://www.youtube.com/embed/x' })
    assert.ok(err)
    assert.match(err, /tidak dikenal/)
  })
})

describe('isSafeAssetUrl', () => {
  test('hanya https', () => {
    assert.equal(isSafeAssetUrl('https://a.example/x'), true)
    assert.equal(isSafeAssetUrl('http://a.example/x'), false)
    assert.equal(isSafeAssetUrl('javascript:alert(1)'), false)
    assert.equal(isSafeAssetUrl('bukan url'), false)
  })
})
