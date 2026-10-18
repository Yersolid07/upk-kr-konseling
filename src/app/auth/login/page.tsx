// src/app/auth/login/page.tsx
'use client'

import { useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

import { Mail, Lock, ArrowRight, Shield, CheckCircle2, KeyRound } from 'lucide-react'
import { LogoMark } from '@/components/brand/Logo'

/**
 * Pesan hasil pengalihan dari halaman lain.
 *
 * Tanpa ini, pengguna yang baru selesai mengatur ulang kata sandi mendarat di
 * halaman masuk tanpa satu pun penjelasan — dan tidak tahu apakah kata
 * sandinya benar-benar berubah.
 */
function RedirectNotice() {
  const params = useSearchParams()
  const reset = params.get('reset') === '1'
  const verified = params.get('verified') === '1'
  const authError = params.get('error')

  if (!reset && !verified && !authError) return null

  const isPositive = reset || verified
  return (
    <div
      className={
        isPositive
          ? 'rounded-xl border border-[var(--sage)]/30 bg-[var(--sage)]/10 px-4 py-3 text-xs font-medium text-[var(--sage)] flex items-start gap-2'
          : 'rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-medium text-red-700 flex items-start gap-2'
      }
    >
      {isPositive ? (
        <CheckCircle2 size={15} className="mt-0.5 shrink-0" />
      ) : (
        <Shield size={15} className="mt-0.5 shrink-0" />
      )}
      <span>
        {verified
          ? 'Email kamu sudah terverifikasi. Silakan masuk.'
          : reset
            ? 'Kata sandi berhasil diubah. Masuk dengan kata sandi baru.'
            : 'Tautan tidak berlaku atau sudah kedaluwarsa. Coba minta tautan baru.'}
      </span>
    </div>
  )
}

function LoginForm() {
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
        <LogoMark size={64} className="mb-4 shadow-lg animate-bounce-slow" />
        <h1 className="font-[var(--font-playfair)] text-2xl font-black text-[var(--brown-dark)]">Selamat Datang</h1>
        <p className="text-xs text-[var(--text-muted)] font-bold uppercase tracking-widest mt-1">Platform IKA UPK-Kr FT UNSRAT</p>
      </div>

      {/* Tabs */}
      <div className="auth-tabs p-1 bg-[var(--cream)] rounded-2xl mb-8">
        <div className="auth-tab active shadow-sm">Masuk</div>
        <Link href="/auth/register" className="auth-tab hover:text-[var(--brown)] transition-colors">Daftar</Link>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <Suspense fallback={null}>
          <RedirectNotice />
        </Suspense>
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

// `useSearchParams` mewajibkan batas Suspense di Next 14; tanpa itu seluruh
// halaman jadi dynamic dan build menolak.
export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  )
}
