// src/app/auth/register/page.tsx
'use client'

import { useState } from 'react'
import Link from 'next/link'
import { register } from '../actions'

const ANGKATAN_OPTIONS = Array.from({ length: 15 }, (_, i) => String(2010 + i))

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
      <div className="auth-card">
        <div className="success-screen">
          <div className="success-icon">🙏</div>
          <h2>Akun Berhasil Dibuat!</h2>
          <p>{success}</p>
          <Link href="/auth/login" className="btn-primary" style={{ display: 'block', textAlign: 'center', marginTop: 16 }}>
            Masuk Sekarang
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="auth-card">
      {/* Logo */}
      <div className="auth-logo">
        <div className="auth-logo-icon">✝</div>
        <div>
          <h1 className="auth-title">UPK-Kr. Konseling</h1>
          <span className="auth-subtitle">FT. UNSRAT Alumni</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="auth-tabs">
        <Link href="/auth/login" className="auth-tab">Masuk</Link>
        <div className="auth-tab active">Daftar</div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label className="form-label">Nama Lengkap</label>
          <input
            name="full_name"
            type="text"
            className="form-input"
            placeholder="Nama sesuai KTM / ijazah"
            required
          />
        </div>

        <div className="form-group">
          <label className="form-label">Email</label>
          <input
            name="email"
            type="email"
            className="form-input"
            placeholder="email@example.com"
            required
          />
        </div>

        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Angkatan</label>
            <select name="angkatan" className="form-input">
              <option value="">Pilih angkatan</option>
              {ANGKATAN_OPTIONS.map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Jurusan</label>
            <select name="jurusan" className="form-input">
              <option value="">Pilih jurusan</option>
              <option value="Teknik Informatika">Teknik Informatika</option>
              <option value="Teknik Sipil">Teknik Sipil</option>
              <option value="Teknik Elektro">Teknik Elektro</option>
              <option value="Teknik Mesin">Teknik Mesin</option>
              <option value="Teknik Kimia">Teknik Kimia</option>
              <option value="Lainnya">Lainnya</option>
            </select>
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Password</label>
          <div className="input-with-toggle">
            <input
              name="password"
              type={showPassword ? 'text' : 'password'}
              className="form-input"
              placeholder="Min. 8 karakter"
              required
            />
            <button type="button" onClick={() => setShowPassword(!showPassword)}>
              {showPassword ? '🙈' : '👁️'}
            </button>
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Konfirmasi Password</label>
          <input
            name="confirm_password"
            type={showPassword ? 'text' : 'password'}
            className="form-input"
            placeholder="Ulangi password"
            required
          />
        </div>

        {/* NOTE: Role adalah member secara default. Tidak ada pilihan konselor di sini.
            Konselor hanya bisa diassign oleh Admin/Super Admin. */}
        <div className="role-info-banner">
          <span>👤</span>
          <span>Akun akan didaftarkan sebagai <strong>Anggota</strong>. Ingin menjadi konselor? Hubungi admin UPK-Kr.</span>
        </div>

        <div className="form-group">
          <label className="form-checkbox">
            <input name="agree_tos" type="checkbox" required />
            <span>Saya menyetujui <a href="/tos" target="_blank">Syarat & Ketentuan</a> dan <a href="/privacy" target="_blank">Kebijakan Privasi</a></span>
          </label>
        </div>

        {error && <div className="error-banner">{error}</div>}

        <button type="submit" className="btn-primary" disabled={loading}>
          {loading ? 'Membuat akun...' : 'Buat Akun'}
        </button>
      </form>

      <blockquote className="auth-verse">
        "Karena Aku ini mengetahui rancangan-rancangan apa yang ada pada-Ku mengenai kamu..."
        <cite>— Yeremia 29:11</cite>
      </blockquote>
    </div>
  )
}
