// src/app/(app)/konselor/actions.ts
// Tindakan konselor atas janji temu.
//
// Sebelum ini tombol "Konfirmasi" dan "Tolak" di dashboard konselor tidak
// punya handler sama sekali — tampak berfungsi, tidak melakukan apa pun. Itu
// lebih buruk daripada tombol yang tidak ada: anggota menunggu konfirmasi yang
// tidak akan pernah datang.

'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getAuthContext } from '@/lib/auth-guard'
import { hasMinRole } from '@/lib/rbac'

const decideSchema = z.object({
  bookingId: z.string().uuid('ID janji temu tidak valid.'),
  decision: z.enum(['confirmed', 'cancelled', 'completed']),
  reason: z.string().trim().max(300).optional(),
})

export async function decideBooking(input: unknown) {
  const ctx = await getAuthContext()
  if (!ctx) return { error: 'Sesi login berakhir.' }
  if (!hasMinRole(ctx.role, 'konselor')) {
    return { error: 'Hanya konselor yang boleh menanggapi janji temu.' }
  }

  const parsed = decideSchema.safeParse(input)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Data tidak valid.' }
  }

  const supabase = createClient()

  // Ambil baris lebih dulu: butuh pemiliknya untuk memutuskan hak, dan butuh
  // data lama untuk memberi tahu anggota.
  const { data: row, error: readErr } = await supabase
    .from('bookings')
    .select('id, member_id, konselor_id, scheduled_at, topic, status')
    .eq('id', parsed.data.bookingId)
    .maybeSingle()

  if (readErr) return { error: readErr.message }
  if (!row) return { error: 'Janji temu tidak ditemukan.' }

  const b = row as unknown as {
    id: string
    member_id: string
    konselor_id: string
    scheduled_at: string
    topic: string | null
    status: string
  }

  // Hanya konselor pemilik jadwal, atau admin ke atas, yang boleh memutuskan.
  if (b.konselor_id !== ctx.userId && !hasMinRole(ctx.role, 'admin')) {
    return { error: 'Ini bukan jadwal Anda.' }
  }

  if (b.status !== 'pending' && parsed.data.decision !== 'completed') {
    return { error: 'Janji ini sudah ditanggapi.' }
  }

  if (parsed.data.decision === 'cancelled' && (parsed.data.reason ?? '').trim().length < 5) {
    return { error: 'Alasan pembatalan minimal 5 karakter.' }
  }

  const { error } = await supabase
    .from('bookings')
    .update({
      status: parsed.data.decision,
      cancel_reason: parsed.data.decision === 'cancelled' ? parsed.data.reason : null,
      cancelled_by: parsed.data.decision === 'cancelled' ? ctx.userId : null,
      updated_at: new Date().toISOString(),
    } as never)
    .eq('id', b.id)

  if (error) return { error: error.message }

  // Notifikasi ke anggota. Kegagalan di sini tidak membatalkan keputusan —
  // jadwal sudah berubah dan itu yang utama.
  const when = new Date(b.scheduled_at).toLocaleString('id-ID', {
    dateStyle: 'long',
    timeStyle: 'short',
  })
  const title =
    parsed.data.decision === 'confirmed'
      ? 'Janji temu dikonfirmasi'
      : parsed.data.decision === 'cancelled'
        ? 'Janji temu dibatalkan'
        : 'Sesi konseling selesai'
  const body =
    parsed.data.decision === 'cancelled'
      ? `${when} — ${parsed.data.reason}`
      : `${when}${b.topic ? ` · ${b.topic}` : ''}`

  // `notify_booking_member` hanya bisa menyentuh anggota dari janji temu yang
  // benar-benar milik pemanggil — `notify_user` menolak konselor, dan membukanya
  // untuk semua konselor akan terlalu luas.
  await supabase.rpc('notify_booking_member', {
    p_booking_id: b.id,
    p_title: title,
    p_body: body,
  })

  revalidatePath('/konselor')
  revalidatePath('/booking')
  return { message: 'Janji temu diperbarui.' }
}
