// src/app/auth/register/page.tsx
'use client'

import { useState } from 'react'
import Link from 'next/link'
import { register } from '../actions'

const ANGKATAN_OPTIONS = Array.from({ length: 2026 - 1970 + 1 }, (_, i) => String(1970 + i)).reverse()

import { User, Mail, Calendar, BookOpen, Lock, Eye, EyeOff, CheckCircle, Shield, ArrowRight } from 'lucide-react'

export default function RegisterPage() {
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess('')

    const formData = new FormData(e.currentTarget)
    const password = formData.get('password') as string
    const confirm = formData.get('confirm_password') as string

    if (password !== confirm) {
      setError('Password tidak cocok.')
      setLoading(false)
      return
    }
    if (password.length < 8) {
      setError('Password minimal 8 karakter.')
      setLoading(false)
      return
    }

    const result = await register(formData)
    if (result?.error) {
      setError(result.error)
    } else if (result?.success) {
      setSuccess(result.success)
    }
    setLoading(false)
  }

  if (success) {
    return (
      <div className="auth-card backdrop-blur-xl bg-white/90 border border-white/20 text-center py-10 space-y-6">
        <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto text-4xl animate-pulse">
          <CheckCircle size={48} />
        </div>
        <div className="space-y-2">
          <h2 className="font-[var(--font-playfair)] text-3xl font-black text-[var(--brown-dark)]">Berhasil!</h2>
          <p className="text-sm text-[var(--text-muted)] max-w-xs mx-auto leading-relaxed">{success}</p>
        </div>
        <Link href="/auth/login" className="btn-primary inline-flex items-center gap-2 group">
          Masuk Sekarang <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
        </Link>
      </div>
    )
  }

  return (
    <div className="auth-card backdrop-blur-xl bg-white/90 border border-white/20">
      {/* Header */}
      <div className="flex flex-col items-center mb-8">
        <div className="w-14 h-14 bg-gradient-to-br from-[var(--terra)] to-[var(--brown)] rounded-2xl flex items-center justify-center text-white text-2xl shadow-xl mb-4">
          ✝
        </div>
        <h1 className="font-[var(--font-playfair)] text-2xl font-black text-[var(--brown-dark)]">Bergabunglah</h1>
        <p className="text-[10px] text-[var(--text-muted)] font-black uppercase tracking-[0.2em] mt-1">Membangun Komunitas Iman</p>
      </div>

      {/* Tabs */}
      <div className="auth-tabs p-1 bg-[var(--cream)] rounded-2xl mb-8">
        <Link href="/auth/login" className="auth-tab hover:text-[var(--brown)] transition-colors">Masuk</Link>
        <div className="auth-tab active shadow-sm">Daftar</div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="form-group">
          <label className="form-label flex items-center gap-2">
            <User size={12} className="text-[var(--terra)]" /> Nama Lengkap
          </label>
          <input
            name="full_name"
            type="text"
            className="form-input"
            placeholder="Sesuai KTM / Ijazah"
            required
          />
        </div>

        <div className="form-group">
          <label className="form-label flex items-center gap-2">
            <Mail size={12} className="text-[var(--terra)]" /> Email Address
          </label>
          <input
            name="email"
            type="email"
            className="form-input"
            placeholder="nama@email.com"
            required
          />
        </div>

        <div className="form-row">
          <div className="form-group">
            <label className="form-label flex items-center gap-2">
              <Calendar size={12} className="text-[var(--terra)]" /> Angkatan
            </label>
            <select name="angkatan" className="form-input" required>
              <option value="">Pilih</option>
              {ANGKATAN_OPTIONS.map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label flex items-center gap-2">
              <BookOpen size={12} className="text-[var(--terra)]" /> Jurusan
            </label>
            <select name="jurusan" className="form-input" required>
              <option value="">Pilih</option>
              <option value="Teknik Informatika">Informatika</option>
              <option value="Teknik Sipil">Sipil</option>
              <option value="Teknik Mesin">Mesin</option>
              <option value="Teknik Elektro">Elektro</option>
              <option value="Teknik Lingkungan">Lingkungan</option>
              <option value="Perencanaan Wilayah dan Kota">PWK</option>
              <option value="Teknik Industri">Industri</option>
              <option value="Teknik Pertambangan">Pertambangan</option>
              <option value="Teknik Kimia">Kimia</option>
              <option value="Arsitektur">Arsitektur</option>
            </select>
          </div>
        </div>

        <div className="form-group">
          <label className="form-label flex items-center gap-2">
            <Lock size={12} className="text-[var(--terra)]" /> Buat Password
          </label>
          <div className="input-with-toggle">
            <input
              name="password"
              type={showPassword ? 'text' : 'password'}
              className="form-input pr-12"
              placeholder="Min. 8 karakter"
              required
            />
            <button 
              type="button" 
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--brown)]"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>

        <div className="form-group">
          <label className="form-label flex items-center gap-2">
            <Shield size={12} className="text-[var(--terra)]" /> Konfirmasi Password
          </label>
          <input
            name="confirm_password"
            type={showPassword ? 'text' : 'password'}
            className="form-input"
            placeholder="Ulangi password"
            required
          />
        </div>

        <div className="p-3 bg-[var(--terra)]/5 rounded-xl border border-[var(--terra)]/10 flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-[var(--terra)]/10 flex items-center justify-center text-[var(--terra)] shrink-0">
             <User size={16} />
          </div>
          <p className="text-[10px] text-[var(--brown)] leading-tight pt-1">
            Akun akan didaftarkan sebagai <strong>Anggota</strong>. Untuk menjadi konselor, hubungi admin UPK-Kr.
          </p>
        </div>

        <div className="form-group pt-2">
          <label className="form-checkbox items-center">
            <input name="agree_tos" type="checkbox" required className="w-4 h-4" />
            <span className="text-[11px]">Saya menyetujui <a href="/tos" className="font-bold underline">Syarat & Ketentuan</a></span>
          </label>
        </div>

        {error && <div className="error-banner animate-shake text-xs py-2">{error}</div>}

        <button type="submit" className="btn-primary h-14 group" disabled={loading}>
          <span className="flex items-center justify-center gap-2">
            {loading ? 'Memproses...' : 'Daftar Sekarang'}
            {!loading && <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />}
          </span>
        </button>
      </form>

      <div className="mt-8 text-center text-[10px] text-[var(--text-muted)] font-bold uppercase tracking-widest italic">
        "TUHAN akan menjaga keluar masukmu..."
        <cite className="block mt-1 not-italic opacity-60">— Mazmur 121:8</cite>
      </div>
    </div>
  )
}
