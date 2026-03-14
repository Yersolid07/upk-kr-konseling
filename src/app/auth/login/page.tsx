// src/app/auth/login/page.tsx
'use client'

import { useState } from 'react'
import Link from 'next/link'
import { login } from '../actions'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const formData = new FormData(e.currentTarget)
    const result = await login(formData)
    if (result?.error) {
      setError(result.error)
      setLoading(false)
    }
    // on success, middleware redirect handles navigation
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
        <div className="auth-tab active">Masuk</div>
        <Link href="/auth/register" className="auth-tab">Daftar</Link>
      </div>

      <form onSubmit={handleSubmit}>
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
        <div className="form-group">
          <label className="form-label">Password</label>
          <input
            name="password"
            type="password"
            className="form-input"
            placeholder="••••••••"
            required
          />
        </div>

        {error && (
          <div className="error-banner">{error}</div>
        )}

        <button type="submit" className="btn-primary" disabled={loading}>
          {loading ? 'Masuk...' : 'Masuk ke Aplikasi'}
        </button>
      </form>

      <div className="auth-footer">
        <Link href="/auth/forgot-password" className="auth-link">Lupa password?</Link>
      </div>

      <blockquote className="auth-verse">
        "Serahkanlah segala kekuatiranmu kepada-Nya, sebab Ia yang memelihara kamu."
        <cite>— 1 Petrus 5:7</cite>
      </blockquote>
    </div>
  )
}
