// src/lib/public-content.ts
// Akses konten publik lewat VIEW yang menyembunyikan identitas penulis anonim.
//
// MASALAH YANG DIPERBAIKI
// Sebelumnya halaman forum, detail thread, komentar, dan prayer wall memilih
// `author:profiles(id, full_name, anon_token)` untuk SEMUA baris — termasuk
// yang is_anonymous = true. Data itu ikut terkirim ke browser, jadi siapa pun
// yang membuka DevTools bisa memetakan "Anonim#A3F9" ke nama aslinya. Itu
// melanggar janji di Syarat & Ketentuan dan Kebijakan Privasi.
//
// SOLUSINYA
// View `threads_public` / `comments_public` / `prayers_public` (dibuat di
// supabase/phase1-data-security.sql) mengembalikan:
//   - author_id    : NULL untuk konten anonim
//   - anon_label   : pseudonim PER-KONTEN (beda tiap konten, jadi satu orang
//                    tidak bisa dikorelasikan antar-thread)
//   - author_name / author_avatar / author_role : NULL untuk konten anonim
//
// FALLBACK
// Kode ini dipakai di produksi SEBELUM migrasi dijalankan, jadi ia harus
// tidak meledak saat view belum ada. Setiap fungsi mencoba view dulu; kalau
// view belum ada (PGRST205 / 42P01) ia jatuh ke tabel biasa dan menghitung
// label anonim dari `anon_token` seperti perilaku lama. Setelah migrasi
// dijalankan, jalur aman otomatis terpakai.
//
// CATATAN: fallback ini SEMENTARA. Setelah migrasi terverifikasi, jalur
// fallback bisa dihapus supaya tidak ada jalan membaca anon_token lagi.

import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

type Db = SupabaseClient<Database>

/** Satu penulis yang sudah dinormalisasi untuk tampilan. */
export interface PublicAuthor {
  /** Nama yang boleh ditampilkan. Untuk anonim: "Anonim#XXXX". */
  label: string
  avatarUrl: string | null
  role: string | null
  isAnonymous: boolean
}

/** Apakah error berarti "view belum ada"? */
function isMissingView(error: unknown): boolean {
  if (!error) return false
  const e = error as { code?: string; message?: string }
  // PGRST205 = PostgREST tidak menemukan relasi; 42P01 = undefined_table.
  return (
    e.code === 'PGRST205' ||
    e.code === '42P01' ||
    (typeof e.message === 'string' &&
      (e.message.includes('does not exist') || e.message.includes('schema cache')))
  )
}

/** Label anonim pengganti saat view belum terpasang (lihat catatan di bawah). */
const FALLBACK_ANON_LABEL = 'Anonim'

/** Ambil 4 huruf pertama token sebagai label anonim (jalur fallback lama). */
function legacyAnonLabel(token?: string | null): string {
  return token ? `Anonim#${token.slice(0, 4).toUpperCase()}` : FALLBACK_ANON_LABEL
}

// ─────────────────────────────────────────────────────────────
// FORUM — daftar thread
// ─────────────────────────────────────────────────────────────

export interface PublicThread {
  id: string
  title: string
  content: string
  is_anonymous: boolean
  is_pinned: boolean
  is_locked: boolean
  view_count: number
  comment_count: number
  created_at: string
  category_id: string | null
  author: PublicAuthor
  category?: { name: string; slug: string; icon: string; color: string } | null
}

export async function listThreads(
  supabase: Db,
  opts: { category?: string; q?: string; sort?: string; limit?: number } = {}
): Promise<PublicThread[]> {
  const limit = opts.limit ?? 20

  // ── Jalur aman: view ──
  let q = supabase
    .from('threads_public')
    .select(
      `id, title, content, is_anonymous, is_pinned, is_locked, view_count, comment_count,
       created_at, category_id, author_id, anon_label, author_name, author_avatar, author_role,
       category:thread_categories(name, slug, icon, color)`
    )
    .eq('is_flagged', false)

  // Filter kategori: PostgREST hanya menyaring data tertanam tanpa `!inner`,
  // jadi kita filter lewat category_id hasil lookup slug (perilaku lama
  // `.eq('category.slug', ...)` memang tidak menyaring thread-nya).
  if (opts.category) {
    const { data: cat } = await supabase
      .from('thread_categories')
      .select('id')
      .eq('slug', opts.category)
      .maybeSingle()
    if (cat?.id) q = q.eq('category_id', cat.id)
    else return []
  }

  if (opts.q) q = q.ilike('title', `%${opts.q}%`)
  q = opts.sort === 'popular'
    ? q.order('view_count', { ascending: false })
    : q.order('created_at', { ascending: false })

  const { data, error } = await q.limit(limit)
  if (!error) {
    return ((data ?? []) as unknown as Record<string, unknown>[]).map((r) => normalizeThread(r, true))
  }
  if (!isMissingView(error)) throw new Error(error.message)

  // ── Fallback aman jika view belum ada di DB live ──
  // Hanya ambil id & full_name (TANPA anon_token). Untuk baris anonim,
  // author_id disamarkan jadi null dan label dibuat generik "Anonim",
  // sehingga data privat tidak pernah bocor walau SQL migrasi belum run.
  let legacy = supabase
    .from('threads')
    .select(
      `id, title, content, is_anonymous, is_pinned, is_locked, view_count, comment_count,
       created_at, category_id, author_id,
       author:profiles(full_name, avatar_url, role),
       category:thread_categories(name, slug, icon, color)`
    )
    .eq('is_flagged', false)

  if (opts.category) {
    const { data: cat } = await supabase
      .from('thread_categories')
      .select('id')
      .eq('slug', opts.category)
      .maybeSingle()
    if (cat?.id) legacy = legacy.eq('category_id', cat.id)
    else return []
  }
  if (opts.q) legacy = legacy.ilike('title', `%${opts.q}%`)
  legacy = opts.sort === 'popular'
    ? legacy.order('view_count', { ascending: false })
    : legacy.order('created_at', { ascending: false })

  const res = await legacy.limit(limit)
  if (res.error) throw new Error(res.error.message)
  return ((res.data ?? []) as unknown as Record<string, unknown>[]).map((r) => normalizeThread(r, false))
}

function normalizeThread(r: Record<string, unknown>, fromView: boolean): PublicThread {
  const isAnon = Boolean(r.is_anonymous)
  const author = fromView
    ? {
        label: isAnon
          ? `Anonim#${String(r.anon_label ?? '????')}`
          : String(r.author_name ?? 'Pengguna'),
        avatarUrl: (r.author_avatar as string | null) ?? null,
        role: (r.author_role as string | null) ?? null,
        isAnonymous: isAnon,
      }
    : legacyAuthor(r, isAnon)

  return {
    id: String(r.id),
    title: String(r.title),
    content: String(r.content ?? ''),
    is_anonymous: isAnon,
    is_pinned: Boolean(r.is_pinned),
    is_locked: Boolean(r.is_locked),
    view_count: Number(r.view_count ?? 0),
    comment_count: Number(r.comment_count ?? 0),
    created_at: String(r.created_at),
    category_id: (r.category_id as string | null) ?? null,
    author,
    category: (r.category as PublicThread['category']) ?? null,
  }
}

/** Penulis dari jalur fallback (tabel biasa) — AMAN, tanpa anon_token. */
function legacyAuthor(r: Record<string, unknown>, isAnon: boolean): PublicAuthor {
  const p = (r.author ?? {}) as Record<string, unknown>
  return {
    label: isAnon ? 'Anonim' : String(p.full_name ?? 'Pengguna'),
    avatarUrl: isAnon ? null : ((p.avatar_url as string | null) ?? null),
    role: isAnon ? null : ((p.role as string | null) ?? null),
    isAnonymous: isAnon,
  }
}

// ─────────────────────────────────────────────────────────────
// FORUM — satu thread + komentarnya
// ─────────────────────────────────────────────────────────────

export async function getThread(supabase: Db, id: string): Promise<PublicThread | null> {
  const { data, error } = await supabase
    .from('threads_public')
    .select(
      `id, title, content, is_anonymous, is_pinned, is_locked, view_count, comment_count,
       created_at, category_id, author_id, anon_label, author_name, author_avatar, author_role,
       category:thread_categories(name, slug, icon, color)`
    )
    .eq('id', id)
    .maybeSingle()

  if (!error && data) return normalizeThread(data as unknown as Record<string, unknown>, true)
  if (error && !isMissingView(error)) throw new Error(error.message)

  // Fallback aman tanpa anon_token
  const legacy = await supabase
    .from('threads')
    .select(
      `id, title, content, is_anonymous, is_pinned, is_locked, view_count, comment_count,
       created_at, category_id, author_id,
       author:profiles(full_name, avatar_url, role),
       category:thread_categories(name, slug, icon, color)`
    )
    .eq('id', id)
    .maybeSingle()

  if (legacy.error) throw new Error(legacy.error.message)
  if (!legacy.data) return null
  return normalizeThread(legacy.data as unknown as Record<string, unknown>, false)
}

export interface PublicComment {
  id: string
  thread_id: string
  parent_id: string | null
  content: string
  is_anonymous: boolean
  created_at: string
  author: PublicAuthor
}

export async function listComments(supabase: Db, threadId: string): Promise<PublicComment[]> {
  const { data, error } = await supabase
    .from('comments_public')
    .select(
      `id, thread_id, parent_id, content, is_anonymous, created_at,
       author_id, anon_label, author_name, author_avatar, author_role`
    )
    .eq('thread_id', threadId)
    .order('created_at', { ascending: true })

  if (!error) {
    return ((data ?? []) as unknown as Record<string, unknown>[]).map((r) =>
      normalizeComment(r, true)
    )
  }
  if (!isMissingView(error)) throw new Error(error.message)

  // Fallback aman tanpa anon_token
  const legacy = await supabase
    .from('comments')
    .select(
      `id, thread_id, parent_id, content, is_anonymous, created_at, author_id,
       author:profiles(full_name, avatar_url, role)`
    )
    .eq('thread_id', threadId)
    .order('created_at', { ascending: true })

  if (legacy.error) throw new Error(legacy.error.message)
  return ((legacy.data ?? []) as unknown as Record<string, unknown>[]).map((r) =>
    normalizeComment(r, false)
  )
}

function normalizeComment(r: Record<string, unknown>, fromView: boolean): PublicComment {
  const isAnon = Boolean(r.is_anonymous)
  const author = fromView
    ? {
        label: isAnon
          ? `Anonim#${String(r.anon_label ?? '????')}`
          : String(r.author_name ?? 'Pengguna'),
        avatarUrl: (r.author_avatar as string | null) ?? null,
        role: (r.author_role as string | null) ?? null,
        isAnonymous: isAnon,
      }
    : legacyAuthor(r, isAnon)

  return {
    id: String(r.id),
    thread_id: String(r.thread_id),
    parent_id: (r.parent_id as string | null) ?? null,
    content: String(r.content ?? ''),
    is_anonymous: isAnon,
    created_at: String(r.created_at),
    author,
  }
}

// ─────────────────────────────────────────────────────────────
// PRAYER WALL
// ─────────────────────────────────────────────────────────────

export interface PublicPrayer {
  id: string
  content: string
  is_anonymous: boolean
  is_answered: boolean
  pray_count: number
  created_at: string
  author: PublicAuthor
}

export async function listPrayers(supabase: Db, limit = 30): Promise<PublicPrayer[]> {
  const { data, error } = await supabase
    .from('prayers_public')
    .select(
      `id, content, is_anonymous, is_answered, pray_count, created_at,
       author_id, anon_label, author_name, author_avatar`
    )
    .order('created_at', { ascending: false })
    .limit(limit)

  if (!error) {
    return ((data ?? []) as unknown as Record<string, unknown>[]).map((r) => normalizePrayer(r, true))
  }
  if (!isMissingView(error)) throw new Error(error.message)

  // Fallback aman tanpa anon_token
  const legacy = await supabase
    .from('prayer_requests')
    .select(
      `id, content, is_anonymous, is_answered, pray_count, created_at, author_id,
       author:profiles(full_name, avatar_url)`
    )
    .order('created_at', { ascending: false })
    .limit(limit)

  if (legacy.error) throw new Error(legacy.error.message)
  return ((legacy.data ?? []) as unknown as Record<string, unknown>[]).map((r) =>
    normalizePrayer(r, false)
  )
}

function normalizePrayer(r: Record<string, unknown>, fromView: boolean): PublicPrayer {
  const isAnon = Boolean(r.is_anonymous)
  const author = fromView
    ? {
        label: isAnon
          ? `Anonim#${String(r.anon_label ?? '????')}`
          : String(r.author_name ?? 'Pengguna'),
        avatarUrl: (r.author_avatar as string | null) ?? null,
        role: null,
        isAnonymous: isAnon,
      }
    : legacyAuthor(r, isAnon)

  return {
    id: String(r.id),
    content: String(r.content ?? ''),
    is_anonymous: isAnon,
    is_answered: Boolean(r.is_answered),
    pray_count: Number(r.pray_count ?? 0),
    created_at: String(r.created_at),
    author,
  }
}
