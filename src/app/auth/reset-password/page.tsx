// src/app/auth/reset-password/page.tsx
'use client'

import { useState } from 'react'
import { updatePassword } from '../actions'
import { KeyRound, Shield, ArrowRight } from 'lucide-react'

export default function ResetPasswordPage() {
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const formData = new FormData(e.currentTarget)
    
    if (formData.get('password') !== formData.get('confirm_password')) {
      setError('Password tidak sama. Silakan coba lagi.')
      setLoading(false)
      return
    }

    const result = await updatePassword(formData)
    if (result?.error) {
      setError(result.error)
      setLoading(false)
    }
  }

  return (
    <div className="auth-card backdrop-blur-xl bg-white/90 border border-white/20">
      <div className="flex flex-col items-center mb-10">
        <div className="w-16 h-16 bg-gradient-to-br from-[var(--terra)] to-[var(--brown)] rounded-2xl flex items-center justify-center text-white shadow-xl mb-4">
          <KeyRound size={28} />
        </div>
        <h1 className="font-[var(--font-playfair)] text-2xl font-black text-[var(--brown-dark)]">Password Baru</h1>
        <p className="text-xs text-[var(--text-muted)] font-bold uppercase tracking-widest mt-1 text-center">
          Silakan masukkan password baru Anda.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="form-group">
          <label className="form-label flex items-center gap-2">
            <KeyRound size={12} className="text-[var(--terra)]" /> Password Baru
          </label>
          <input
            name="password"
            type="password"
            className="form-input focus:ring-4 focus:ring-[var(--terra)]/10"
            placeholder="Minimal 6 karakter"
            required
            minLength={6}
          />
        </div>

        <div className="form-group">
          <label className="form-label flex items-center gap-2">
            <KeyRound size={12} className="text-[var(--terra)]" /> Konfirmasi Password
          </label>
          <input
            name="confirm_password"
            type="password"
            className="form-input focus:ring-4 focus:ring-[var(--terra)]/10"
            placeholder="Ketik ulang password baru"
            required
            minLength={6}
          />
        </div>

        {error && (
          <div className="error-banner flex items-center gap-2 animate-shake">
            <Shield size={16} /> {error}
          </div>
        )}

        <button type="submit" className="btn-primary group h-14 w-full" disabled={loading}>
          <span className="flex items-center justify-center gap-2">
            {loading ? 'Menyimpan...' : 'Simpan Password Baru'}
            {!loading && <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />}
          </span>
        </button>
      </form>
    </div>
  )
}
