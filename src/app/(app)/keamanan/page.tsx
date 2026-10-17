// src/app/(app)/keamanan/page.tsx
// Halaman keamanan akun: status verifikasi dua langkah + kelola faktor.

import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, ShieldCheck, ShieldAlert, KeyRound } from 'lucide-react'
import { getAuthContext } from '@/lib/auth-guard'
import { hasMinRole } from '@/lib/rbac'
import { mfaState, listTotpFactors } from '@/lib/mfa'
import { getSetting } from '@/lib/settings/get'
import { SecurityPanel } from './security-panel'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Keamanan Akun | IKA UPK-Kr FT UNSRAT' }

export default async function KeamananPage() {
  const ctx = await getAuthContext()
  if (!ctx) redirect('/auth/login')

  const [state, { factors }, required] = await Promise.all([
    mfaState(ctx.role),
    listTotpFactors(),
    getSetting('require_mfa_for_admins'),
  ])

  const wajib = required === true && hasMinRole(ctx.role, 'admin')

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 space-y-5 animate-fade-in pb-20">
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-2 text-sm font-bold text-[var(--text-muted)] hover:text-[var(--terra)] group"
      >
        <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" /> Kembali
      </Link>

      <header className="space-y-2">
        <div className="w-12 h-12 rounded-2xl bg-white border border-[var(--cream-dark)] flex items-center justify-center text-[var(--brown)] shadow-sm">
          {state === 'ok' ? <ShieldCheck size={22} /> : <ShieldAlert size={22} />}
        </div>
        <h1 className="font-[var(--font-playfair)] text-2xl sm:text-3xl font-bold text-[var(--brown-dark)]">
          Keamanan Akun
        </h1>
        <p className="text-sm text-[var(--text-muted)] leading-relaxed">
          Verifikasi dua langkah menambah satu lapis lagi di atas kata sandi. Setelah aktif, masuk ke
          akun ini memerlukan kode 6 angka dari aplikasi autentikator.
        </p>
      </header>

      {wajib && state === 'enroll' && (
        <div className="card-premium border-l-4 border-l-[var(--gold)] p-4">
          <p className="text-sm font-bold text-[var(--brown-dark)] flex items-center gap-2">
            <KeyRound size={16} className="text-[var(--gold)]" /> Wajib untuk peran Anda
          </p>
          <p className="text-xs text-[var(--text-muted)] mt-1 leading-relaxed">
            Pengurus mengaktifkan kewajiban verifikasi dua langkah untuk admin. Daftarkan faktor
            sekarang — Anda masih bisa memakai panel sampai pendaftaran selesai.
          </p>
        </div>
      )}

      {wajib && state === 'verify' && (
        <div className="card-premium border-l-4 border-l-[var(--terra)] p-4">
          <p className="text-sm font-bold text-[var(--brown-dark)]">Sesi ini belum terverifikasi</p>
          <p className="text-xs text-[var(--text-muted)] mt-1 leading-relaxed">
            Masukkan kode dari aplikasi autentikator untuk membuka akses penuh pada sesi ini.
          </p>
        </div>
      )}

      <SecurityPanel
        initialState={state}
        initialFactors={factors}
        required={wajib}
        role={ctx.role}
      />

      <p className="text-[11px] text-[var(--text-muted)] leading-relaxed">
        Simpan kode pemulihan di tempat aman. Bila perangkat autentikator hilang dan tidak ada faktor
        cadangan, pemulihan akun harus lewat super admin.
      </p>
    </div>
  )
}
