// src/app/(app)/admin/konselor/actions.ts
'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { requireCap, guarded } from '@/lib/auth-guard'

function str(fd: FormData, key: string): string {
  return String(fd.get(key) ?? '').trim()
}

/**
 * Tetapkan keputusan atas pengajuan konselor.
 *
 * Efek samping (ubah peran + buat profil konselor + notifikasi + audit) dijalankan
 * oleh trigger handle_konselor_approval() di database, sehingga konsisten walau
 * status diubah dari jalur mana pun.
 */
export async function decideApplication(formData: FormData) {
  return guarded(async () => {
    const ctx = await requireCap('approveKonselor')

    const id = str(formData, 'id')
    const decision = str(formData, 'decision') // 'approved' | 'rejected' | 'under_review'
    const notes = str(formData, 'review_notes')

    if (!id) return { error: 'Pengajuan tidak ditemukan.' }
    if (!['approved', 'rejected', 'under_review'].includes(decision)) {
      return { error: 'Keputusan tidak valid.' }
    }
    if (decision === 'rejected' && !notes) {
      return { error: 'Isi alasan agar pelamar tahu apa yang perlu diperbaiki.' }
    }

    const supabase = createClient()
    const { error } = await supabase
      .from('konselor_applications')
      .update({
        status: decision,
        review_notes: notes || null,
        reviewed_by: ctx.userId,
        reviewed_at: new Date().toISOString(),
      } as never)
      .eq('id', id)

    if (error) return { error: `Gagal menyimpan keputusan: ${error.message}` }

    revalidatePath('/admin/konselor')
    revalidatePath('/konselor')
    revalidatePath('/booking')

    const msg =
      decision === 'approved'
        ? 'Pengajuan disetujui. Peran pengguna kini konselor.'
        : decision === 'rejected'
          ? 'Pengajuan ditolak dan catatan dikirim ke pelamar.'
          : 'Pengajuan ditandai sedang ditinjau.'
    return { success: msg }
  })
}
