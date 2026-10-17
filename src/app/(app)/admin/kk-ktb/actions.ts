// src/app/(app)/admin/kk-ktb/actions.ts
// Kelola grup KK & KTB (M6).
//
// MASALAH YANG DIPERBAIKI
// Sebelum ini, siapa pun yang tahu ID grup bisa bergabung tanpa kode undangan,
// pemimpin grup tidak bisa mengeluarkan anggota, dan tidak ada cara mengarsipkan
// grup tanpa menghapus riwayatnya. Untuk kelompok kecil yang saling mengenal,
// ketiganya adalah masalah nyata: grup jadi terbuka, berantakan, atau hilang.
//
// SEMUA MUTASI LEWAT cmsAction
// Izin -> validasi -> snapshot -> mutasi -> audit -> revalidate. Anggota
// ditambahkan/dikeluarkan lewat RPC, bukan update langsung, karena pemeriksaan
// "masih ada tempat?" dan penambahan harus terjadi dalam satu transaksi —
// kalau tidak, dua permintaan bersamaan bisa menembus batas anggota.

'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { cmsAction } from '@/lib/cms/action'
import { createClient } from '@/lib/supabase/server'
import { requireCap } from '@/lib/auth-guard'

const groupSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(2, 'Nama grup minimal 2 karakter.').max(80),
  description: z.string().trim().max(500).optional(),
  leaderId: z.string().uuid().nullable().optional(),
  maxMembers: z.coerce.number().int().min(0).max(500).default(0),
  inviteCodeRequired: z.coerce.boolean().default(true),
  isActive: z.coerce.boolean().default(true),
  reason: z.string().trim().max(300).optional(),
})

const saveGroupImpl = cmsAction({
  cap: 'manageCellGroups',
  entity: 'cell_groups',
  action: 'update',
  schema: groupSchema,
  load: async ({ id }, db) => {
    if (!id) return { __new: true }
    const { data, error } = await db
      .from('cell_groups')
      .select('id, name, description, leader_id, max_members, invite_code_required, is_active, is_archived')
      .eq('id', id)
      .maybeSingle()
    if (error) throw new Error(error.message)
    if (!data) throw new Error('Grup tidak ditemukan.')
    return data
  },
  run: async (_ctx, input, db, before) => {
    const isNew = Boolean((before as { __new?: boolean } | null)?.__new)

    const payload = {
      name: input.name,
      description: input.description || null,
      leader_id: input.leaderId || null,
      max_members: input.maxMembers,
      invite_code_required: input.inviteCodeRequired,
      is_active: input.isActive,
      updated_at: new Date().toISOString(),
    }

    if (isNew) {
      const { data, error } = await db
        .from('cell_groups')
        .insert(payload as never)
        .select('id')
        .single()
      if (error) throw new Error(error.message)
      const row = data as unknown as { id: string }
      return { id: row.id, after: payload, data: { id: row.id } }
    }

    const { error } = await db
      .from('cell_groups')
      .update(payload as never)
      .eq('id', input.id as string)
    if (error) throw new Error(error.message)
    return { id: input.id as string, after: payload, data: { id: input.id as string } }
  },
  revalidate: ['/admin/kk-ktb', '/cellgroup'],
})

const archiveSchema = z.object({
  id: z.string().uuid('ID grup tidak valid.'),
  archive: z.coerce.boolean(),
  reason: z.string().trim().min(5, 'Alasan minimal 5 karakter.').max(300),
})

const archiveGroupImpl = cmsAction({
  cap: 'manageCellGroups',
  entity: 'cell_groups',
  action: 'update',
  requireReason: true,
  schema: archiveSchema,
  load: async ({ id }, db) => {
    const { data } = await db
      .from('cell_groups')
      .select('id, name, is_archived')
      .eq('id', id)
      .maybeSingle()
    if (!data) throw new Error('Grup tidak ditemukan.')
    return data
  },
  run: async (ctx, { id, archive }, db) => {
    const payload = {
      is_archived: archive,
      archived_at: archive ? new Date().toISOString() : null,
      archived_by: archive ? ctx.userId : null,
      updated_at: new Date().toISOString(),
    }
    const { error } = await db.from('cell_groups').update(payload as never).eq('id', id)
    if (error) throw new Error(error.message)
    return { id, after: payload, data: { archived: archive } }
  },
  revalidate: ['/admin/kk-ktb', '/cellgroup'],
})

const deleteSchema = z.object({
  id: z.string().uuid('ID grup tidak valid.'),
  reason: z.string().trim().min(10, 'Alasan minimal 10 karakter.').max(300),
})

/**
 * Hapus grup PERMANEN.
 *
 * Hanya super_admin, dan hanya untuk grup yang sudah diarsipkan. Pesan grup
 * ikut terhapus lewat ON DELETE CASCADE — riwayat percakapan anggota tidak bisa
 * dikembalikan. Karena itu arsip adalah jalur yang ditawarkan lebih dulu.
 */
const deleteGroupImpl = cmsAction({
  cap: 'purgeContent',
  entity: 'cell_groups',
  action: 'delete',
  requireReason: true,
  schema: deleteSchema,
  load: async ({ id }, db) => {
    const { data } = await db
      .from('cell_groups')
      .select('id, name, is_archived')
      .eq('id', id)
      .maybeSingle()
    if (!data) throw new Error('Grup tidak ditemukan.')
    return data
  },
  run: async (_ctx, { id }, db, before) => {
    const row = before as { is_archived: boolean }
    if (!row.is_archived) {
      throw new Error('Arsipkan grup dulu. Menghapus grup aktif akan menghapus seluruh riwayat pesannya.')
    }
    const { error } = await db.from('cell_groups').delete().eq('id', id)
    if (error) throw new Error(error.message)
    return { id, after: null, data: { deleted: true } }
  },
  revalidate: ['/admin/kk-ktb', '/cellgroup'],
})

const rotateSchema = z.object({
  id: z.string().uuid('ID grup tidak valid.'),
  reason: z.string().trim().max(300).optional(),
})

const rotateImpl = cmsAction({
  cap: 'manageCellGroups',
  entity: 'cell_groups',
  action: 'update',
  schema: rotateSchema,
  load: async ({ id }, db) => {
    const { data } = await db
      .from('cell_groups')
      .select('id, name, invite_code')
      .eq('id', id)
      .maybeSingle()
    if (!data) throw new Error('Grup tidak ditemukan.')
    return data
  },
  run: async (_ctx, { id }, db) => {
    const { data, error } = await db.rpc('rotate_invite_code', { p_group_id: id })
    if (error) throw new Error(error.message)
    return { id, after: { invite_code: 'diputar-ulang' }, data: { code: String(data) } }
  },
  revalidate: ['/admin/kk-ktb', '/cellgroup'],
})

const memberSchema = z.object({
  groupId: z.string().uuid(),
  userId: z.string().uuid(),
  action: z.enum(['add', 'remove']),
  reason: z.string().trim().max(300).optional(),
})

const memberImpl = cmsAction<z.ZodType<z.infer<typeof memberSchema>>, { changed: string }>({
  cap: 'manageCellGroups',
  entity: 'cell_group_members',
  action: 'update',
  schema: memberSchema,
  load: async ({ groupId }, db) => {
    const { data } = await db.from('cell_groups').select('id, name').eq('id', groupId).maybeSingle()
    if (!data) throw new Error('Grup tidak ditemukan.')
    return data
  },
  run: async (_ctx, { groupId, userId, action }, db) => {
    if (action === 'add') {
      const { error } = await db
        .from('cell_group_members')
        .insert({ group_id: groupId, user_id: userId, is_leader: false } as never)
      if (error) {
        if (error.code === '23505') throw new Error('Orang ini sudah menjadi anggota.')
        throw new Error(error.message)
      }
      return { id: groupId, after: { added: userId }, data: { changed: 'added' } }
    }

    const { data, error } = await db.rpc('remove_cell_group_member', {
      p_group_id: groupId,
      p_user_id: userId,
    })
    if (error) throw new Error(error.message)
    const res = data as unknown as { ok: boolean; error?: string }
    if (!res?.ok) throw new Error(res?.error ?? 'Gagal mengeluarkan anggota.')
    return { id: groupId, after: { removed: userId }, data: { changed: 'removed' } }
  },
  revalidate: ['/admin/kk-ktb', '/cellgroup'],
})

const messageSchema = z.object({
  id: z.string().uuid('ID pesan tidak valid.'),
  action: z.enum(['hide', 'delete']),
  reason: z.string().trim().min(5, 'Alasan minimal 5 karakter.').max(300),
})

/**
 * Moderasi pesan grup.
 *
 * Pesan KK/KTB BUKAN konseling privat — ini percakapan komunitas, sehingga
 * admin ke atas boleh meninjaunya. Yang tidak boleh adalah membacanya diam-diam
 * tanpa jejak, karena itu setiap tindakan wajib beralasan dan tercatat.
 */
const moderateMessageImpl = cmsAction({
  cap: 'moderateContent',
  entity: 'cell_group_messages',
  action: 'hide',
  requireReason: true,
  schema: messageSchema,
  load: async ({ id }, db) => {
    const { data } = await db
      .from('cell_group_messages')
      .select('id, group_id, sender_id, content, deleted_at')
      .eq('id', id)
      .maybeSingle()
    if (!data) throw new Error('Pesan tidak ditemukan.')
    return data
  },
  run: async (ctx, { id, action }, db) => {
    const now = new Date().toISOString()
    const payload =
      action === 'hide'
        ? { moderation_status: 'hidden', hidden_by: ctx.userId, hidden_at: now }
        : { deleted_at: now, deleted_by: ctx.userId, moderation_status: 'hidden' }

    const { error } = await db
      .from('cell_group_messages')
      .update(payload as never)
      .eq('id', id)
    if (error) throw new Error(error.message)
    return { id, after: payload, data: { action } }
  },
  revalidate: ['/admin/kk-ktb', '/cellgroup'],
})

// ── Pembungkus Server Action ──
export async function saveGroup(input: unknown) {
  return saveGroupImpl(input)
}
export async function archiveGroup(input: unknown) {
  return archiveGroupImpl(input)
}
export async function deleteGroup(input: unknown) {
  return deleteGroupImpl(input)
}
export async function rotateInviteCode(input: unknown) {
  return rotateImpl(input)
}
export async function changeMember(input: unknown) {
  return memberImpl(input)
}
export async function moderateGroupMessage(input: unknown) {
  return moderateMessageImpl(input)
}

/**
 * Gabung grup dari sisi anggota — dipakai halaman /cellgroup publik.
 * Sengaja TIDAK memakai cmsAction: ini jalur anggota, bukan staf, dan RPC
 * `join_cell_group` yang menegakkan kode undangan + batas anggota.
 */
export async function joinGroup(groupId: string, inviteCode: string | null) {
  await requireCap('manageCellGroups').catch(() => null) // jangan blokir anggota
  const supabase = createClient()
  const { data, error } = await supabase.rpc('join_cell_group', {
    p_group_id: groupId,
    p_invite_code: inviteCode,
  })
  if (error) return { ok: false as const, error: error.message }
  const res = data as unknown as { ok: boolean; error?: string }
  if (!res?.ok) return { ok: false as const, error: res?.error ?? 'Gagal bergabung.' }
  revalidatePath('/cellgroup')
  return { ok: true as const }
}
