// src/app/(app)/admin/sampah/purge-actions.ts
// Bersihkan tempat sampah yang sudah kedaluwarsa (job pembersih M).
//
// Menghapus PERMANEN. Karena itu hanya super_admin, dan tombolnya meminta
// konfirmasi bertingkat. Fungsi database sendiri menolak pemanggil yang bukan
// super admin, jadi UI yang salah tidak bisa menjadi jalan pintas.
//
// Kenapa perlu tombol manual, bukan hanya cron: Supabase free tier tidak
// menyediakan penjadwal. Tombol ini memberi admin kendali tanpa bergantung
// pada layanan tambahan, dan hasilnya (berapa baris per tabel) bisa dilihat
// langsung.

'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { requireCap } from '@/lib/auth-guard'
import { getSetting } from '@/lib/settings/get'

const schema = z.object({
  /** Kosongkan untuk memakai pengaturan trash_retention_days. */
  days: z.coerce.number().int().min(1).max(365).optional(),
  reason: z.string().trim().min(5, 'Alasan minimal 5 karakter.').max(300),
})

export type PurgeResult =
  | { ok: true; deleted: { table: string; count: number }[]; total: number }
  | { ok: false; error: string }

export async function purgeExpiredTrash(raw: unknown): Promise<PurgeResult> {
  const parsed = schema.safeParse(raw)
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Data tidak valid.' }
  }

  try {
    await requireCap('purgeContent')
    const supabase = createClient()

    const days = parsed.data.days ?? Number(await getSetting('trash_retention_days'))

    const { data, error } = await supabase.rpc('purge_expired_trash', {
      p_days: days,
    })
    if (error) return { ok: false, error: error.message }

    const rows = (data ?? []) as { table_name: string; deleted_count: number }[]
    const deleted = rows.map((r) => ({ table: r.table_name, count: Number(r.deleted_count) }))
    const total = deleted.reduce((sum, d) => sum + d.count, 0)

    // Audit — pembersihan massal adalah tindakan paling merusak di konsol,
    // jadi harus punya jejak yang menyebut jumlah persisnya.
    try {
      await supabase.rpc('log_audit_v2', {
        p_action: 'purge',
        p_entity: 'trash',
        p_entity_id: null,
        p_before: null,
        p_after: { retention_days: days, deleted } as never,
        p_reason: parsed.data.reason,
        p_ip: null,
        p_ua: null,
      })
    } catch (e) {
      console.error('[purgeExpiredTrash] audit gagal', e)
    }

    revalidatePath('/admin/sampah')
    revalidatePath('/admin')
    return { ok: true, deleted, total }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Terjadi kesalahan.' }
  }
}
