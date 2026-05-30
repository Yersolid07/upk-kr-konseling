// src/app/auth/forgot-password/page.tsx
'use client'

import { useState } from 'react'
import Link from 'next/link'
import { forgotPassword } from '../actions'
import { Mail, ArrowLeft, CheckCircle, Shield } from 'lucide-react'

export default function ForgotPasswordPage() {
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess('')
    const formData = new FormData(e.currentTarget)
    const result = await forgotPassword(formData)
    if (result?.error) setError(result.error)
    else if (result?.success) setSuccess(result.success)
    setLoading(false)
  }

  if (success) {
    return (
      <div className="auth-card backdrop-blur-xl bg-white/90 border border-white/20 text-center py-10 space-y-6">
        <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto animate-pulse">
          <CheckCircle size={48} />
        </div>
        <div className="space-y-2">
          <h2 className="font-[var(--font-playfair)] text-3xl font-black text-[var(--brown-dark)]">Email Terkirim!</h2>
          <p className="text-sm text-[var(--text-muted)] max-w-xs mx-auto leading-relaxed">{success}</p>
        </div>
        <Link href="/auth/login" className="btn-primary inline-flex items-center gap-2 group">
          Kembali ke Login <ArrowLeft size={18} className="rotate-180 group-hover:translate-x-1 transition-transform" />
        </Link>
      </div>
    )
  }

  return (
    <div className="auth-card backdrop-blur-xl bg-white/90 border border-white/20">
      <div className="flex flex-col items-center mb-10">
        <div className="w-16 h-16 bg-gradient-to-br from-[var(--terra)] to-[var(--brown)] rounded-2xl flex items-center justify-center text-white text-3xl shadow-xl mb-4">
          🔐
        </div>
        <h1 className="font-[var(--font-playfair)] text-2xl font-black text-[var(--brown-dark)]">Lupa Kata Sandi</h1>
        <p className="text-xs text-[var(--text-muted)] font-bold uppercase tracking-widest mt-1">Reset via Email</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="form-group">
          <label className="form-label flex items-center gap-2">
            <Mail size={12} className="text-[var(--terra)]" /> Email Address
          </label>
          <input
            name="email"
            type="email"
            className="form-input focus:ring-4 focus:ring-[var(--terra)]/10"
            placeholder="Masukkan email yang terdaftar"
            required
          />
        </div>

        {error && (
          <div className="error-banner flex items-center gap-2 animate-shake">
            <Shield size={16} /> {error}
          </div>
        )}

        <button type="submit" className="btn-primary group h-14" disabled={loading}>
          <span className="flex items-center justify-center gap-2">
            {loading ? 'Mengirim...' : 'Kirim Link Reset'}
            {!loading && <Mail size={18} className="group-hover:translate-x-1 transition-transform" />}
          </span>
        </button>
      </form>

      <div className="mt-8 text-center">
        <Link href="/auth/login" className="text-xs font-bold text-[var(--text-muted)] hover:text-[var(--terra)] transition-colors inline-flex items-center gap-2">
          <ArrowLeft size={14} /> Kembali ke halaman masuk
        </Link>
      </div>
    </div>
  )
}
