// src/app/(app)/admin/artikel/actions.ts
// Editor artikel untuk staf (M5).
//
// Beda dengan /admin/articles (antrean persetujuan): di sini staf MEMBUAT dan
// MENYUNTING artikel, termasuk milik orang lain, lalu mengatur status terbit.
//
// RIWAYAT REVISI
// Salinan versi LAMA disimpan otomatis oleh trigger `snapshot_article_revision`
// (lihat supabase/phase3-content-modules.sql) pada setiap UPDATE yang mengubah
// judul/isi/ringkasan/status. Jadi tidak ada jalur tulis yang bisa melewatinya —
// termasuk update langsung dari SQL Editor.
//
// KEMBALIKAN KE VERSI LAIN
// Mengembalikan berarti MENULIS ULANG isi lama sebagai versi baru. Versi yang
// dikembalikan tidak dihapus: riwayat tetap utuh dan bisa dibandingkan.

'use server'

import { z } from 'zod'
import { cmsAction } from '@/lib/cms/action'

const slugify = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 80)

const saveSchema = z.object({
  id: z.string().uuid().optional(),
  title: z.string().trim().min(5, 'Judul minimal 5 karakter.').max(200),
  slug: z.string().trim().max(80).optional(),
  excerpt: z.string().trim().max(300).optional(),
  content: z.string().trim().min(50, 'Isi artikel minimal 50 karakter.'),
  categoryId: z.string().uuid().optional().nullable(),
  coverUrl: z.string().trim().url('URL sampul tidak valid.').optional().nullable().or(z.literal('')),
  tags: z.string().trim().max(200).optional(),
  status: z.enum(['draft', 'pending_review', 'published', 'rejected', 'archived']),
  isFeatured: z.coerce.boolean().default(false),
  /** Kosong = terbit sekarang. Format ISO dari input datetime-local. */
  scheduledAt: z.string().trim().optional().nullable(),
})

const saveArticleImpl = cmsAction({
  cap: 'manageSiteContent',
  entity: 'articles',
  action: 'update',
  schema: saveSchema,
  load: async ({ id }, db) => {
    if (!id) return { new: true }
    const { data, error } = await db
      .from('articles')
      .select('id, title, slug, status, author_id')
      .eq('id', id)
      .maybeSingle()
    if (error) throw new Error(error.message)
    if (!data) throw new Error('Artikel tidak ditemukan.')
    return data
  },
  run: async (ctx, input, db, before) => {
    const b = before as { new?: boolean; slug?: string; author_id?: string }

    const tags = (input.tags ?? '')
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean)
      .slice(0, 10)

    // Jadwal terbit hanya bermakna untuk status published.
    let publishedAt: string | null = null
    if (input.status === 'published') {
      publishedAt = input.scheduledAt ? new Date(input.scheduledAt).toISOString() : new Date().toISOString()
    }

    const payload = {
      title: input.title,
      slug: (input.slug?.trim() || slugify(input.title)) as string,
      excerpt: input.excerpt || null,
      content: input.content,
      category_id: input.categoryId || null,
      cover_url: input.coverUrl || null,
      tags: tags.length > 0 ? tags : null,
      status: input.status,
      is_featured: input.isFeatured,
      published_at: publishedAt,
      // is_published disinkronkan oleh trigger; tetap dikirim agar konsisten
      // bila trigger belum terpasang di lingkungan lama.
      is_published: input.status === 'published',
    }

    if (input.id) {
      // Tandai bahwa ini suntingan STAF — tampilan publik jujur soal itu.
      const { error } = await db
        .from('articles')
        .update({
          ...payload,
          edited_by: ctx.userId,
        } as never)
        .eq('id', input.id)
      if (error) {
        if (error.code === '23505') throw new Error('Slug itu sudah dipakai artikel lain.')
        throw new Error(error.message)
      }
      return { id: input.id, after: payload, data: { id: input.id } }
    }

    // Artikel resmi ditulis atas nama staf yang sedang masuk.
    const { data, error } = await db
      .from('articles')
      .insert({
        ...payload,
        author_id: ctx.userId,
      } as never)
      .select('id')
      .single()
    if (error) {
      if (error.code === '23505') throw new Error('Slug itu sudah dipakai artikel lain.')
      throw new Error(error.message)
    }
    const row = data as unknown as { id: string }
    return { id: row.id, after: payload, data: { id: row.id } }
  },
  revalidate: ['/admin/artikel', '/admin/articles', '/renungan', '/'],
})

const restoreSchema = z.object({
  articleId: z.string().uuid(),
  revisionId: z.string().uuid(),
  reason: z.string().trim().min(5, 'Alasan minimal 5 karakter.').max(300),
})

const restoreRevisionImpl = cmsAction({
  cap: 'manageSiteContent',
  entity: 'articles',
  action: 'restore',
  requireReason: true,
  schema: restoreSchema,
  load: async ({ articleId, revisionId }, db) => {
    const { data, error } = await db
      .from('article_revisions')
      .select('id, article_id, title, content, excerpt, status, version')
      .eq('id', revisionId)
      .eq('article_id', articleId)
      .maybeSingle()
    if (error) throw new Error(error.message)
    if (!data) throw new Error('Versi itu tidak ditemukan untuk artikel ini.')
    return data
  },
  run: async (_ctx, { articleId }, db, before) => {
    const rev = before as {
      title: string
      content: string
      excerpt: string | null
      status: string | null
      version: number
    }

    // Menulis ulang isi lama sebagai versi BARU. Trigger akan menyimpan
    // kondisi sekarang sebagai revisi, jadi tidak ada yang hilang.
    const { error } = await db
      .from('articles')
      .update({
        title: rev.title,
        content: rev.content,
        excerpt: rev.excerpt,
        status: (rev.status ?? 'draft') as never,
      } as never)
      .eq('id', articleId)
    if (error) throw new Error(error.message)

    return {
      id: articleId,
      after: { restored_from_version: rev.version },
      data: { version: rev.version },
    }
  },
  revalidate: ['/admin/artikel', '/renungan'],
})

// ── Pembungkus Server Action ──
export async function saveArticle(input: unknown) {
  return saveArticleImpl(input)
}
export async function restoreRevision(input: unknown) {
  return restoreRevisionImpl(input)
}
