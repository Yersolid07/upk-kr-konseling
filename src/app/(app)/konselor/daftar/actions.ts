// src/app/(app)/konselor/daftar/actions.ts
'use server'

// Pengajuan menjadi konselor. Anggota mengirim pengajuan -> admin meninjau ->
// bila disetujui, trigger handle_konselor_approval() di DB otomatis menaikkan
// peran menjadi 'konselor' dan membuat profil konselor.

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { requireAuth, guarded } from '@/lib/auth-guard'

function str(fd: FormData, key: string): string {
  return String(fd.get(key) ?? '').trim()
}

export async function submitKonselorApplication(formData: FormData) {
  return guarded(async () => {
    const ctx = await requireAuth()

    // Admin/super admin tidak perlu mengajukan.
    if (ctx.role === 'admin' || ctx.role === 'super_admin' || ctx.role === 'konselor') {
      return { error: 'Kamu sudah memiliki akses konselor.' }
    }

    const motivation = str(formData, 'motivation')
    const experience = str(formData, 'experience')
    const availabilityNote = str(formData, 'availability_note')
    const credentialUrl = str(formData, 'credential_url')

    if (motivation.length < 50) {
      return { error: 'Ceritakan motivasimu minimal 50 karakter agar dapat dinilai dengan adil.' }
    }

    const specialization = formData
      .getAll('specialization')
      .map((s) => String(s).trim())
      .filter(Boolean)

    const supabase = createClient()

    // Cegah pengajuan ganda yang masih aktif.
    const { data: existing } = await supabase
      .from('konselor_applications')
      .select('id, status')
      .eq('user_id', ctx.userId)
      .in('status', ['pending', 'under_review'])
      .maybeSingle()

    if (existing) {
      return { error: 'Kamu sudah punya pengajuan yang sedang ditinjau.' }
    }

    const { error } = await supabase.from('konselor_applications').insert({
      user_id: ctx.userId,
      motivation,
      experience: experience || null,
      credential_url: credentialUrl || null,
      specialization,
      availability_note: availabilityNote || null,
      status: 'pending',
    })

    if (error) {
      console.error('[submitKonselorApplication]', error)
      return { error: 'Gagal mengirim pengajuan. Silakan coba lagi.' }
    }

    // Beri tahu admin.
    const { data: admins } = await supabase
      .from('profiles')
      .select('id')
      .in('role', ['admin', 'super_admin'])

    if (admins && admins.length > 0) {
      await supabase.from('notifications').insert(
        (admins as { id: string }[]).map((a) => ({
          user_id: a.id,
          type: 'system',
          title: 'Pengajuan Konselor Baru',
          body: `${ctx.profile.full_name} mengajukan diri sebagai konselor.`,
          link: '/admin/konselor',
        }))
      )
    }

    await supabase.rpc('log_audit', {
      p_action: 'create',
      p_entity: 'konselor_applications',
      p_entity_id: ctx.userId,
      p_detail: { specialization },
    })

    revalidatePath('/konselor/daftar')
    revalidatePath('/admin/konselor')
    return { success: 'Pengajuan terkirim. Kamu akan mendapat notifikasi setelah ditinjau admin.' }
  })
}

/** Tarik pengajuan selama belum diputuskan. */
export async function withdrawApplication(formData: FormData) {
  return guarded(async () => {
    const ctx = await requireAuth()
    const id = str(formData, 'id')
    if (!id) return { error: 'Pengajuan tidak ditemukan.' }

    const supabase = createClient()
    const { error } = await supabase
      .from('konselor_applications')
      .update({ status: 'withdrawn' })
      .eq('id', id)
      .eq('user_id', ctx.userId) // hanya milik sendiri
      .in('status', ['pending', 'under_review'])

    if (error) return { error: `Gagal menarik pengajuan: ${error.message}` }

    revalidatePath('/konselor/daftar')
    return { success: 'Pengajuan ditarik. Kamu bisa mengajukan lagi kapan saja.' }
  })
}
