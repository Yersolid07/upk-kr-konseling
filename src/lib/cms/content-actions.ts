// src/lib/cms/content-actions.ts
// Aksi moderasi bersama untuk semua tabel konten.
//
// DIPAKAI OLEH: modul Forum, Prayer, Artikel, KK/KTB, Laporan.
//
// SEMUA tabel konten berbagi kolom moderasi yang sama (dibuat
// supabase/cms-superadmin.sql): moderation_status, hidden_by, hidden_reason,
// deleted_at, deleted_by, delete_reason. Karena itu aksinya juga ditulis satu
// kali di sini, bukan diulang di tiap modul — supaya tidak ada modul yang
// lupa mencatat audit atau lupa memeriksa izin.
//
// TIGA TINGKAT TINDAKAN:
//   sembunyikan  — moderation_status = 'hidden'  (reversibel, konten masih ada)
//   tempat sampah — deleted_at diisi             (reversibel)
//   hapus permanen — DELETE baris                 (TIDAK bisa dibatalkan, super_admin)

'use server'

import { z } from 'zod'
import { cmsAction } from './action'
import { CONTENT_TABLE_NAMES, CONTENT_TABLES, type ContentTable } from './content-tables'
import type { Capability } from '@/lib/rbac'

/** Nama tabel dari input pengguna — hanya yang ada di allowlist yang lolos. */
const tableSchema = z.enum(
  CONTENT_TABLE_NAMES as [ContentTable, ...ContentTable[]]
)

const idSchema = z.object({
  table: tableSchema,
  id: z.string().uuid('ID tidak valid.'),
})

const reasonSchema = z.object({
  table: tableSchema,
  id: z.string().uuid('ID tidak valid.'),
  reason: z.string().trim().min(5, 'Alasan minimal 5 karakter.').max(500),
})

// ─────────────────────────────────────────────────────────────
// Sembunyikan / tampilkan kembali
// ─────────────────────────────────────────────────────────────

const hideContentImpl = cmsAction({
  cap: 'softDeleteContent' as Capability,
  entity: 'content',
  action: 'hide',
  requireReason: true,
  schema: reasonSchema,
  load: async ({ table, id }, db) => {
    const { data, error } = await db
      .from(table)
      .select('id, moderation_status, deleted_at')
      .eq('id', id)
      .maybeSingle()
    if (error) throw new Error(error.message)
    return data ?? undefined
  },
  run: async (ctx, { table, id, reason }, db) => {
    const { error } = await db
      .from(table)
      .update({
        moderation_status: 'hidden',
        hidden_by: ctx.userId,
        hidden_reason: reason,
        hidden_at: new Date().toISOString(),
      } as never)
      .eq('id', id)
    if (error) throw new Error(error.message)
    return { id, after: { moderation_status: 'hidden' }, data: { id } }
  },
  revalidate: ['/admin/forum', '/admin/prayer', '/forum', '/prayer'],
})

const unhideContentImpl = cmsAction({
  cap: 'restoreContent' as Capability,
  entity: 'content',
  action: 'unhide',
  schema: idSchema,
  load: async ({ table, id }, db) => {
    const { data, error } = await db
      .from(table)
      .select('id, moderation_status')
      .eq('id', id)
      .maybeSingle()
    if (error) throw new Error(error.message)
    return data ?? undefined
  },
  run: async (_ctx, { table, id }, db) => {
    const { error } = await db
      .from(table)
      .update({
        moderation_status: 'visible',
        hidden_by: null,
        hidden_reason: null,
        hidden_at: null,
      } as never)
      .eq('id', id)
    if (error) throw new Error(error.message)
    return { id, after: { moderation_status: 'visible' }, data: { id } }
  },
  revalidate: ['/admin/forum', '/admin/prayer', '/forum', '/prayer'],
})

// ─────────────────────────────────────────────────────────────
// Tempat sampah (soft delete) — bisa dipulihkan
// ─────────────────────────────────────────────────────────────

const trashContentImpl = cmsAction({
  cap: 'softDeleteContent' as Capability,
  entity: 'content',
  action: 'delete',
  requireReason: true,
  schema: reasonSchema,
  load: async ({ table, id }, db) => {
    const { data, error } = await db
      .from(table)
      .select('id, deleted_at')
      .eq('id', id)
      .maybeSingle()
    if (error) throw new Error(error.message)
    // Sudah di tempat sampah: tolak supaya deleted_by/delete_reason yang asli
    // tidak tertimpa dan jejak siapa yang menghapus pertama tetap utuh.
    if (data && (data as { deleted_at: string | null }).deleted_at) {
      throw new Error('Konten ini sudah ada di tempat sampah.')
    }
    return data ?? undefined
  },
  run: async (ctx, { table, id, reason }, db) => {
    const now = new Date().toISOString()
    const { error } = await db
      .from(table)
      .update({
        deleted_at: now,
        deleted_by: ctx.userId,
        delete_reason: reason,
        moderation_status: 'hidden',
      } as never)
      .eq('id', id)
    if (error) throw new Error(error.message)
    return { id, after: { deleted_at: now }, data: { id } }
  },
  revalidate: ['/admin/forum', '/admin/prayer', '/admin/trash', '/forum', '/prayer'],
})

const restoreContentImpl = cmsAction({
  cap: 'restoreContent' as Capability,
  entity: 'content',
  action: 'restore',
  schema: idSchema,
  load: async ({ table, id }, db) => {
    const { data, error } = await db
      .from(table)
      .select('id, deleted_at')
      .eq('id', id)
      .maybeSingle()
    if (error) throw new Error(error.message)
    if (data && !(data as { deleted_at: string | null }).deleted_at) {
      throw new Error('Konten ini tidak ada di tempat sampah.')
    }
    return data ?? undefined
  },
  run: async (_ctx, { table, id }, db) => {
    const { error } = await db
      .from(table)
      .update({
        deleted_at: null,
        deleted_by: null,
        delete_reason: null,
        moderation_status: 'visible',
      } as never)
      .eq('id', id)
    if (error) throw new Error(error.message)
    return { id, after: { deleted_at: null }, data: { id } }
  },
  revalidate: ['/admin/forum', '/admin/prayer', '/admin/trash', '/forum', '/prayer'],
})

// ─────────────────────────────────────────────────────────────
// Hapus PERMANEN — hanya super_admin, tidak bisa dibatalkan
// ─────────────────────────────────────────────────────────────

const purgeContentImpl = cmsAction({
  cap: 'purgeContent' as Capability,
  entity: 'content',
  action: 'purge',
  requireReason: true,
  schema: reasonSchema,
  load: async ({ table, id }, db) => {
    const { data, error } = await db
      .from(table)
      .select('id, deleted_at')
      .eq('id', id)
      .maybeSingle()
    if (error) throw new Error(error.message)
    if (!data) return undefined
    // Pagar pengaman: hapus permanen HANYA untuk isi tempat sampah. Tanpa ini,
    // satu klik salah bisa menghancurkan konten yang masih hidup.
    if (!(data as { deleted_at: string | null }).deleted_at) {
      throw new Error(
        'Hapus permanen hanya berlaku untuk konten yang sudah ada di tempat sampah.'
      )
    }
    return data
  },
  run: async (_ctx, { table, id }, db) => {
    const { error } = await db.from(table).delete().eq('id', id)
    if (error) throw new Error(error.message)
    return { id, after: { purged: true }, data: { id } }
  },
  revalidate: ['/admin/trash', '/forum', '/prayer'],
})

// ─────────────────────────────────────────────────────────────
// Tandai / lepas tanda (flag) — dipakai tombol "Tandai" pada konten
// ─────────────────────────────────────────────────────────────

const flagContentImpl = cmsAction({
  cap: 'moderateContent' as Capability,
  entity: 'content',
  action: 'update',
  requireReason: true,
  schema: reasonSchema,
  load: async ({ table, id }, db) => {
    const { data, error } = await db
      .from(table)
      .select('id, is_flagged')
      .eq('id', id)
      .maybeSingle()
    if (error) throw new Error(error.message)
    return data ?? undefined
  },
  run: async (_ctx, { table, id, reason }, db) => {
    const { error } = await db
      .from(table)
      .update({ is_flagged: true, hidden_reason: reason } as never)
      .eq('id', id)
    if (error) throw new Error(error.message)
    return { id, after: { is_flagged: true }, data: { id } }
  },
  revalidate: ['/admin/forum', '/admin/prayer'],
})

// ─────────────────────────────────────────────────────────────
// Pembungkus Server Action
//
// Berkas ber-'use server' hanya boleh mengekspor fungsi async, jadi tiap
// aksi di atas dibungkus eksplisit. Tipenya tetap longgar (unknown) karena
// pemanggil boleh mengirim objek biasa maupun FormData.
// ─────────────────────────────────────────────────────────────

export async function hideContent(input: unknown) {
  return hideContentImpl(input)
}

export async function unhideContent(input: unknown) {
  return unhideContentImpl(input)
}

export async function trashContent(input: unknown) {
  return trashContentImpl(input)
}

export async function restoreContent(input: unknown) {
  return restoreContentImpl(input)
}

export async function purgeContent(input: unknown) {
  return purgeContentImpl(input)
}

export async function flagContent(input: unknown) {
  return flagContentImpl(input)
}

