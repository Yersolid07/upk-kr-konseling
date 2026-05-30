// src/app/auth/actions.ts
'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'

// Note: login is now handled via /api/auth/login Route Handler to avoid Next.js Server Action cookie issues.
export async function register(formData: FormData) {
  const supabase = createClient()

  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const full_name = formData.get('full_name') as string
  const angkatan = formData.get('angkatan') as string
  const jurusan = formData.get('jurusan') as string

  // Only 'member' role on register — konselor assigned by admin
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name,
        angkatan,
        jurusan,
        role: 'member', // HARDCODED — cannot be overridden
      },
      emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`,
    },
  })

  if (error) {
    console.error('Registration error:', error.message, error)
    if (error.message.includes('already registered')) {
      return { error: 'Email ini sudah terdaftar. Silakan masuk.' }
    }
    if (error.message.includes('Database error')) {
      return { error: 'Gagal membuat akun. Pastikan database trigger sudah dikonfigurasi. Hubungi admin.' }
    }
    if (error.message.includes('password')) {
      return { error: 'Password minimal 6 karakter.' }
    }
    return { error: error.message }
  }

  return { success: 'Akun berhasil dibuat! Cek email kamu untuk verifikasi.' }
}

export async function logout() {
  const supabase = createClient()
  await supabase.auth.signOut()
  redirect('/auth/login')
}

export async function forgotPassword(formData: FormData) {
  const supabase = createClient()
  const email = formData.get('email') as string

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback?next=/auth/reset-password`,
  })

  if (error) return { error: 'Gagal mengirim email reset. Coba lagi.' }
  return { success: 'Email reset password sudah dikirim. Cek inbox kamu.' }
}

export async function updatePassword(formData: FormData) {
  const supabase = createClient()
  const password = formData.get('password') as string

  if (password.length < 6) {
    return { error: 'Password minimal 6 karakter.' }
  }

  const { error } = await supabase.auth.updateUser({ password })

  if (error) {
    return { error: 'Gagal mengubah password. Silakan coba lagi.' }
  }

  revalidatePath('/', 'layout')
  redirect('/dashboard')
}
