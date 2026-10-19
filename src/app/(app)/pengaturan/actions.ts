// src/app/(app)/pengaturan/actions.ts
'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

/**
 * Perbarui profil sendiri.
 *
 * Kolom yang boleh diubah sengaja dibatasi di sini DAN di trigger
 * `protect_profile_columns` — role, is_verified, is_active tidak bisa
 * dinaikkan sendiri lewat jalur mana pun.
 */

const ProfileSchema = z.object({
  full_name: z.string().trim().min(2, 'Nama minimal 2 karakter').max(80, 'Nama terlalu panjang'),
  display_name: z.string().trim().max(40, 'Nama tampilan maksimal 40 karakter').optional(),
  bio: z.string().trim().max(500, 'Bio maksimal 500 karakter').optional(),
  angkatan: z.string().trim().max(4).optional(),
  jurusan: z.string().trim().max(80).optional(),
})

export async function updateProfile(input: unknown) {
  const parsed = ProfileSchema.safeParse(input)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Data tidak valid.' }
  }

  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Sesi berakhir. Masuk kembali.' }

  const { error } = await supabase
    .from('profiles')
    .update({
      full_name: parsed.data.full_name,
      display_name: parsed.data.display_name || null,
      bio: parsed.data.bio || null,
      angkatan: parsed.data.angkatan || null,
      jurusan: parsed.data.jurusan || null,
    })
    .eq('id', user.id)

  if (error) {
    console.error('updateProfile:', error.message)
    return { error: 'Gagal menyimpan profil.' }
  }

  revalidatePath('/', 'layout')
  return { ok: true }
}

/** Ubah kata sandi. Kata sandi lama diverifikasi lebih dulu. */
export async function changePassword(input: unknown) {
  const parsed = z
    .object({
      current: z.string().min(1, 'Kata sandi lama wajib diisi'),
      next: z.string().min(8, 'Kata sandi baru minimal 8 karakter'),
    })
    .safeParse(input)

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Data tidak valid.' }
  }

  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user?.email) return { error: 'Sesi berakhir. Masuk kembali.' }

  // Verifikasi kata sandi lama dengan percobaan masuk ulang. Tanpa langkah ini,
  // siapa pun yang memegang sesi terbuka bisa mengganti kata sandi dan mengunci
  // pemiliknya di luar akunnya sendiri.
  const { error: verifyError } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: parsed.data.current,
  })

  if (verifyError) {
    return { error: 'Kata sandi lama tidak cocok.' }
  }

  const { error } = await supabase.auth.updateUser({ password: parsed.data.next })
  if (error) {
    if (/same|different/i.test(error.message)) {
      return { error: 'Kata sandi baru harus berbeda dari yang lama.' }
    }
    console.error('changePassword:', error.message)
    return { error: 'Gagal mengubah kata sandi.' }
  }

  return { ok: true }
}

/**
 * Hapus akun sendiri.
 *
 * Bukan penghapusan langsung: data konseling dan doa terhubung ke profil, dan
 * menghapus baris profil akan memutus riwayat yang mungkin dibutuhkan pemilik
 * akun. Yang dilakukan adalah menonaktifkan akun dan mengeluarkan sesi.
 * Penghapusan permanen tetap wewenang admin lewat panel pengguna.
 */
export async function deactivateMyAccount() {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Sesi berakhir.' }

  const { error } = await supabase
    .from('profiles')
    .update({ is_active: false })
    .eq('id', user.id)

  if (error) {
    console.error('deactivate:', error.message)
    return { error: 'Gagal menonaktifkan akun.' }
  }

  await supabase.auth.signOut()
  return { ok: true }
}

/** Keluar dari semua perangkat lain. */
export async function signOutEverywhere() {
  const supabase = createClient()
  const { error } = await supabase.auth.signOut({ scope: 'others' })
  if (error) return { error: 'Gagal mengeluarkan sesi lain.' }
  return { ok: true }
}
