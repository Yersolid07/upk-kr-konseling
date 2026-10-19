// src/app/(app)/chat/actions.ts
'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'

/**
 * Mulai percakapan baru.
 *
 * Sebelumnya sesi selalu dibuat dengan `konselor_id: null` dan status
 * `'pending'`, sementara policy INSERT pesan menuntut `status = 'active'` —
 * hasilnya pesan pertama ditolak RLS tanpa pesan yang terlihat, dan sesi tidak
 * pernah punya konselor untuk membalas.
 *
 * Sekarang, bila tidak ada konselor tertentu yang diminta, sesi ditugaskan ke
 * konselor aktif dengan sesi terbuka paling sedikit. Tujuannya bukan keadilan
 * beban kerja, tetapi supaya sesi punya peserta di kedua sisi; tanpa itu tidak
 * ada yang bisa membalas.
 */
export async function createChatSession(konselorId?: string) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { error: 'Anda harus masuk untuk memulai chat.' }

  // Sudah punya sesi terbuka dengan konselor yang sama -> lanjutkan, jangan
  // buat duplikat.
  if (konselorId) {
    const { data: existing } = await supabase
      .from('chat_sessions')
      .select('id')
      .eq('member_id', user.id)
      .eq('konselor_id', konselorId)
      .in('status', ['pending', 'active'])
      .maybeSingle()

    if (existing) {
      redirect(`/chat/${(existing as unknown as { id: string }).id}`)
    }
  }

  let assigned = konselorId ?? null

  if (!assigned) {
    const { data: konselors } = await supabase
      .from('profiles')
      .select('id')
      .eq('role', 'konselor')
      .eq('is_active', true)
      .limit(50)

    const list = (konselors ?? []) as unknown as { id: string }[]
    if (list.length > 0) {
      const { data: open } = await supabase
        .from('chat_sessions')
        .select('konselor_id')
        .in('status', ['pending', 'active'])
        .not('konselor_id', 'is', null)

      const load = new Map<string, number>()
      for (const k of list) load.set(k.id, 0)
      for (const row of (open ?? []) as unknown as { konselor_id: string | null }[]) {
        if (row.konselor_id && load.has(row.konselor_id)) {
          load.set(row.konselor_id, (load.get(row.konselor_id) ?? 0) + 1)
        }
      }
      assigned = Array.from(load.entries()).sort((a, b) => a[1] - b[1])[0][0]
    }
  }

  const { data: newSession, error } = await supabase
    .from('chat_sessions')
    .insert({
      member_id: user.id,
      konselor_id: assigned,
      // Tanpa konselor, sesi tetap 'pending' dan masuk antrean — konselor
      // mengambilnya lewat claim_chat_session().
      status: assigned ? 'active' : 'pending',
      topic: assigned ? 'Konseling Personal' : 'Permintaan Chat Baru',
      // Nilai bawaan kolom lain diisi eksplisit supaya tipe Insert tidak
      // menuntutnya sebagai properti wajib.
      is_anonymous: false,
      member_rating: null,
      member_review: null,
      started_at: assigned ? new Date().toISOString() : null,
      ended_at: null,
    } as never)
    .select('id')
    .single()

  if (error) {
    console.error('createChatSession:', error.message)
    return { error: 'Gagal memulai sesi chat. Coba lagi sebentar.' }
  }

  revalidatePath('/chat')
  redirect(`/chat/${(newSession as unknown as { id: string }).id}`)
}

/**
 * Ambil sesi dari antrean (konselor).
 *
 * Penegakan izin ada di fungsi SQL `claim_chat_session` — bukan di sini.
 * Pemeriksaan di sisi aplikasi bisa dilewati lewat REST langsung.
 */
export async function claimChatSession(sessionId: string) {
  const supabase = createClient()
  // Fungsi baru, belum ada di tipe Database yang di-generate. Cast sempit,
  // bukan menonaktifkan pemeriksaan tipe untuk seluruh klien.
  const { error } = await (supabase.rpc as unknown as (
    fn: string,
    args: Record<string, unknown>
  ) => Promise<{ error: { message: string } | null }>)('claim_chat_session', {
    p_session_id: sessionId,
  })

  if (error) {
    const taken = /diambil|tersedia/i.test(error.message)
    return { error: taken ? 'Sesi sudah diambil konselor lain.' : 'Gagal mengambil sesi.' }
  }

  revalidatePath('/chat')
  redirect(`/chat/${sessionId}`)
}
