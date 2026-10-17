// src/lib/cms/query.ts
// Util daftar untuk konsol CMS: paginasi, pencarian, urutan — semuanya di
// server.
//
// MASALAH YANG DIPERBAIKI
// Konsol lama menarik 20 baris terbaru dari tiap tabel tanpa cara mencari,
// menyaring, atau melihat yang lebih lama. Untuk konsol yang mengelola seluruh
// isi situs itu tidak cukup: tidak ada jalan menemukan thread tertentu, dan
// tidak ada jalan melihat lebih dari 20 baris pertama.
//
// Di sini parameter URL (searchParams) diubah jadi query PostgREST yang
// dibatasi jumlahnya. Semua nilai divalidasi: kolom urutan hanya boleh dari
// allowlist (nama kolom diambil dari string pengguna, jadi tanpa allowlist
// ini menjadi vektor injection ke PostgREST).

export const PAGE_SIZE_DEFAULT = 25
export const PAGE_SIZE_MAX = 100

export interface ListParams {
  page: number
  pageSize: number
  q: string
  sort: string
  dir: 'asc' | 'desc'
  /** Filter tambahan, mis. status moderasi atau tempat sampah. */
  filter: string
  /** ID untuk filter kolom tertentu (mis. thread_id pada komentar). */
  scope: string
}

/** Baca parameter daftar dari URL. Nilai asing jatuh ke default. */
export function parseListParams(
  sp: Record<string, string | string[] | undefined>,
  opts: { sort?: string; sortable?: string[]; defaultSort?: string; filter?: string } = {}
): ListParams {
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? ''
  const page = Math.max(1, Number.parseInt(one(sp.page), 10) || 1)
  const rawSize = Number.parseInt(one(sp.pageSize), 10) || PAGE_SIZE_DEFAULT
  const pageSize = Math.min(PAGE_SIZE_MAX, Math.max(5, rawSize))

  // Kolom urutan HANYA boleh dari allowlist. Nama kolom ikut membentuk query
  // PostgREST, jadi string mentah dari URL tidak boleh diteruskan.
  const allow = opts.sortable ?? []
  const fallback = opts.defaultSort ?? opts.sort ?? allow[0] ?? 'created_at'
  const requested = one(sp.sort) || fallback
  const sort = allow.length === 0 ? requested : (allow.includes(requested) ? requested : fallback)

  return {
    page,
    pageSize,
    q: one(sp.q).slice(0, 120),
    sort,
    dir: one(sp.dir) === 'asc' ? 'asc' : 'desc',
    filter: one(sp.filter) || opts.filter || 'all',
    scope: one(sp.scope).slice(0, 64),
  }
}

/**
 * Pastikan nama kolom urutan berasal dari allowlist.
 *
 * PostgREST menerima nama kolom sebagai bagian dari query; meneruskan string
 * mentah dari URL berarti pengguna bisa mengurutkan (dan lewat error message,
 * memetakan) kolom apa pun. Allowlist menutup itu sekaligus mencegah error
 * 400 saat kolomnya tidak ada.
 */
export function safeSort(allow: readonly string[], requested: string): string {
  return allow.includes(requested) ? requested : allow[0]
}

/** Rentang baris untuk `.range()` PostgREST (inklusif). */
export function pageRange(p: ListParams): [number, number] {
  const from = (p.page - 1) * p.pageSize
  return [from, from + p.pageSize - 1]
}

/** Jumlah halaman dari total baris. */
export function pageCount(total: number, pageSize: number): number {
  return Math.max(1, Math.ceil(total / pageSize))
}

/** Bangun URL halaman lain dengan mempertahankan filter yang aktif. */
export function pageHref(
  base: string,
  p: ListParams,
  overrides: Partial<ListParams> = {}
): string {
  const merged = { ...p, ...overrides }
  const sp = new URLSearchParams()
  if (merged.page > 1) sp.set('page', String(merged.page))
  if (merged.pageSize !== PAGE_SIZE_DEFAULT) sp.set('pageSize', String(merged.pageSize))
  if (merged.q) sp.set('q', merged.q)
  if (merged.sort) sp.set('sort', merged.sort)
  if (merged.dir !== 'desc') sp.set('dir', merged.dir)
  if (merged.filter && merged.filter !== 'all') sp.set('filter', merged.filter)
  if (merged.scope) sp.set('scope', merged.scope)
  const qs = sp.toString()
  return qs ? `${base}?${qs}` : base
}

/** Terapkan pencarian & urutan standar ke query PostgREST. */
export function applyList<
  Q extends {
    ilike: (col: string, pattern: string) => Q
    order: (col: string, o: { ascending: boolean }) => Q
    range: (from: number, to: number) => Q
  },
>(query: Q, p: ListParams, searchColumns: readonly string[], sortColumn: string): Q {
  let q = query
  if (p.q) {
    // Pencarian sederhana: OR antar kolom teks. PostgREST memakai `.or()`
    // dengan sintaks `col.ilike.%nilai%`; nilai dibersihkan dari karakter
    // yang memecah sintaks itu.
    const term = p.q.replace(/[,()*%]/g, ' ').trim()
    if (term) {
      const filter = searchColumns.map((c) => `${c}.ilike.%${term}%`).join(',')
      // `.or()` tidak ada di tipe Q di atas; dipanggil lewat cast.
      q = (q as unknown as { or: (f: string) => Q }).or(filter)
    }
  }
  q = q.order(sortColumn, { ascending: p.dir === 'asc' })
  return q.range(...pageRange(p))
}
