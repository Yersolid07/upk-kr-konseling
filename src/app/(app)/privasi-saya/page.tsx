// src/app/(app)/privasi-saya/page.tsx
// Hak anggota atas datanya sendiri (M13).

import Link from 'next/link'
import { ShieldCheck, ArrowLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { getAuthContext } from '@/lib/auth-guard'
import { redirect } from 'next/navigation'
import { PrivacyRequests } from './privacy-requests'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Privasi Saya | IKA UPK-Kr FT UNSRAT' }

export default async function PrivasiSayaPage() {
  const ctx = await getAuthContext()
  if (!ctx) redirect('/auth/login')

  const supabase = createClient()
  const { data: requests, error } = await supabase
    .from('data_requests')
    .select('id, kind, status, note, handled_at, created_at')
    .eq('user_id', ctx.userId)
    .order('created_at', { ascending: false })
    .limit(30)

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 space-y-5 animate-fade-in pb-20">
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-2 text-sm font-bold text-[var(--text-muted)] hover:text-[var(--terra)] group"
      >
        <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" /> Kembali
      </Link>

      <header className="space-y-2">
        <div className="w-12 h-12 rounded-2xl bg-white border border-[var(--cream-dark)] flex items-center justify-center text-[var(--sage)] shadow-sm">
          <ShieldCheck size={22} />
        </div>
        <h1 className="font-[var(--font-playfair)] text-2xl sm:text-3xl font-bold text-[var(--brown-dark)]">
          Privasi Saya
        </h1>
        <p className="text-sm text-[var(--text-muted)] leading-relaxed">
          Anda berhak meminta salinan data Anda, dan meminta akun beserta datanya dihapus. Permintaan
          diproses pengurus dan tercatat.
        </p>
      </header>

      <PrivacyRequests
        initial={requests ?? []}
        tableMissing={Boolean(error)}
        errorMessage={error?.message ?? null}
      />

      <p className="text-[11px] text-[var(--text-muted)] leading-relaxed">
        Catatan konseling bersifat rahasia dan tidak termasuk dalam ekspor data biasa — bila Anda
        membutuhkan salinan catatan sesi, ajukan lewat pengurus dengan alasan yang jelas.
      </p>
    </div>
  )
}
