// src/app/(app)/admin/forum/thread-edit-actions.ts
// Tindakan moderasi khas forum: pin, kunci, pindah kategori, sunting.
//
// Berbeda dari content-actions.ts yang generik untuk enam tabel, aksi di sini
// hanya masuk akal untuk thread. Dipisah supaya tidak mengotori jalur generik
// dengan opsi yang tidak berlaku untuk komentar atau doa.
//
// EDIT OLEH STAF
// Ketika staf mengubah judul/isi thread orang lain, `edited_by` diisi. View
// publik memakainya untuk menampilkan penanda "diedit moderator" — pembaca
// berhak tahu kata-kata itu bukan lagi sepenuhnya milik penulis asli.

'use server'

import { z } from 'zod'
import { cmsAction } from '@/lib/cms/action'

const toggleSchema = z.object({
  id: z.string().uuid(),
  field: z.enum(['is_pinned', 'is_locked', 'is_flagged']),
  value: z.coerce.boolean(),
})

const toggleImpl = cmsAction({
  cap: 'moderateContent',
  entity: 'threads',
  action: 'update',
  schema: toggleSchema,
  load: async ({ id }, db) => {
    const { data, error } = await db
      .from('threads')
      .select('id, title, is_pinned, is_locked, is_flagged')
      .eq('id', id)
      .maybeSingle()
    if (error) throw new Error(error.message)
    if (!data) throw new Error('Diskusi tidak ditemukan.')
    return data
  },
  run: async (_ctx, { id, field, value }, db, before) => {
    const b = before as Record<string, unknown>
    if (b[field] === value) {
      return { id, after: null, data: { changed: false } }
    }
    const { error } = await db
      .from('threads')
      .update({ [field]: value } as never)
      .eq('id', id)
    if (error) throw new Error(error.message)
    return { id, after: { [field]: value }, data: { changed: true } }
  },
  revalidate: ['/admin/forum', '/forum'],
})

const moveSchema = z.object({
  id: z.string().uuid(),
  categoryId: z.string().uuid().nullable(),
})

const moveImpl = cmsAction({
  cap: 'moderateContent',
  entity: 'threads',
  action: 'update',
  schema: moveSchema,
  load: async ({ id }, db) => {
    const { data, error } = await db
      .from('threads')
      .select('id, title, category_id')
      .eq('id', id)
      .maybeSingle()
    if (error) throw new Error(error.message)
    if (!data) throw new Error('Diskusi tidak ditemukan.')
    return data
  },
  run: async (_ctx, { id, categoryId }, db) => {
    const { error } = await db
      .from('threads')
      .update({ category_id: categoryId } as never)
      .eq('id', id)
    if (error) throw new Error(error.message)
    return { id, after: { category_id: categoryId }, data: { categoryId } }
  },
  revalidate: ['/admin/forum', '/forum', '/admin/kategori'],
})

const editSchema = z.object({
  id: z.string().uuid(),
  title: z.string().trim().min(5, 'Judul minimal 5 karakter.').max(200),
  content: z.string().trim().min(10, 'Isi minimal 10 karakter.'),
  reason: z.string().trim().min(5, 'Alasan suntingan wajib diisi.').max(300),
})

const editImpl = cmsAction({
  cap: 'moderateContent',
  entity: 'threads',
  action: 'update',
  requireReason: true,
  schema: editSchema,
  load: async ({ id }, db) => {
    const { data, error } = await db
      .from('threads')
      .select('id, title, content')
      .eq('id', id)
      .maybeSingle()
    if (error) throw new Error(error.message)
    if (!data) throw new Error('Diskusi tidak ditemukan.')
    return data
  },
  run: async (ctx, { id, title, content }, db) => {
    const { error } = await db
      .from('threads')
      .update({
        title,
        content,
        edited_by: ctx.userId,
        edited_at: new Date().toISOString(),
      } as never)
      .eq('id', id)
    if (error) throw new Error(error.message)
    return { id, after: { title, content, edited_by: ctx.userId }, data: { id } }
  },
  revalidate: ['/admin/forum', '/forum'],
})

// ── Pembungkus Server Action ──
export async function toggleThreadFlag(input: unknown) {
  return toggleImpl(input)
}
export async function moveThreadCategory(input: unknown) {
  return moveImpl(input)
}
export async function editThreadContent(input: unknown) {
  return editImpl(input)
}
