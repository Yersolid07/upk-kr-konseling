// src/app/(app)/admin/kata-terlarang/actions.ts
// Kelola daftar kata terlarang.

'use server'

import { z } from 'zod'
import { cmsAction } from '@/lib/cms/action'

const addSchema = z.object({
  word: z.string().trim().min(2, 'Kata minimal 2 karakter.').max(60),
  category: z.enum(['spam', 'kasar', 'krisis']),
})

const addImpl = cmsAction({
  cap: 'moderateContent',
  entity: 'banned_words',
  action: 'create',
  schema: addSchema,
  run: async (_ctx, { word, category }, db) => {
    const { data, error } = await db
      .from('banned_words')
      .insert({ word: word.toLowerCase(), category } as never)
      .select('id')
      .single()
    if (error) {
      if (error.code === '23505') throw new Error('Kata itu sudah ada di daftar.')
      throw new Error(error.message)
    }
    const row = data as unknown as { id: string }
    return { id: row.id, after: { word, category }, data: { id: row.id } }
  },
  revalidate: ['/admin/kata-terlarang'],
})

const toggleSchema = z.object({
  id: z.string().uuid(),
  active: z.coerce.boolean(),
})

const toggleImpl = cmsAction({
  cap: 'moderateContent',
  entity: 'banned_words',
  action: 'update',
  schema: toggleSchema,
  load: async ({ id }, db) => {
    const { data, error } = await db
      .from('banned_words')
      .select('id, word, is_active')
      .eq('id', id)
      .maybeSingle()
    if (error) throw new Error(error.message)
    if (!data) throw new Error('Kata tidak ditemukan.')
    return data
  },
  run: async (_ctx, { id, active }, db) => {
    const { error } = await db
      .from('banned_words')
      .update({ is_active: active } as never)
      .eq('id', id)
    if (error) throw new Error(error.message)
    return { id, after: { is_active: active }, data: { id } }
  },
  revalidate: ['/admin/kata-terlarang'],
})

const removeSchema = z.object({
  id: z.string().uuid(),
  reason: z.string().trim().min(5, 'Alasan minimal 5 karakter.').max(300),
})

const removeImpl = cmsAction({
  cap: 'moderateContent',
  entity: 'banned_words',
  action: 'delete',
  requireReason: true,
  schema: removeSchema,
  load: async ({ id }, db) => {
    const { data, error } = await db
      .from('banned_words')
      .select('id, word, category')
      .eq('id', id)
      .maybeSingle()
    if (error) throw new Error(error.message)
    if (!data) throw new Error('Kata tidak ditemukan.')
    return data
  },
  run: async (_ctx, { id }, db) => {
    const { error } = await db.from('banned_words').delete().eq('id', id)
    if (error) throw new Error(error.message)
    return { id, after: { deleted: true }, data: { id } }
  },
  revalidate: ['/admin/kata-terlarang'],
})

export async function addBannedWord(input: unknown) {
  return addImpl(input)
}
export async function toggleBannedWord(input: unknown) {
  return toggleImpl(input)
}
export async function removeBannedWord(input: unknown) {
  return removeImpl(input)
}
