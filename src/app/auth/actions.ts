// src/app/auth/actions.ts
'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { appUrl } from '@/lib/app-url'

// Note: login is now handled via /api/auth/login Route Handler to avoid Next.js Server Action cookie issues.
export async function register(formData: FormData) {
  const supabase = createClient()

  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const full_name = formData.get('full_name') as string
  const angkatan = formData.get('angkatan') as string
  const jurusan = formData.get('jurusan') as string

  // Only 'member' role on register — konselor assigned by admin
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name,
        angkatan,
        jurusan,
        role: 'member', // HARDCODED — cannot be overridden
      },
      emailRedirectTo: `${await appUrl()}/auth/callback`,
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

  // ── Email yang sudah terdaftar ──
  //
  // Supabase TIDAK mengembalikan error untuk email yang sudah ada. Ia
  // mengembalikan 200 dengan objek user yang `identities`-nya KOSONG. Ini
  // disengaja di sisi mereka (mencegah penyerang menebak email mana yang
  // terdaftar), tetapi kalau diteruskan begitu saja ke pengguna hasilnya
  // membingungkan:
  //
  //   * layar menampilkan "Berhasil! Cek email kamu untuk verifikasi"
  //   * tidak ada email yang dikirim
  //   * pengguna mengira pendaftaran sukses, lalu bingung saat masuk dan
  //     mendapati dirinya di akun LAMA
  //
  // Di sini kita memilih kejelasan: beri tahu bahwa email sudah terdaftar dan
  // arahkan ke halaman masuk. Pertukaran privasi-vs-kejelasan ini sudah
  // diterima — platform ini komunitas alumni tertutup, bukan layanan publik
  // yang perlu menyembunyikan daftar anggotanya.
  const identities = data?.user?.identities
  if (data?.user && Array.isArray(identities) && identities.length === 0) {
    return {
      error:
        'Email ini sudah terdaftar. Silakan masuk, atau gunakan "Lupa password" bila tidak ingat kata sandinya.',
    }
  }

  // Bila konfirmasi email dimatikan di Supabase, sesi langsung aktif dan
  // pengguna tidak perlu menunggu apa pun.
  if (data?.session) {
    return { success: 'Akun berhasil dibuat dan langsung aktif. Silakan masuk.' }
  }

  return {
    success:
      'Akun berhasil dibuat. Kami mengirim tautan verifikasi ke email kamu — buka tautan itu untuk mengaktifkan akun.',
  }
}

export async function logout() {
  const supabase = createClient()
  await supabase.auth.signOut()
  redirect('/auth/login')
}

export async function forgotPassword(formData: FormData) {
  const supabase = createClient()
  const email = (formData.get('email') as string).trim().toLowerCase()

  if (!email.includes('@')) {
    return { error: 'Masukkan alamat email yang valid.' }
  }

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${await appUrl()}/auth/callback?next=/auth/reset-password`,
  })

  if (error) {
    // Pembatasan laju Supabase sering disalahartikan sebagai "email tidak
    // terkirim". Bedakan supaya pengguna tahu harus menunggu, bukan menekan
    // tombol berulang kali.
    if (/rate|too many|429/i.test(error.message)) {
      return { error: 'Terlalu sering meminta tautan. Tunggu beberapa menit.' }
    }
    console.error('resetPasswordForEmail:', error.message)
    return { error: 'Gagal mengirim email reset. Coba lagi.' }
  }

  // Pesan TIDAK menyatakan apakah email terdaftar. Ini beda dengan alur
  // pendaftaran yang sengaja memberi tahu: di sini penyerang bisa memakai
  // formulir ini untuk memeriksa daftar anggota tanpa jejak, sedangkan pada
  // pendaftaran pengguna memang harus tahu mengapa akunnya tidak jadi dibuat.
  return {
    success:
      'Bila alamat itu terdaftar, kami sudah mengirim tautan untuk mengatur ulang kata sandi. Periksa inbox dan folder spam.',
  }
}

export async function updatePassword(formData: FormData) {
  const supabase = createClient()
  const password = formData.get('password') as string

  if (password.length < 8) {
    return { error: 'Password minimal 8 karakter.' }
  }

  // Tanpa sesi, updateUser akan gagal dengan pesan teknis. Tautan reset
  // kedaluwarsa setelah dipakai sekali atau lewat batas waktu, jadi keadaan
  // ini wajar dan harus dijelaskan.
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return {
      error:
        'Tautan reset sudah kedaluwarsa atau sudah dipakai. Minta tautan baru dari halaman Lupa Kata Sandi.',
    }
  }

  const { error } = await supabase.auth.updateUser({ password })

  if (error) {
    if (/same|different from the old/i.test(error.message)) {
      return { error: 'Kata sandi baru harus berbeda dari yang lama.' }
    }
    if (/weak|strength|characters/i.test(error.message)) {
      return { error: 'Kata sandi terlalu lemah. Gunakan minimal 8 karakter dengan variasi.' }
    }
    console.error('updateUser password:', error.message)
    return { error: 'Gagal mengubah password. Silakan coba lagi.' }
  }

  // Keluar dari sesi pemulihan, lalu minta pengguna masuk dengan kata sandi
  // BARU. Sebelumnya fungsi ini redirect ke /dashboard — bila sesi pemulihan
  // sudah tidak berlaku, pengguna mendarat di dashboard lalu ditendang ke
  // halaman masuk tanpa penjelasan, dan tidak pernah tahu apakah kata
  // sandinya benar-benar berubah.
  await supabase.auth.signOut()
  revalidatePath('/', 'layout')
  redirect('/auth/login?reset=1')
}
