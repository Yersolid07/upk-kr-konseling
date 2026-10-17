// src/app/(app)/admin/siaran/actions.ts
// Siaran & templat (M9).
//
// KENAPA SIARAN PUNYA RPC, BUKAN INSERT BIASA
// Menulis notifikasi ke ribuan pengguna dari Server Action berarti ribuan
// baris dikirim lewat jaringan. RPC `send_broadcast` melakukannya di database
// dalam satu transaksi: penerima ditentukan, notifikasi ditulis, status diubah,
// dan pembatasan laju diperiksa — semuanya berhasil atau tidak sama sekali.
//
// Membatalkan di tengah jalan akan menghasilkan siaran yang sampai ke separuh
// anggota, dan itu lebih buruk daripada gagal total.

'use server'

import { z } from 'zod'
import { cmsAction } from '@/lib/cms/action'
import { createClient } from '@/lib/supabase/server'
import { requireCap } from '@/lib/auth-guard'

const broadcastSchema = z.object({
  id: z.string().uuid().optional(),
  title: z.string().trim().min(3, 'Judul minimal 3 karakter.').max(150),
  body: z.string().trim().min(5, 'Isi minimal 5 karakter.').max(2000),
  link: z.string().trim().max(300).optional(),
  audience: z.enum(['all', 'role', 'angkatan', 'cell_group']).default('all'),
  audienceValue: z.string().trim().optional(),
  scheduledAt: z.string().optional(),
  reason: z.string().trim().max(300).optional(),
})

const saveBroadcastImpl = cmsAction({
  cap: 'broadcast',
  entity: 'broadcasts',
  action: 'update',
  schema: broadcastSchema,
  load: async ({ id }, db) => {
    if (!id) return { __new: true }
    const { data } = await db
      .from('broadcasts')
      .select('id, title, status')
      .eq('id', id)
      .maybeSingle()
    if (!data) throw new Error('Siaran tidak ditemukan.')
    return data
  },
  run: async (ctx, input, db, before) => {
    const isNew = Boolean((before as { __new?: boolean } | null)?.__new)

    // Sasaran berjenjang wajib punya nilai; 'all' tidak butuh apa pun.
    if (input.audience !== 'all' && !input.audienceValue) {
      throw new Error('Pilih sasaran siaran lebih dulu.')
    }

    const scheduled = input.scheduledAt ? new Date(input.scheduledAt).toISOString() : null

    const payload = {
      title: input.title,
      body: input.body,
      link: input.link || null,
      audience: input.audience,
      audience_value: input.audience === 'all' ? null : input.audienceValue || null,
      scheduled_at: scheduled,
      status: scheduled ? 'scheduled' : 'draft',
      // `created_by` dipakai `send_broadcast` untuk pembatasan laju. Tanpa
      // kolom ini terisi, pemeriksaan "satu siaran per menit" tidak pernah
      // aktif karena tidak ada pengirim yang bisa dicocokkan.
      created_by: ctx.userId,
      updated_at: new Date().toISOString(),
    }

    if (isNew) {
      const { data, error } = await db.from('broadcasts').insert(payload as never).select('id').single()
      if (error) throw new Error(error.message)
      const row = data as unknown as { id: string }
      return { id: row.id, after: payload, data: { id: row.id } }
    }

    // Siaran yang sudah terkirim tidak boleh diubah isinya — riwayat harus
    // mencerminkan apa yang benar-benar diterima anggota.
    const prev = before as { status: string }
    if (prev.status === 'sent') {
      throw new Error('Siaran yang sudah terkirim tidak bisa diubah. Buat siaran baru.')
    }

    const { error } = await db.from('broadcasts').update(payload as never).eq('id', input.id as string)
    if (error) throw new Error(error.message)
    return { id: input.id as string, after: payload, data: { id: input.id as string } }
  },
  revalidate: ['/admin/siaran'],
})

const sendSchema = z.object({
  id: z.string().uuid('ID siaran tidak valid.'),
  reason: z.string().trim().max(300).optional(),
})

const sendBroadcastImpl = cmsAction({
  cap: 'broadcast',
  entity: 'broadcasts',
  action: 'broadcast',
  schema: sendSchema,
  load: async ({ id }, db) => {
    const { data } = await db
      .from('broadcasts')
      .select('id, title, status, recipient_count')
      .eq('id', id)
      .maybeSingle()
    if (!data) throw new Error('Siaran tidak ditemukan.')
    return data
  },
  run: async (_ctx, { id }, db) => {
    const { data, error } = await db.rpc('send_broadcast', { p_broadcast_id: id })
    if (error) throw new Error(error.message)
    const res = data as unknown as { ok: boolean; error?: string; recipients?: number }
    if (!res?.ok) throw new Error(res?.error ?? 'Gagal mengirim siaran.')
    return {
      id,
      after: { status: 'sent', recipient_count: res.recipients ?? 0 },
      data: { recipients: res.recipients ?? 0 },
    }
  },
  revalidate: ['/admin/siaran', '/notification'],
})

const deleteBroadcastImpl = cmsAction({
  cap: 'broadcast',
  entity: 'broadcasts',
  action: 'delete',
  requireReason: true,
  schema: z.object({
    id: z.string().uuid('ID siaran tidak valid.'),
    reason: z.string().trim().min(5, 'Alasan minimal 5 karakter.').max(300),
  }),
  load: async ({ id }, db) => {
    const { data } = await db.from('broadcasts').select('id, title, status').eq('id', id).maybeSingle()
    if (!data) throw new Error('Siaran tidak ditemukan.')
    return data
  },
  run: async (_ctx, { id }, db, before) => {
    const prev = before as { status: string }
    if (prev.status === 'sent') {
      throw new Error('Siaran yang sudah terkirim tidak bisa dihapus — riwayat pengiriman harus tetap ada.')
    }
    const { error } = await db.from('broadcasts').delete().eq('id', id)
    if (error) throw new Error(error.message)
    return { id, after: null, data: { deleted: true } }
  },
  revalidate: ['/admin/siaran'],
})

// ─────────────── TEMPLAT ───────────────
const templateSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(2, 'Nama templat minimal 2 karakter.').max(80),
  title: z.string().trim().min(3, 'Judul minimal 3 karakter.').max(150),
  body: z.string().trim().min(5, 'Isi minimal 5 karakter.').max(2000),
  link: z.string().trim().max(300).optional(),
  reason: z.string().trim().max(300).optional(),
})

const saveTemplateImpl = cmsAction({
  cap: 'broadcast',
  entity: 'broadcast_templates',
  action: 'update',
  schema: templateSchema,
  load: async ({ id }, db) => {
    if (!id) return { __new: true }
    const { data } = await db.from('broadcast_templates').select('id, name').eq('id', id).maybeSingle()
    if (!data) throw new Error('Templat tidak ditemukan.')
    return data
  },
  run: async (_ctx, input, db, before) => {
    const isNew = Boolean((before as { __new?: boolean } | null)?.__new)
    const payload = {
      name: input.name,
      title: input.title,
      body: input.body,
      link: input.link || null,
    }

    if (isNew) {
      const { data, error } = await db
        .from('broadcast_templates')
        .insert(payload as never)
        .select('id')
        .single()
      if (error) {
        if (error.code === '23505') throw new Error('Nama templat itu sudah dipakai.')
        throw new Error(error.message)
      }
      const row = data as unknown as { id: string }
      return { id: row.id, after: payload, data: { id: row.id } }
    }
    const { error } = await db
      .from('broadcast_templates')
      .update(payload as never)
      .eq('id', input.id as string)
    if (error) {
      if (error.code === '23505') throw new Error('Nama templat itu sudah dipakai.')
      throw new Error(error.message)
    }
    return { id: input.id as string, after: payload, data: { id: input.id as string } }
  },
  revalidate: ['/admin/siaran'],
})

const deleteTemplateImpl = cmsAction({
  cap: 'broadcast',
  entity: 'broadcast_templates',
  action: 'delete',
  requireReason: true,
  schema: z.object({
    id: z.string().uuid('ID templat tidak valid.'),
    reason: z.string().trim().min(5, 'Alasan minimal 5 karakter.').max(300),
  }),
  load: async ({ id }, db) => {
    const { data } = await db.from('broadcast_templates').select('id, name').eq('id', id).maybeSingle()
    if (!data) throw new Error('Templat tidak ditemukan.')
    return data
  },
  run: async (_ctx, { id }, db) => {
    const { error } = await db.from('broadcast_templates').delete().eq('id', id)
    if (error) throw new Error(error.message)
    return { id, after: null, data: { deleted: true } }
  },
  revalidate: ['/admin/siaran'],
})

/**
 * Hitung penerima tanpa mengirim. Dipakai UI untuk menampilkan
 * "siaran ini akan sampai ke N orang" SEBELUM tombol kirim ditekan.
 */
export async function countRecipients(
  audience: string,
  value: string | null
): Promise<{ ok: true; count: number } | { ok: false; error: string }> {
  await requireCap('broadcast')
  const supabase = createClient()

  if (audience === 'all') {
    const { count, error } = await supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('is_active', true)
    if (error) return { ok: false, error: error.message }
    return { ok: true, count: count ?? 0 }
  }

  if (!value) return { ok: true, count: 0 }

  if (audience === 'role') {
    const { count, error } = await supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('is_active', true)
      .eq('role', value as never)
    if (error) return { ok: false, error: error.message }
    return { ok: true, count: count ?? 0 }
  }

  if (audience === 'angkatan') {
    const { count, error } = await supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('is_active', true)
      .eq('angkatan', value)
    if (error) return { ok: false, error: error.message }
    return { ok: true, count: count ?? 0 }
  }

  const { count, error } = await supabase
    .from('cell_group_members')
    .select('user_id', { count: 'exact', head: true })
    .eq('group_id', value)
  if (error) return { ok: false, error: error.message }
  return { ok: true, count: count ?? 0 }
}

// ── Pembungkus Server Action ──
export async function saveBroadcast(input: unknown) {
  return saveBroadcastImpl(input)
}
export async function sendBroadcast(input: unknown) {
  return sendBroadcastImpl(input)
}
export async function deleteBroadcast(input: unknown) {
  return deleteBroadcastImpl(input)
}
export async function saveTemplate(input: unknown) {
  return saveTemplateImpl(input)
}
export async function deleteTemplate(input: unknown) {
  return deleteTemplateImpl(input)
}
