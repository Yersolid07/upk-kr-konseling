// src/app/(app)/admin/prayer/review-actions.ts
// Antrean persetujuan permohonan doa (M4).
//
// AKTIF HANYA BILA `prayer_requires_approval` dinyalakan. Saat itu, doa baru
// tersimpan sebagai `moderation_status = 'pending'` dan tidak tampil di dinding
// doa sampai disetujui.
//
// Kenapa perlu: dinding doa adalah tempat paling mudah dipakai untuk spam dan
// pesan bernada menyerang, dan isinya sering menyebut orang lain secara
// spesifik. Meninjau dulu masuk akal untuk komunitas sebesar ini.

'use server'

import { z } from 'zod'
import { cmsAction } from '@/lib/cms/action'

const reviewSchema = z.object({
  id: z.string().uuid('ID tidak valid.'),
  decision: z.enum(['approve', 'reject']),
  note: z.string().trim().max(300).optional(),
})

const reviewImpl = cmsAction({
  cap: 'moderateContent',
  entity: 'prayer_requests',
  action: 'approve',
  schema: reviewSchema,
  load: async ({ id }, db) => {
    const { data, error } = await db
      .from('prayer_requests')
      .select('id, content, author_id, moderation_status')
      .eq('id', id)
      .maybeSingle()
    if (error) throw new Error(error.message)
    if (!data) throw new Error('Permohonan doa tidak ditemukan.')
    return data
  },
  run: async (ctx, { id, decision, note }, db, before) => {
    const row = before as { moderation_status: string; author_id: string; content: string }
    if (row.moderation_status !== 'pending') {
      throw new Error('Permohonan ini sudah ditinjau sebelumnya.')
    }

    const { error } = await db
      .from('prayer_requests')
      .update({
        moderation_status: decision === 'approve' ? 'visible' : 'rejected',
        hidden_reason: decision === 'reject' ? (note || 'Tidak sesuai ketentuan komunitas.') : null,
        hidden_by: decision === 'reject' ? ctx.userId : null,
        hidden_at: decision === 'reject' ? new Date().toISOString() : null,
      } as never)
      .eq('id', id)
    if (error) throw new Error(error.message)

    // Beri tahu penulis. Untuk doa anonim, notifikasinya tetap sampai ke akun
    // yang benar — identitasnya tidak pernah ditampilkan di UI mana pun.
    try {
      await db.rpc('notify_user', {
        p_user_id: row.author_id,
        p_type: 'system',
        p_title: decision === 'approve' ? 'Permohonan doa tampil' : 'Permohonan doa belum bisa tampil',
        p_body:
          decision === 'approve'
            ? 'Permohonan doamu sudah tampil di dinding doa. Anggota lain bisa ikut mendoakan.'
            : note || 'Permohonan doamu belum bisa ditampilkan karena tidak sesuai ketentuan komunitas.',
        p_link: '/prayer',
      })
    } catch (e) {
      console.error('[reviewPrayer] notifikasi gagal', e)
    }

    return {
      id,
      after: { moderation_status: decision === 'approve' ? 'visible' : 'rejected' },
      data: { decision },
    }
  },
  revalidate: ['/admin/prayer', '/prayer'],
})

export async function reviewPrayer(input: unknown) {
  return reviewImpl(input)
}
