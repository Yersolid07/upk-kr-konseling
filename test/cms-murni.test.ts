// test/cms-murni.test.ts
// Uji bagian CMS yang murni: daftar tabel konten, alasan laporan, dan penyaring
// parameter query.
//
// Yang diuji di sini bukan "apakah fungsinya jalan" tetapi "apakah batasnya
// benar". tableLabel dan parseListParams adalah tempat masukan pengguna
// bertemu query database, jadi kesalahan di sini berarti pengguna bisa
// mengurutkan berdasarkan kolom sembarang atau membaca tabel yang tidak
// seharusnya.

import { test, describe } from 'node:test'
import assert from 'node:assert/strict'

import {
  CONTENT_TABLES,
  CONTENT_TABLE_NAMES,
  tableLabel,
  type ContentTable,
} from '../src/lib/cms/content-tables.ts'

import {
  REPORT_REASONS,
  REPORT_REASON_KEYS,
  reasonLabel,
} from '../src/lib/reports/reasons.ts'

import {
  parseListParams,
  safeSort,
  pageRange,
  pageCount,
  PAGE_SIZE_DEFAULT,
  PAGE_SIZE_MAX,
} from '../src/lib/cms/query.ts'

describe('tabel konten CMS', () => {
  test('setiap tabel punya label dan minimal satu path', () => {
    for (const [name, cfg] of Object.entries(CONTENT_TABLES)) {
      assert.ok(cfg.label.length > 0, `${name} tanpa label`)
      assert.ok(cfg.paths.length > 0, `${name} tanpa path`)
      for (const p of cfg.paths) {
        assert.match(p, /^\//, `${name}: path harus absolut (${p})`)
      }
    }
  })

  test('nama tabel = kunci objek (tidak ada duplikat senyap)', () => {
    assert.deepEqual([...CONTENT_TABLE_NAMES].sort(), Object.keys(CONTENT_TABLES).sort())
    assert.equal(new Set(CONTENT_TABLE_NAMES).size, CONTENT_TABLE_NAMES.length)
  })

  test('tableLabel mengembalikan label untuk tabel yang dikenal', () => {
    for (const name of CONTENT_TABLE_NAMES) {
      assert.equal(tableLabel(name), CONTENT_TABLES[name].label)
    }
  })

  test('tableLabel tidak melempar untuk nama asing', () => {
    // Nama tabel datang dari data lama atau dari URL; fungsi ini dipakai saat
    // merender riwayat audit. Melempar di sini akan mematikan seluruh halaman.
    assert.equal(tableLabel('tabel_yang_tidak_ada'), 'tabel_yang_tidak_ada')
    assert.equal(tableLabel(''), '')
  })

  test('tidak ada nama tabel yang bisa dipakai untuk injeksi PostgREST', () => {
    // PostgREST memakai koma dan titik sebagai pemisah di query string.
    for (const name of CONTENT_TABLE_NAMES) {
      assert.match(name, /^[a-z_]+$/, `nama tabel mencurigakan: ${name}`)
    }
  })
})

describe('alasan laporan', () => {
  test('kunci unik', () => {
    assert.equal(new Set(REPORT_REASON_KEYS).size, REPORT_REASON_KEYS.length)
  })

  test('REPORT_REASON_KEYS sinkron dengan REPORT_REASONS', () => {
    assert.deepEqual([...REPORT_REASON_KEYS], REPORT_REASONS.map((r) => r.key))
  })

  test('ada alasan bahaya-diri', () => {
    // Bukan sekadar daftar: alasan ini memicu jalur prioritas tinggi di antrean
    // moderasi. Hilangnya alasan ini berarti permohonan bantuan tenggelam di
    // antara spam dan iklan.
    assert.ok(REPORT_REASON_KEYS.includes('bahaya-diri'))
  })

  test('reasonLabel mengembalikan label, bukan kunci mentah', () => {
    for (const r of REPORT_REASONS) {
      assert.equal(reasonLabel(r.key), r.label)
      assert.notEqual(reasonLabel(r.key), r.key)
    }
  })

  test('reasonLabel tidak melempar untuk kunci asing', () => {
    assert.equal(reasonLabel('kunci-asing'), 'kunci-asing')
  })

  test('semua label berbahasa Indonesia dan tidak kosong', () => {
    for (const r of REPORT_REASONS) {
      assert.ok(r.label.trim().length >= 3, `${r.key} label terlalu pendek`)
    }
  })
})

describe('parseListParams', () => {
  const ALLOW = ['created_at', 'title']
  const opts = { sortable: ALLOW, defaultSort: 'created_at' }

  test('memakai nilai bawaan saat parameter kosong', () => {
    const p = parseListParams({}, opts)
    assert.equal(p.sort, 'created_at')
    assert.equal(p.dir, 'desc')
    assert.equal(p.page, 1)
  })

  test('menerima kolom urut yang diizinkan', () => {
    assert.equal(parseListParams({ sort: 'title' }, opts).sort, 'title')
  })

  test('MENOLAK kolom urut yang tidak diizinkan', () => {
    // Ini batas keamanannya: tanpa allowlist, `?sort=password_hash` menjadi
    // oracle untuk menebak isi kolom lewat urutan hasil.
    assert.equal(parseListParams({ sort: 'password_hash' }, opts).sort, 'created_at')
  })

  test('menolak arah urut selain asc/desc', () => {
    for (const bad of ['ASC', 'desc; drop table', '', 'naik']) {
      const p = parseListParams({ dir: bad }, opts)
      assert.ok(['asc', 'desc'].includes(p.dir), `dir bocor: ${bad}`)
    }
  })

  test('nomor halaman tidak pernah negatif atau nol', () => {
    for (const bad of ['0', '-5', 'abc', '1e999', '']) {
      const p = parseListParams({ page: bad }, opts)
      assert.ok(Number.isInteger(p.page) && p.page >= 1, `page bocor: ${bad} -> ${p.page}`)
    }
  })

  test('nomor halaman sangat besar tidak menghasilkan NaN', () => {
    const p = parseListParams({ page: '999999999999' }, opts)
    assert.ok(Number.isFinite(p.page) && p.page >= 1)
  })

  test('ukuran halaman dibatasi di antara 5 dan PAGE_SIZE_MAX', () => {
    assert.equal(parseListParams({ pageSize: '100000' }, opts).pageSize, PAGE_SIZE_MAX)
    assert.ok(parseListParams({ pageSize: '1' }, opts).pageSize >= 5)
    assert.equal(parseListParams({}, opts).pageSize, PAGE_SIZE_DEFAULT)
  })

  test('parameter berulang diambil yang pertama', () => {
    // Next.js memberi string[] untuk ?a=1&a=2. Memakai nilai apa pun dari array
    // secara buta membuka jalan untuk melewati allowlist.
    const p = parseListParams({ sort: ['title', 'password_hash'] }, opts)
    assert.equal(p.sort, 'title')
    const q = parseListParams({ sort: ['password_hash', 'title'] }, opts)
    assert.equal(q.sort, 'created_at', 'nilai pertama yang asing harus jatuh ke default')
  })

  test('pencarian dipotong 120 karakter', () => {
    // Tanpa batas, satu permintaan bisa memaksa PostgREST memindai tabel penuh
    // dengan pola LIKE yang sangat panjang.
    assert.equal(parseListParams({ q: 'x'.repeat(500) }, opts).q.length, 120)
  })

  test('scope dipotong 64 karakter', () => {
    assert.equal(parseListParams({ scope: 'y'.repeat(200) }, opts).scope.length, 64)
  })
})

describe('safeSort', () => {
  test('mengembalikan kolom yang diizinkan', () => {
    assert.equal(safeSort(['a', 'b'], 'b'), 'b')
  })

  test('jatuh ke kolom pertama untuk nilai asing', () => {
    assert.equal(safeSort(['a', 'b'], 'c'), 'a')
  })
})

describe('pageRange & pageCount', () => {
  test('pageRange inklusif dan tidak tumpang tindih', () => {
    const p1 = parseListParams({ page: '1', pageSize: '25' }, { sortable: ['created_at'] })
    const p2 = parseListParams({ page: '2', pageSize: '25' }, { sortable: ['created_at'] })
    const [f1, t1] = pageRange(p1)
    const [f2] = pageRange(p2)
    assert.equal(f1, 0)
    assert.equal(t1, 24)
    assert.equal(f2, 25)
  })

  test('pageCount minimal 1 untuk tabel kosong', () => {
    assert.equal(pageCount(0, 25), 1)
    assert.equal(pageCount(25, 25), 1)
    assert.equal(pageCount(26, 25), 2)
  })
})
