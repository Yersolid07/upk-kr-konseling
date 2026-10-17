// src/app/(app)/admin/kategori/actions.ts
// Kelola kategori forum/doa/artikel.
//
// Kategori terlihat sederhana tetapi menyentuh tiga tabel sekaligus. Karena
// itu penghapusan ditolak database bila masih dipakai (trigger
// prevent_category_delete_in_use), dan UI menawarkan ARSIP sebagai gantinya.
// Arsip menyembunyikan kategori dari pemilih tanpa memutus konten lama.

'use server'

import { z } from 'zod'
import { cmsAction } from '@/lib/cms/action'

const nameSchema = z.string().trim().min(2, 'Nama minimal 2 karakter.').max(60)

const saveSchema = z.object({
  id: z.string().uuid().optional(),
  name: nameSchema,
  nameEn: z.string().trim().max(60).optional(),
  slug: z
    .string()
    .trim()
    .min(2)
    .max(60)
    .regex(/^[a-z0-9-]+$/, 'Slug hanya huruf kecil, angka, dan tanda hubung.'),
  icon: z.string().trim().max(40).default('💬'),
  color: z
    .string()
    .trim()
    .regex(/^#[0-9a-fA-F]{6}$/, 'Warna harus format #RRGGBB.')
    .default('#C4895A'),
  description: z.string().trim().max(300).optional(),
  sortOrder: z.coerce.number().int().min(0).max(999).default(0),
})

const saveCategoryImpl = cmsAction({
  cap: 'manageCategories',
  entity: 'thread_categories',
  action: 'update',
  schema: saveSchema,
  load: async ({ id }, db) => {
    if (!id) return { new: true }
    const { data, error } = await db
      .from('thread_categories')
      .select('id, name, slug, is_archived')
      .eq('id', id)
      .maybeSingle()
    if (error) throw new Error(error.message)
    if (!data) throw new Error('Kategori tidak ditemukan.')
    return data
  },
  run: async (_ctx, input, db) => {
    const payload = {
      name: input.name,
      name_en: input.nameEn || null,
      slug: input.slug,
      icon: input.icon,
      color: input.color,
      description: input.description || null,
      sort_order: input.sortOrder,
      updated_at: new Date().toISOString(),
    }

    if (input.id) {
      const { error } = await db
        .from('thread_categories')
        .update(payload as never)
        .eq('id', input.id)
      if (error) {
        // 23505 = slug/nama sudah dipakai.
        if (error.code === '23505') {
          throw new Error('Nama atau slug itu sudah dipakai kategori lain.')
        }
        throw new Error(error.message)
      }
      return { id: input.id, after: payload, data: { id: input.id } }
    }

    const { data, error } = await db
      .from('thread_categories')
      .insert(payload as never)
      .select('id')
      .single()
    if (error) {
      if (error.code === '23505') {
        throw new Error('Nama atau slug itu sudah dipakai kategori lain.')
      }
      throw new Error(error.message)
    }
    const row = data as unknown as { id: string }
    return { id: row.id, after: payload, data: { id: row.id } }
  },
  revalidate: ['/admin/kategori', '/forum', '/prayer', '/renungan'],
})

const archiveSchema = z.object({
  id: z.string().uuid(),
  archived: z.boolean(),
})

const archiveCategoryImpl = cmsAction({
  cap: 'manageCategories',
  entity: 'thread_categories',
  action: 'update',
  schema: archiveSchema,
  load: async ({ id }, db) => {
    const { data, error } = await db
      .from('thread_categories')
      .select('id, name, is_archived')
      .eq('id', id)
      .maybeSingle()
    if (error) throw new Error(error.message)
    if (!data) throw new Error('Kategori tidak ditemukan.')
    return data
  },
  run: async (_ctx, { id, archived }, db) => {
    const { error } = await db
      .from('thread_categories')
      .update({ is_archived: archived, updated_at: new Date().toISOString() } as never)
      .eq('id', id)
    if (error) throw new Error(error.message)
    return { id, after: { is_archived: archived }, data: { id } }
  },
  revalidate: ['/admin/kategori', '/forum', '/prayer'],
})

const deleteSchema = z.object({
  id: z.string().uuid(),
  reason: z.string().trim().min(5, 'Alasan minimal 5 karakter.').max(500),
})

const deleteCategoryImpl = cmsAction({
  cap: 'manageCategories',
  entity: 'thread_categories',
  action: 'delete',
  requireReason: true,
  schema: deleteSchema,
  load: async ({ id }, db) => {
    const { data, error } = await db
      .from('thread_categories')
      .select('id, name')
      .eq('id', id)
      .maybeSingle()
    if (error) throw new Error(error.message)
    if (!data) throw new Error('Kategori tidak ditemukan.')
    return data
  },
  run: async (_ctx, { id }, db) => {
    const { error } = await db.from('thread_categories').delete().eq('id', id)
    if (error) {
      // Trigger database menolak bila masih dipakai — pesannya sudah jelas
      // dan menyebut jumlah konten, jadi diteruskan apa adanya.
      if (error.code === '23503') throw new Error(error.message)
      throw new Error(error.message)
    }
    return { id, after: { deleted: true }, data: { id } }
  },
  revalidate: ['/admin/kategori', '/forum', '/prayer', '/renungan'],
})

// ── Pembungkus Server Action ──
export async function saveCategory(input: unknown) {
  return saveCategoryImpl(input)
}
export async function archiveCategory(input: unknown) {
  return archiveCategoryImpl(input)
}
export async function deleteCategory(input: unknown) {
  return deleteCategoryImpl(input)
}
