// src/app/auth/login/page.tsx
'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

import { Mail, Lock, ArrowRight, Shield } from 'lucide-react'

export default function LoginPage() {
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError('')
    
    const formData = new FormData(e.currentTarget)
    const email = formData.get('email') as string
    const password = formData.get('password') as string
    
    try {
      const supabase = createClient()
      const { data, error: signInError } = await supabase.auth.signInWithPassword({ 
        email, 
        password 
      })
      
      if (signInError) {
        if (signInError.message.toLowerCase().includes('email not confirmed')) {
          setError('Harap verifikasi email Anda terlebih dahulu dengan mengeklik tautan yang dikirimkan ke email Anda.')
        } else {
          setError('Email atau password salah. Silakan coba lagi.')
        }
        setLoading(false)
      } else if (data.session) {
        // Wait for @supabase/ssr to finish writing the session chunks to document.cookie asynchronously
        let attempts = 0
        const checkCookie = setInterval(() => {
          if (document.cookie.includes('-auth-token=') || attempts > 20) {
            clearInterval(checkCookie)
            console.log('CLIENT REDIRECTING! Cookie is:', document.cookie)
            window.location.href = '/dashboard'
          }
          attempts++
        }, 100)
      }
    } catch (err) {
      setError('Terjadi kesalahan jaringan. Silakan coba lagi.')
      setLoading(false)
    }
  }

  return (
    <div className="auth-card backdrop-blur-xl bg-white/90 border border-white/20">
      {/* Brand Header */}
      <div className="flex flex-col items-center mb-10">
        <div className="w-16 h-16 bg-gradient-to-br from-[var(--terra)] to-[var(--brown)] rounded-2xl flex items-center justify-center text-white text-3xl shadow-xl mb-4 animate-bounce-slow">
          ✝
        </div>
        <h1 className="font-[var(--font-playfair)] text-2xl font-black text-[var(--brown-dark)]">Selamat Datang</h1>
        <p className="text-xs text-[var(--text-muted)] font-bold uppercase tracking-widest mt-1">UPK-Kr Konseling Platform</p>
      </div>

      {/* Tabs */}
      <div className="auth-tabs p-1 bg-[var(--cream)] rounded-2xl mb-8">
        <div className="auth-tab active shadow-sm">Masuk</div>
        <Link href="/auth/register" className="auth-tab hover:text-[var(--brown)] transition-colors">Daftar</Link>
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
            placeholder="nama@email.com"
            required
          />
        </div>

        <div className="form-group">
          <label className="form-label flex items-center gap-2">
            <Lock size={12} className="text-[var(--terra)]" /> Password
          </label>
          <input
            name="password"
            type="password"
            className="form-input focus:ring-4 focus:ring-[var(--terra)]/10"
            placeholder="••••••••"
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
            {loading ? 'Memverifikasi...' : 'Masuk Sekarang'}
            {!loading && <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />}
          </span>
        </button>
      </form>

      <div className="auth-footer mt-8 border-t border-[var(--cream-dark)] pt-6">
        <Link href="/auth/forgot-password" className="text-xs font-bold text-[var(--text-muted)] hover:text-[var(--terra)] transition-colors">
          Lupa kata sandi Anda?
        </Link>
      </div>

      <div className="mt-10 p-4 bg-gradient-to-r from-[var(--terra)]/5 to-transparent rounded-xl border-l-4 border-[var(--terra)] italic text-xs text-[var(--brown)] leading-relaxed">
        "Serahkanlah segala kekuatiranmu kepada-Nya, sebab Ia yang memelihara kamu."
        <cite className="block mt-2 font-bold not-italic opacity-60">— 1 Petrus 5:7</cite>
      </div>
    </div>
  )
}
