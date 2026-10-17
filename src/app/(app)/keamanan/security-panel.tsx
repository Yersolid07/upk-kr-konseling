'use client'

// src/app/(app)/keamanan/security-panel.tsx
// Panel pendaftaran & verifikasi TOTP.

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  ShieldCheck,
  ShieldOff,
  QrCode,
  KeyRound,
  Copy,
  Check,
  Loader2,
  Smartphone,
  Trash2,
  AlertTriangle,
} from 'lucide-react'
import { beginEnroll, confirmEnroll, verifySession, removeFactor } from './actions'
import type { MfaState } from '@/lib/mfa'

interface Factor {
  id: string
  friendlyName: string | null
  status: string
  createdAt: string
}

interface Props {
  initialState: MfaState
  initialFactors: Factor[]
  required: boolean
  role: string
}

export function SecurityPanel({ initialState, initialFactors, required }: Props) {
  const router = useRouter()
  const [factors, setFactors] = useState<Factor[]>(initialFactors)
  const [step, setStep] = useState<'idle' | 'enrolling' | 'verifying'>(
    initialState === 'enroll' ? 'enrolling' : initialState === 'verify' ? 'verifying' : 'idle'
  )
  const [qr, setQr] = useState<string | null>(null)
  const [secret, setSecret] = useState<string | null>(null)
  const [factorId, setFactorId] = useState<string | null>(null)
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [pending, startTransition] = useTransition()

  const verified = factors.filter((f) => f.status === 'verified')

  function reset() {
    setStep('idle')
    setQr(null)
    setSecret(null)
    setFactorId(null)
    setCode('')
    setError(null)
  }

  function startEnroll() {
    setError(null)
    setNotice(null)
    startTransition(async () => {
      const r = await beginEnroll()
      if (r.error) {
        setError(r.error)
        return
      }
      setQr(r.qr ?? null)
      setSecret(r.secret ?? null)
      setFactorId(r.factorId ?? null)
      setStep('enrolling')
    })
  }

  function submitEnroll() {
    if (!factorId) return
    setError(null)
    startTransition(async () => {
      const r = await confirmEnroll(factorId, code)
      if (r.error) {
        setError(r.error)
        return
      }
      setNotice('Verifikasi dua langkah aktif di akun ini.')
      reset()
      router.refresh()
    })
  }

  function submitVerify() {
    setError(null)
    startTransition(async () => {
      const r = await verifySession(code)
      if (r.error) {
        setError(r.error)
        return
      }
      setNotice('Sesi ini sudah terverifikasi.')
      setCode('')
      setStep('idle')
      router.refresh()
    })
  }

  function drop(id: string) {
    setError(null)
    startTransition(async () => {
      const r = await removeFactor(id)
      if (r.error) {
        setError(r.error)
        return
      }
      setFactors((prev) => prev.filter((f) => f.id !== id))
      setNotice('Faktor dihapus.')
      router.refresh()
    })
  }

  async function copySecret() {
    if (!secret) return
    try {
      await navigator.clipboard.writeText(secret)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      /* papan klip diblokir; rahasia tetap tampil di layar */
    }
  }

  return (
    <div className="space-y-4">
      {notice && (
        <div className="rounded-xl border border-[var(--sage)]/30 bg-[var(--sage)]/10 px-4 py-3 text-sm text-[var(--sage)] font-medium flex items-center gap-2">
          <Check size={16} /> {notice}
        </div>
      )}
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 font-medium flex items-start gap-2">
          <AlertTriangle size={16} className="mt-0.5 shrink-0" /> {error}
        </div>
      )}

      {/* Status */}
      <div className="card-premium p-5">
        <div className="flex items-start gap-3">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
              verified.length > 0
                ? 'bg-[var(--sage)]/10 text-[var(--sage)]'
                : 'bg-[var(--cream)] text-[var(--text-muted)]'
            }`}
          >
            {verified.length > 0 ? <ShieldCheck size={18} /> : <ShieldOff size={18} />}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-[var(--brown-dark)]">
              {verified.length > 0 ? 'Verifikasi dua langkah aktif' : 'Verifikasi dua langkah belum aktif'}
            </p>
            <p className="text-xs text-[var(--text-muted)] mt-1 leading-relaxed">
              {verified.length > 0
                ? `${verified.length} faktor terdaftar. Setiap masuk, Anda akan diminta kode 6 angka.`
                : 'Akun ini hanya dilindungi kata sandi. Menambahkan faktor membuat kata sandi yang bocor tidak cukup untuk masuk.'}
            </p>
            {required && verified.length === 0 && (
              <p className="text-[11px] font-bold text-[var(--gold)] mt-2 uppercase tracking-wide">
                Diwajibkan untuk peran Anda
              </p>
            )}
          </div>
        </div>

        {step === 'idle' && (
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              onClick={startEnroll}
              disabled={pending}
              className="btn-primary inline-flex items-center gap-2 text-sm disabled:opacity-50"
            >
              {pending ? <Loader2 size={16} className="animate-spin" /> : <QrCode size={16} />}
              {verified.length > 0 ? 'Tambah faktor' : 'Aktifkan sekarang'}
            </button>
            {verified.length > 0 && (
              <button
                onClick={() => {
                  setStep('verifying')
                  setError(null)
                }}
                className="btn-secondary inline-flex items-center gap-2 text-sm"
              >
                <KeyRound size={16} /> Verifikasi sesi ini
              </button>
            )}
          </div>
        )}
      </div>

      {/* Pendaftaran */}
      {step === 'enrolling' && qr && (
        <div className="card-premium p-5 space-y-4">
          <p className="text-sm font-bold text-[var(--brown-dark)] flex items-center gap-2">
            <Smartphone size={16} className="text-[var(--terra)]" /> Pindai dengan aplikasi autentikator
          </p>
          <div className="flex flex-col sm:flex-row gap-5 items-center sm:items-start">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={qr}
              alt="Kode QR pendaftaran autentikator"
              className="w-44 h-44 rounded-xl border border-[var(--cream-dark)] bg-white p-2"
            />
            <div className="min-w-0 flex-1 space-y-2">
              <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                Tidak bisa memindai? Masukkan kode ini secara manual:
              </p>
              <div className="flex items-center gap-2">
                <code className="flex-1 min-w-0 truncate rounded-lg bg-[var(--cream)] px-3 py-2 text-xs font-mono text-[var(--brown-dark)]">
                  {secret}
                </code>
                <button
                  onClick={copySecret}
                  className="btn-icon shrink-0"
                  aria-label="Salin kode rahasia"
                >
                  {copied ? <Check size={14} /> : <Copy size={14} />}
                </button>
              </div>
              <p className="text-[11px] text-[var(--text-muted)] leading-relaxed">
                Kode ini setara kata sandi. Jangan dibagikan ke siapa pun, termasuk yang mengaku
                pengurus.
              </p>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Kode 6 angka dari aplikasi</label>
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="000000"
              className="form-input text-center text-xl tracking-[0.4em] font-mono"
            />
          </div>

          <div className="flex gap-2">
            <button
              onClick={submitEnroll}
              disabled={pending || code.length !== 6}
              className="btn-primary inline-flex items-center gap-2 text-sm disabled:opacity-50"
            >
              {pending ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
              Selesaikan pendaftaran
            </button>
            <button onClick={reset} className="btn-secondary text-sm">
              Batal
            </button>
          </div>
        </div>
      )}

      {/* Verifikasi sesi */}
      {step === 'verifying' && (
        <div className="card-premium p-5 space-y-4">
          <p className="text-sm font-bold text-[var(--brown-dark)] flex items-center gap-2">
            <KeyRound size={16} className="text-[var(--terra)]" /> Verifikasi sesi ini
          </p>
          <div className="form-group">
            <label className="form-label">Kode 6 angka dari aplikasi autentikator</label>
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="000000"
              className="form-input text-center text-xl tracking-[0.4em] font-mono"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={submitVerify}
              disabled={pending || code.length !== 6}
              className="btn-primary inline-flex items-center gap-2 text-sm disabled:opacity-50"
            >
              {pending ? <Loader2 size={16} className="animate-spin" /> : <ShieldCheck size={16} />}
              Verifikasi
            </button>
            {!required && (
              <button onClick={reset} className="btn-secondary text-sm">
                Nanti saja
              </button>
            )}
          </div>
        </div>
      )}

      {/* Daftar faktor */}
      {factors.length > 0 && (
        <div className="card-premium p-5">
          <p className="text-sm font-bold text-[var(--brown-dark)] mb-3">Faktor terdaftar</p>
          <ul className="divide-y divide-[var(--cream-dark)]">
            {factors.map((f) => (
              <li key={f.id} className="flex items-center gap-3 py-3">
                <Smartphone size={16} className="text-[var(--text-muted)] shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-[var(--brown-dark)] truncate">
                    {f.friendlyName || 'Aplikasi autentikator'}
                  </p>
                  <p className="text-[11px] text-[var(--text-muted)]">
                    {f.status === 'verified' ? 'Terverifikasi' : 'Belum terverifikasi'} ·{' '}
                    {new Date(f.createdAt).toLocaleDateString('id-ID', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </p>
                </div>
                <button
                  onClick={() => drop(f.id)}
                  disabled={pending}
                  className="btn-icon text-red-500 hover:bg-red-50 disabled:opacity-50"
                  aria-label="Hapus faktor"
                >
                  <Trash2 size={15} />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
