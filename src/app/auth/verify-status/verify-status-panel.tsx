// src/app/auth/verify-status/verify-status-panel.tsx
'use client'

// Panel status verifikasi: memantau sampai email terkonfirmasi, lalu pindah
// sendiri ke halaman masuk.

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  MailCheck,
  Mail,
  Loader2,
  CheckCircle2,
  RefreshCw,
  ArrowRight,
  AlertTriangle,
  Clock,
} from 'lucide-react'
import { LogoMark } from '@/components/brand/Logo'
import { checkVerification, resendVerification } from './actions'

/** Jarak antar pemeriksaan. Naik bertahap supaya tidak membebani server. */
const POLL_STEPS_MS = [4000, 4000, 5000, 5000, 8000, 8000, 10000, 15000, 20000, 30000]

export function VerifyStatusPanel({ email }: { email: string }) {
  const router = useRouter()
  const [status, setStatus] = useState<'checking' | 'pending' | 'confirmed' | 'unknown' | 'error'>(
    'checking'
  )
  const [secondsWaited, setSecondsWaited] = useState(0)
  const [resending, setResending] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const pollIndex = useRef(0)
  const stopped = useRef(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const poll = useCallback(async () => {
    if (stopped.current) return
    const res = await checkVerification(email)

    if (stopped.current) return

    if (res.confirmed) {
      stopped.current = true
      setStatus('confirmed')
      // Beri jeda singkat supaya pengguna melihat tanda centangnya, bukan
      // langsung dilempar tanpa penjelasan.
      setTimeout(() => router.replace('/auth/login?verified=1'), 1600)
      return
    }

    if (res.unknown) {
      stopped.current = true
      setStatus('unknown')
      return
    }

    if (res.error) {
      setErrorMsg(res.error)
      setStatus('error')
    } else {
      setStatus('pending')
    }

    const wait = POLL_STEPS_MS[Math.min(pollIndex.current, POLL_STEPS_MS.length - 1)]
    pollIndex.current += 1
    timer.current = setTimeout(poll, wait)
  }, [email, router])

  // Mulai pemantauan.
  useEffect(() => {
    if (!email) {
      setStatus('unknown')
      return
    }
    stopped.current = false
    poll()
    return () => {
      stopped.current = true
      if (timer.current) clearTimeout(timer.current)
    }
  }, [email, poll])

  // Penghitung waktu — memberi pengguna rasa kemajuan, bukan layar diam.
  useEffect(() => {
    if (status !== 'pending') return
    const id = setInterval(() => setSecondsWaited((s) => s + 1), 1000)
    return () => clearInterval(id)
  }, [status])

  // Periksa juga saat tab kembali aktif: pengguna biasanya membuka email di
  // perangkat lain, lalu kembali ke tab ini setelah mengeklik tautannya.
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible' && !stopped.current) poll()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [poll])

  async function handleResend() {
    setResending(true)
    setNotice(null)
    setErrorMsg(null)
    const r = await resendVerification(email)
    setResending(false)
    if (r.error) setErrorMsg(r.error)
    else setNotice('Email verifikasi baru sudah dikirim. Periksa inbox dan folder spam.')
  }

  // ── Sudah terverifikasi ──
  if (status === 'confirmed') {
    return (
      <div className="auth-card backdrop-blur-xl bg-white/90 border border-white/20 text-center py-10 space-y-5">
        <div className="w-20 h-20 rounded-full bg-[var(--sage)]/12 text-[var(--sage)] flex items-center justify-center mx-auto">
          <CheckCircle2 size={44} />
        </div>
        <div className="space-y-2">
          <h2 className="font-[var(--font-playfair)] text-2xl font-black text-[var(--brown-dark)]">
            Email terverifikasi
          </h2>
          <p className="text-sm text-[var(--text-muted)] max-w-xs mx-auto leading-relaxed">
            Akun kamu sudah aktif. Mengalihkan ke halaman masuk…
          </p>
        </div>
        <Loader2 size={18} className="animate-spin text-[var(--terra)] mx-auto" />
      </div>
    )
  }

  // ── Email tidak dikenal ──
  if (status === 'unknown') {
    return (
      <div className="auth-card backdrop-blur-xl bg-white/90 border border-white/20 text-center py-10 space-y-5">
        <div className="w-20 h-20 rounded-full bg-[var(--cream)] text-[var(--text-muted)] flex items-center justify-center mx-auto">
          <Mail size={40} />
        </div>
        <div className="space-y-2">
          <h2 className="font-[var(--font-playfair)] text-2xl font-black text-[var(--brown-dark)]">
            Email belum terdaftar
          </h2>
          <p className="text-sm text-[var(--text-muted)] max-w-xs mx-auto leading-relaxed">
            {email
              ? `Kami tidak menemukan akun dengan alamat ${email}.`
              : 'Alamat email tidak terbaca dari tautan ini.'}
          </p>
        </div>
        <Link href="/auth/register" className="btn-primary inline-flex items-center gap-2 group">
          Daftar sekarang{' '}
          <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
        </Link>
      </div>
    )
  }

  return (
    <div className="auth-card backdrop-blur-xl bg-white/90 border border-white/20 text-center py-10 space-y-6">
      <div className="flex flex-col items-center">
        <LogoMark size={56} className="mb-4 shadow-lg" />
        <div className="relative">
          <div className="w-20 h-20 rounded-full bg-[var(--terra)]/10 text-[var(--terra)] flex items-center justify-center">
            {status === 'checking' ? (
              <Loader2 size={36} className="animate-spin" />
            ) : (
              <MailCheck size={38} />
            )}
          </div>
          {status === 'pending' && (
            <span className="absolute -top-1 -right-1 flex h-4 w-4">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--terra)] opacity-60" />
              <span className="relative inline-flex rounded-full h-4 w-4 bg-[var(--terra)]" />
            </span>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <h2 className="font-[var(--font-playfair)] text-2xl font-black text-[var(--brown-dark)]">
          {status === 'checking' ? 'Memeriksa status…' : 'Tinggal satu langkah'}
        </h2>
        <p className="text-sm text-[var(--text-muted)] max-w-sm mx-auto leading-relaxed">
          Kami mengirim tautan verifikasi ke{' '}
          <strong className="text-[var(--brown)]">{email || 'email kamu'}</strong>. Buka tautan itu
          untuk mengaktifkan akun.
        </p>
      </div>

      {/* Indikator langsung: pengguna tahu halaman ini bekerja, bukan diam. */}
      {status === 'pending' && (
        <div className="inline-flex items-center gap-2 rounded-full bg-[var(--cream)] px-4 py-2 text-[11px] font-bold text-[var(--text-muted)]">
          <Clock size={13} className="text-[var(--terra)]" />
          Menunggu verifikasi · memeriksa otomatis
          {secondsWaited > 0 && (
            <span className="tabular-nums opacity-70">
              ({Math.floor(secondsWaited / 60)}:
              {String(secondsWaited % 60).padStart(2, '0')})
            </span>
          )}
        </div>
      )}

      {notice && (
        <div className="rounded-xl border border-[var(--sage)]/30 bg-[var(--sage)]/10 px-4 py-3 text-xs text-[var(--sage)] font-medium flex items-center justify-center gap-2">
          <CheckCircle2 size={14} /> {notice}
        </div>
      )}

      {errorMsg && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700 font-medium flex items-start gap-2 text-left">
          <AlertTriangle size={14} className="mt-0.5 shrink-0" /> {errorMsg}
        </div>
      )}

      <div className="space-y-3 pt-1">
        <button
          onClick={handleResend}
          disabled={resending || !email}
          className="btn-secondary w-full inline-flex items-center justify-center gap-2 text-sm disabled:opacity-50"
        >
          {resending ? <Loader2 size={15} className="animate-spin" /> : <RefreshCw size={15} />}
          Kirim ulang email verifikasi
        </button>

        <Link
          href="/auth/login"
          className="block text-[11px] font-bold text-[var(--text-muted)] hover:text-[var(--terra)] transition-colors"
        >
          Sudah verifikasi? Masuk di sini
        </Link>
      </div>

      <p className="text-[11px] text-[var(--text-muted)] leading-relaxed max-w-xs mx-auto">
        Tidak menemukan emailnya? Periksa folder <strong>Spam</strong> atau <strong>Promosi</strong>.
        Halaman ini akan berpindah sendiri begitu akun terverifikasi.
      </p>
    </div>
  )
}
