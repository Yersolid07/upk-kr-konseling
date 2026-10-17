// src/app/(app)/admin/konten-situs/actions.ts
// Konten situs: halaman, banner, resource, ayat harian (M10).
//
// KENAPA DIPISAH DARI "PENGATURAN"
// Pengaturan adalah nilai tunggal (nama situs, ambang laporan). Konten situs
// adalah DAFTAR yang tumbuh: halaman tentang, FAQ, banner, resource, ayat per
// tanggal. Menyatukan keduanya membuat halaman pengaturan menjadi daftar
// campur aduk yang tidak bisa ditata.

'use server'

import { z } from 'zod'
import { cmsAction } from '@/lib/cms/action'
import { createClient } from '@/lib/supabase/server'
import { requireCap } from '@/lib/auth-guard'

// ─────────────── HALAMAN ───────────────
const pageSchema = z.object({
  id: z.string().uuid().optional(),
  slug: z
    .string()
    .trim()
    .min(2, 'Slug minimal 2 karakter.')
    .max(80)
    .regex(/^[a-z0-9-]+$/, 'Slug hanya boleh huruf kecil, angka, dan tanda hubung.'),
  title: z.string().trim().min(2, 'Judul minimal 2 karakter.').max(150),
  titleEn: z.string().trim().max(150).optional(),
  content: z.string().max(50000).default(''),
  contentEn: z.string().max(50000).optional(),
  status: z.enum(['draft', 'published']).default('draft'),
  sortOrder: z.coerce.number().int().min(0).max(999).default(0),
  showInFooter: z.coerce.boolean().default(false),
  reason: z.string().trim().max(300).optional(),
})

const savePageImpl = cmsAction({
  cap: 'manageSiteContent',
  entity: 'site_pages',
  action: 'update',
  schema: pageSchema,
  load: async ({ id }, db) => {
    if (!id) return { __new: true }
    const { data } = await db.from('site_pages').select('id, slug, title, status').eq('id', id).maybeSingle()
    if (!data) throw new Error('Halaman tidak ditemukan.')
    return data
  },
  run: async (_ctx, input, db, before) => {
    const isNew = Boolean((before as { __new?: boolean } | null)?.__new)
    const payload = {
      slug: input.slug,
      title: input.title,
      title_en: input.titleEn || null,
      content: input.content,
      content_en: input.contentEn || null,
      status: input.status,
      sort_order: input.sortOrder,
      show_in_footer: input.showInFooter,
      updated_at: new Date().toISOString(),
    }

    if (isNew) {
      const { data, error } = await db.from('site_pages').insert(payload as never).select('id').single()
      if (error) {
        if (error.code === '23505') throw new Error('Slug itu sudah dipakai halaman lain.')
        throw new Error(error.message)
      }
      const row = data as unknown as { id: string }
      return { id: row.id, after: payload, data: { id: row.id } }
    }

    const { error } = await db.from('site_pages').update(payload as never).eq('id', input.id as string)
    if (error) {
      if (error.code === '23505') throw new Error('Slug itu sudah dipakai halaman lain.')
      throw new Error(error.message)
    }
    return { id: input.id as string, after: payload, data: { id: input.id as string } }
  },
  revalidate: ['/admin/konten-situs', '/tentang', '/kontak', '/faq'],
})

const deletePageImpl = cmsAction({
  cap: 'manageSiteContent',
  entity: 'site_pages',
  action: 'delete',
  requireReason: true,
  schema: z.object({
    id: z.string().uuid('ID halaman tidak valid.'),
    reason: z.string().trim().min(5, 'Alasan minimal 5 karakter.').max(300),
  }),
  load: async ({ id }, db) => {
    const { data } = await db.from('site_pages').select('id, slug, title').eq('id', id).maybeSingle()
    if (!data) throw new Error('Halaman tidak ditemukan.')
    return data
  },
  run: async (_ctx, { id }, db) => {
    const { error } = await db.from('site_pages').delete().eq('id', id)
    if (error) throw new Error(error.message)
    return { id, after: null, data: { deleted: true } }
  },
  revalidate: ['/admin/konten-situs'],
})

// ─────────────── BANNER ───────────────
const bannerSchema = z.object({
  id: z.string().uuid().optional(),
  message: z.string().trim().min(5, 'Pesan minimal 5 karakter.').max(300),
  messageEn: z.string().trim().max(300).optional(),
  level: z.enum(['info', 'warning', 'critical']).default('info'),
  startsAt: z.string().optional(),
  endsAt: z.string().optional(),
  targetRole: z.string().trim().optional(),
  dismissible: z.coerce.boolean().default(true),
  isActive: z.coerce.boolean().default(true),
  reason: z.string().trim().max(300).optional(),
})

const saveBannerImpl = cmsAction({
  cap: 'manageSiteContent',
  entity: 'site_banners',
  action: 'update',
  schema: bannerSchema,
  load: async ({ id }, db) => {
    if (!id) return { __new: true }
    const { data } = await db.from('site_banners').select('id, message').eq('id', id).maybeSingle()
    if (!data) throw new Error('Banner tidak ditemukan.')
    return data
  },
  run: async (_ctx, input, db, before) => {
    const isNew = Boolean((before as { __new?: boolean } | null)?.__new)

    // Tanggal kosong berarti "mulai sekarang" / "tanpa batas akhir".
    const payload = {
      message: input.message,
      message_en: input.messageEn || null,
      level: input.level,
      starts_at: input.startsAt ? new Date(input.startsAt).toISOString() : new Date().toISOString(),
      ends_at: input.endsAt ? new Date(input.endsAt).toISOString() : null,
      target_role: input.targetRole || null,
      dismissible: input.dismissible,
      is_active: input.isActive,
    }

    if (isNew) {
      const { data, error } = await db.from('site_banners').insert(payload as never).select('id').single()
      if (error) throw new Error(error.message)
      const row = data as unknown as { id: string }
      return { id: row.id, after: payload, data: { id: row.id } }
    }
    const { error } = await db.from('site_banners').update(payload as never).eq('id', input.id as string)
    if (error) throw new Error(error.message)
    return { id: input.id as string, after: payload, data: { id: input.id as string } }
  },
  revalidate: ['/admin/konten-situs', '/'],
})

const deleteBannerImpl = cmsAction({
  cap: 'manageSiteContent',
  entity: 'site_banners',
  action: 'delete',
  requireReason: true,
  schema: z.object({
    id: z.string().uuid('ID banner tidak valid.'),
    reason: z.string().trim().min(5, 'Alasan minimal 5 karakter.').max(300),
  }),
  load: async ({ id }, db) => {
    const { data } = await db.from('site_banners').select('id, message').eq('id', id).maybeSingle()
    if (!data) throw new Error('Banner tidak ditemukan.')
    return data
  },
  run: async (_ctx, { id }, db) => {
    const { error } = await db.from('site_banners').delete().eq('id', id)
    if (error) throw new Error(error.message)
    return { id, after: null, data: { deleted: true } }
  },
  revalidate: ['/admin/konten-situs', '/'],
})

// ─────────────── RESOURCE ───────────────
const resourceSchema = z.object({
  id: z.string().uuid().optional(),
  title: z.string().trim().min(2, 'Judul minimal 2 karakter.').max(150),
  titleEn: z.string().trim().max(150).optional(),
  description: z.string().trim().max(500).optional(),
  descriptionEn: z.string().trim().max(500).optional(),
  url: z.string().trim().url('Alamat harus berupa URL lengkap, termasuk https://'),
  category: z.string().trim().max(60).default('umum'),
  sortOrder: z.coerce.number().int().min(0).max(999).default(0),
  isActive: z.coerce.boolean().default(true),
  reason: z.string().trim().max(300).optional(),
})

const saveResourceImpl = cmsAction({
  cap: 'manageSiteContent',
  entity: 'resources',
  action: 'update',
  schema: resourceSchema,
  load: async ({ id }, db) => {
    if (!id) return { __new: true }
    const { data } = await db.from('resources').select('id, title').eq('id', id).maybeSingle()
    if (!data) throw new Error('Resource tidak ditemukan.')
    return data
  },
  run: async (_ctx, input, db, before) => {
    const isNew = Boolean((before as { __new?: boolean } | null)?.__new)
    const payload = {
      title: input.title,
      title_en: input.titleEn || null,
      description: input.description || null,
      description_en: input.descriptionEn || null,
      url: input.url,
      category: input.category,
      sort_order: input.sortOrder,
      is_active: input.isActive,
    }

    if (isNew) {
      const { data, error } = await db.from('resources').insert(payload as never).select('id').single()
      if (error) throw new Error(error.message)
      const row = data as unknown as { id: string }
      return { id: row.id, after: payload, data: { id: row.id } }
    }
    const { error } = await db.from('resources').update(payload as never).eq('id', input.id as string)
    if (error) throw new Error(error.message)
    return { id: input.id as string, after: payload, data: { id: input.id as string } }
  },
  revalidate: ['/admin/konten-situs', '/resource'],
})

const deleteResourceImpl = cmsAction({
  cap: 'manageSiteContent',
  entity: 'resources',
  action: 'delete',
  requireReason: true,
  schema: z.object({
    id: z.string().uuid('ID resource tidak valid.'),
    reason: z.string().trim().min(5, 'Alasan minimal 5 karakter.').max(300),
  }),
  load: async ({ id }, db) => {
    const { data } = await db.from('resources').select('id, title').eq('id', id).maybeSingle()
    if (!data) throw new Error('Resource tidak ditemukan.')
    return data
  },
  run: async (_ctx, { id }, db) => {
    const { error } = await db.from('resources').delete().eq('id', id)
    if (error) throw new Error(error.message)
    return { id, after: null, data: { deleted: true } }
  },
  revalidate: ['/admin/konten-situs', '/resource'],
})

// ─────────────── AYAT HARIAN ───────────────
const verseSchema = z.object({
  id: z.string().uuid().optional(),
  verseText: z.string().trim().min(5, 'Teks ayat minimal 5 karakter.').max(1000),
  verseRef: z.string().trim().min(2, 'Referensi minimal 2 karakter.').max(80),
  verseTextEn: z.string().trim().max(1000).optional(),
  verseRefEn: z.string().trim().max(80).optional(),
  displayDate: z.string().trim().optional(),
  reason: z.string().trim().max(300).optional(),
})

const saveVerseImpl = cmsAction({
  cap: 'manageVerses',
  entity: 'daily_verses',
  action: 'update',
  schema: verseSchema,
  load: async ({ id }, db) => {
    if (!id) return { __new: true }
    const { data } = await db.from('daily_verses').select('id, verse_ref').eq('id', id).maybeSingle()
    if (!data) throw new Error('Ayat tidak ditemukan.')
    return data
  },
  run: async (_ctx, input, db, before) => {
    const isNew = Boolean((before as { __new?: boolean } | null)?.__new)
    const payload = {
      verse_text: input.verseText,
      verse_ref: input.verseRef,
      verse_text_en: input.verseTextEn || null,
      verse_ref_en: input.verseRefEn || null,
      display_date: input.displayDate || null,
    }

    if (isNew) {
      const { data, error } = await db.from('daily_verses').insert(payload as never).select('id').single()
      if (error) {
        if (error.code === '23505') throw new Error('Sudah ada ayat untuk tanggal itu.')
        throw new Error(error.message)
      }
      const row = data as unknown as { id: string }
      return { id: row.id, after: payload, data: { id: row.id } }
    }
    const { error } = await db.from('daily_verses').update(payload as never).eq('id', input.id as string)
    if (error) {
      if (error.code === '23505') throw new Error('Sudah ada ayat untuk tanggal itu.')
      throw new Error(error.message)
    }
    return { id: input.id as string, after: payload, data: { id: input.id as string } }
  },
  revalidate: ['/admin/konten-situs', '/dashboard', '/'],
})

const deleteVerseImpl = cmsAction({
  cap: 'manageVerses',
  entity: 'daily_verses',
  action: 'delete',
  requireReason: true,
  schema: z.object({
    id: z.string().uuid('ID ayat tidak valid.'),
    reason: z.string().trim().min(5, 'Alasan minimal 5 karakter.').max(300),
  }),
  load: async ({ id }, db) => {
    const { data } = await db.from('daily_verses').select('id, verse_ref').eq('id', id).maybeSingle()
    if (!data) throw new Error('Ayat tidak ditemukan.')
    return data
  },
  run: async (_ctx, { id }, db) => {
    const { error } = await db.from('daily_verses').delete().eq('id', id)
    if (error) throw new Error(error.message)
    return { id, after: null, data: { deleted: true } }
  },
  revalidate: ['/admin/konten-situs', '/dashboard', '/'],
})

/**
 * Impor ayat dari CSV.
 *
 * Format: verse_text,verse_ref,display_date (tanggal opsional, YYYY-MM-DD).
 * Baris yang gagal dilaporkan satu per satu — bukan dibatalkan semua. Satu
 * baris rusak tidak boleh menggagalkan 300 baris yang benar.
 */
export async function importVerses(csvText: string) {
  await requireCap('manageVerses')
  const supabase = createClient()

  const lines = csvText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l && !l.toLowerCase().startsWith('verse_text'))

  if (lines.length === 0) return { ok: false as const, error: 'Tidak ada baris yang bisa diimpor.' }
  if (lines.length > 500) return { ok: false as const, error: 'Maksimal 500 baris sekali impor.' }

  let inserted = 0
  const failures: { line: number; error: string }[] = []

  for (let i = 0; i < lines.length; i++) {
    // Pemisah koma sederhana cukup untuk format ini; teks ayat yang memuat
    // koma ditulis di dalam tanda kutip ganda.
    const parts = lines[i].match(/("([^"]|"")*"|[^,]*)(,|$)/g)?.map((p) =>
      p.replace(/,$/, '').replace(/^"|"$/g, '').replace(/""/g, '"').trim()
    ) ?? []

    const [verseText, verseRef, displayDate] = parts
    if (!verseText || !verseRef) {
      failures.push({ line: i + 2, error: 'Teks atau referensi kosong.' })
      continue
    }

    const { error } = await supabase.from('daily_verses').insert({
      verse_text: verseText,
      verse_ref: verseRef,
      display_date: displayDate || null,
    } as never)

    if (error) {
      failures.push({
        line: i + 2,
        error: error.code === '23505' ? 'Tanggal itu sudah punya ayat.' : error.message,
      })
    } else {
      inserted++
    }
  }

  return { ok: true as const, inserted, failures }
}

// ── Pembungkus Server Action ──
export async function savePage(input: unknown) {
  return savePageImpl(input)
}
export async function deletePage(input: unknown) {
  return deletePageImpl(input)
}
export async function saveBanner(input: unknown) {
  return saveBannerImpl(input)
}
export async function deleteBanner(input: unknown) {
  return deleteBannerImpl(input)
}
export async function saveResource(input: unknown) {
  return saveResourceImpl(input)
}
export async function deleteResource(input: unknown) {
  return deleteResourceImpl(input)
}
export async function saveVerse(input: unknown) {
  return saveVerseImpl(input)
}
export async function deleteVerse(input: unknown) {
  return deleteVerseImpl(input)
}
