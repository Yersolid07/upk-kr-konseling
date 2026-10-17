// src/app/(app)/admin/media/actions.ts
// Media (M12): tandai & bersihkan berkas yatim.
//
// Berkas yatim muncul saat unggahan berhasil tetapi baris basis datanya batal
// dibuat — koneksi putus di tengah jalan adalah penyebab paling umum. Berkasnya
// tetap memakan kuota. Menghapusnya aman karena tidak ada baris yang menunjuk
// kepadanya; itulah definisi yatim.

'use server'

import { z } from 'zod'
import { cmsAction } from '@/lib/cms/action'
import { requireCap } from '@/lib/auth-guard'
import { createClient } from '@/lib/supabase/server'

const markSchema = z.object({
  id: z.string().uuid('ID berkas tidak valid.'),
  reason: z.string().trim().max(300).optional(),
})

const markImpl = cmsAction({
  cap: 'manageMedia',
  entity: 'attachments',
  action: 'update',
  schema: markSchema,
  load: async ({ id }, db) => {
    const { data } = await db
      .from('attachments')
      .select('id, title, size_bytes, is_orphan')
      .eq('id', id)
      .maybeSingle()
    if (!data) throw new Error('Berkas tidak ditemukan.')
    return data
  },
  run: async (_ctx, { id }, db) => {
    const { error } = await db
      .from('attachments')
      .update({ is_orphan: true, checked_at: new Date().toISOString() } as never)
      .eq('id', id)
    if (error) throw new Error(error.message)
    return { id, after: { is_orphan: true }, data: { marked: true } }
  },
  revalidate: ['/admin/media'],
})

const clearSchema = z.object({
  id: z.string().uuid('ID berkas tidak valid.'),
  reason: z.string().trim().max(300).optional(),
})

const clearImpl = cmsAction({
  cap: 'manageMedia',
  entity: 'attachments',
  action: 'update',
  schema: clearSchema,
  load: async ({ id }, db) => {
    const { data } = await db
      .from('attachments')
      .select('id, title, is_orphan')
      .eq('id', id)
      .maybeSingle()
    if (!data) throw new Error('Berkas tidak ditemukan.')
    return data
  },
  run: async (_ctx, { id }, db) => {
    const { error } = await db
      .from('attachments')
      .update({ is_orphan: false, checked_at: new Date().toISOString() } as never)
      .eq('id', id)
    if (error) throw new Error(error.message)
    return { id, after: { is_orphan: false }, data: { cleared: true } }
  },
  revalidate: ['/admin/media'],
})

/**
 * Hapus berkas yatim: baris dihapus, lalu objek di Storage.
 *
 * Urutannya penting. Baris dulu, objek kemudian. Bila objek dihapus lebih dulu
 * dan penghapusan baris gagal, yang tersisa adalah baris tanpa berkas — tautan
 * rusak yang tampak seperti berkas hilang. Sebaliknya, baris tanpa objek hanya
 * menyisakan kuota yang bisa dibersihkan lagi nanti.
 */
export async function purgeOrphan(id: string): Promise<{ message?: string; error?: string }> {
  await requireCap('manageMedia')

  const parsed = z.string().uuid().safeParse(id)
  if (!parsed.success) return { error: 'ID berkas tidak valid.' }

  const supabase = createClient()

  const { data: row, error: readErr } = await supabase
    .from('attachments')
    .select('id, storage_path, url, is_orphan')
    .eq('id', parsed.data)
    .maybeSingle()

  if (readErr) return { error: readErr.message }
  if (!row) return { error: 'Berkas tidak ditemukan.' }

  const att = row as unknown as {
    id: string
    storage_path: string | null
    url: string | null
    is_orphan: boolean
  }

  if (!att.is_orphan) {
    return { error: 'Berkas ini masih dipakai. Tandai yatim dulu bila memang tidak terpakai.' }
  }

  const { error: delErr } = await supabase.from('attachments').delete().eq('id', att.id)
  if (delErr) return { error: delErr.message }

  // Jalur storage bisa datang dari kolom baru, atau diturunkan dari URL publik.
  let path = att.storage_path
  if (!path && att.url) {
    const marker = '/storage/v1/object/public/'
    const idx = att.url.indexOf(marker)
    if (idx >= 0) path = decodeURIComponent(att.url.slice(idx + marker.length))
  }

  if (path) {
    const { error: storageErr } = await supabase.storage.from('attachments').remove([path])
    // Baris sudah hilang; kegagalan storage bukan alasan membatalkan laporan
    // sukses — berkas akan muncul lagi di daftar yatim pada pemindaian berikut.
    if (storageErr) {
      return { message: 'Baris dihapus. Objek storage gagal dihapus: ' + storageErr.message }
    }
  }

  return { message: 'Berkas yatim dihapus.' }
}

export async function markOrphan(input: unknown) {
  return markImpl(input)
}
export async function clearOrphan(input: unknown) {
  return clearImpl(input)
}
