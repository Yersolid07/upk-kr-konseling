// src/app/(app)/admin/konseling/actions.ts
// Konseling lanjutan (M7): catatan sesi, alih sesi, break-glass.
//
// TIGA TINGKAT AKSES YANG BERBEDA
//   • Konselor      → membaca & menulis catatan klinis sesi miliknya sendiri.
//   • Admin         → melihat metadata sesi, mengalihkan sesi ke konselor lain.
//   • Super admin   → membuka isi percakapan, WAJIB beralasan, SELALU tercatat.
//
// Pemisahan ini disengaja: "boleh melihat jadwal sesi" tidak sama dengan
// "boleh membaca apa yang diceritakan anggota". Menyatukannya adalah cara
// tercepat membuat orang berhenti mempercayai layanan konseling.

'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { requireCap, getAuthContext } from '@/lib/auth-guard'

// ─────────────── CATATAN SESI (konselor) ───────────────
const noteSchema = z.object({
  sessionId: z.string().uuid('ID sesi tidak valid.'),
  body: z.string().trim().min(1, 'Catatan tidak boleh kosong.').max(8000),
})

/**
 * Catatan klinis memakai klien pengguna biasa, BUKAN `cmsAction`: RLS tabel
 * `session_notes` sudah membatasi ke `konselor_id = auth.uid()`. Menambah
 * lapisan `cmsAction` di sini hanya akan membuat admin bisa menulis catatan
 * konselor lain — persis yang tidak boleh terjadi.
 */
export async function saveSessionNote(input: unknown) {
  const ctx = await getAuthContext()
  if (!ctx) return { error: 'Sesi login berakhir.' }

  const parsed = noteSchema.safeParse(input)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Data tidak valid.' }
  }

  const supabase = createClient()
  const { data: session, error: sErr } = await supabase
    .from('chat_sessions')
    .select('id, konselor_id')
    .eq('id', parsed.data.sessionId)
    .maybeSingle()

  if (sErr || !session) return { error: 'Sesi tidak ditemukan.' }
  const row = session as unknown as { id: string; konselor_id: string | null }

  if (row.konselor_id !== ctx.userId) {
    return { error: 'Catatan hanya bisa ditulis oleh konselor pemegang sesi.' }
  }

  const { error } = await supabase
    .from('session_notes')
    .upsert(
      {
        session_id: parsed.data.sessionId,
        konselor_id: ctx.userId,
        note: parsed.data.body,
        updated_at: new Date().toISOString(),
      } as never,
      { onConflict: 'session_id,konselor_id' }
    )

  if (error) return { error: error.message }
  revalidatePath('/admin/konseling')
  return { message: 'Catatan disimpan.' }
}

// ─────────────── ALIH SESI (admin) ───────────────
const reassignSchema = z.object({
  sessionId: z.string().uuid('ID sesi tidak valid.'),
  newKonselor: z.string().uuid('Pilih konselor tujuan.'),
  reason: z.string().trim().min(5, 'Alasan minimal 5 karakter.').max(300),
})

export async function reassignSession(input: unknown) {
  await requireCap('manageKonseling')
  const parsed = reassignSchema.safeParse(input)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Data tidak valid.' }
  }

  const supabase = createClient()
  const { data, error } = await supabase.rpc('reassign_session', {
    p_session_id: parsed.data.sessionId,
    p_new_konselor: parsed.data.newKonselor,
    p_reason: parsed.data.reason,
  })

  if (error) return { error: error.message }
  const res = data as unknown as { ok: boolean; error?: string }
  if (!res?.ok) return { error: res?.error ?? 'Gagal mengalihkan sesi.' }

  revalidatePath('/admin/konseling')
  return { message: 'Sesi dialihkan.' }
}

// ─────────────── BREAK-GLASS (super admin) ───────────────
const breakGlassSchema = z.object({
  sessionId: z.string().uuid('ID sesi tidak valid.'),
  // Batas 10 karakter ditegakkan juga oleh CHECK di database. Dua lapis
  // disengaja: pesan galat yang jelas di UI, jaminan di penyimpanan.
  reason: z.string().trim().min(10, 'Alasan minimal 10 karakter.').max(500),
})

export async function breakGlassRead(input: unknown) {
  const ctx = await getAuthContext()
  if (!ctx) return { error: 'Sesi login berakhir.' }
  if (ctx.role !== 'super_admin') {
    return { error: 'Hanya super admin yang boleh membuka isi sesi.' }
  }

  const parsed = breakGlassSchema.safeParse(input)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Data tidak valid.' }
  }

  const supabase = createClient()
  const { data, error } = await supabase.rpc('break_glass_open_session', {
    p_session_id: parsed.data.sessionId,
    p_reason: parsed.data.reason,
  })

  if (error) return { error: error.message }
  const res = data as unknown as {
    ok: boolean
    error?: string
    messages: { id: string; sender_id: string; content: string; created_at: string }[]
  }
  if (!res?.ok) return { error: res?.error ?? 'Gagal membuka sesi.' }

  return { message: 'Sesi dibuka.', messages: res.messages ?? [] }
}
