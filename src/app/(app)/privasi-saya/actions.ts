// src/app/(app)/privasi-saya/actions.ts
// Permintaan data oleh anggota sendiri (M13).
//
// RLS `data_requests_insert_own` sudah memaksa `user_id = auth.uid()`. Tetap
// diperiksa di sini supaya pesan galatnya jelas — bukan "new row violates
// row-level security policy".

'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getAuthContext } from '@/lib/auth-guard'

const schema = z.object({
  kind: z.enum(['export', 'delete']),
  note: z.string().trim().max(500).optional(),
})

export async function requestMyData(input: unknown) {
  const ctx = await getAuthContext()
  if (!ctx) return { error: 'Sesi login berakhir.' }

  const parsed = schema.safeParse(input)
  if (!parsed.success) return { error: 'Permintaan tidak valid.' }

  const supabase = createClient()

  // Satu permintaan aktif per jenis. Tanpa ini, satu klik ganda membuat
  // antrean admin penuh dengan permintaan yang sama.
  const { data: existing } = await supabase
    .from('data_requests')
    .select('id')
    .eq('user_id', ctx.userId)
    .eq('kind', parsed.data.kind)
    .in('status', ['pending', 'processing'])
    .maybeSingle()

  if (existing) {
    return { error: 'Permintaan serupa masih diproses. Tunggu kabar dari admin.' }
  }

  const { error } = await supabase.from('data_requests').insert({
    user_id: ctx.userId,
    kind: parsed.data.kind,
    status: 'pending',
    note: parsed.data.note || null,
  } as never)

  if (error) {
    if (error.code === '42P01') {
      return { error: 'Fitur ini belum aktif. Hubungi pengurus.' }
    }
    return { error: error.message }
  }

  revalidatePath('/privasi-saya')
  return { message: 'Permintaan terkirim. Admin akan menghubungi Anda.' }
}
