// src/app/(app)/admin/konselor/page.tsx
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getAuthContext } from '@/lib/auth-guard'
import { can } from '@/lib/rbac'
import { KonselorQueue } from './konselor-queue'
import type { KonselorApplication } from '@/types/database'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Pengajuan Konselor | IKA UPK-Kr FT UNSRAT' }

export default async function AdminKonselorPage() {
  const ctx = await getAuthContext()
  if (!ctx) redirect('/auth/login')
  if (!can(ctx.role, 'approveKonselor')) redirect('/admin')

  const supabase = createClient()

  const [{ data: pending }, { data: decided }] = await Promise.all([
    supabase
      .from('konselor_applications')
      .select('*, applicant:profiles!konselor_applications_user_id_fkey(id, full_name, angkatan, jurusan, role)')
      .in('status', ['pending', 'under_review'])
      .order('created_at', { ascending: true }),
    supabase
      .from('konselor_applications')
      .select('*, applicant:profiles!konselor_applications_user_id_fkey(id, full_name, angkatan, jurusan, role)')
      .in('status', ['approved', 'rejected', 'withdrawn'])
      .order('created_at', { ascending: false })
      .limit(40),
  ])

  return (
    <div className="space-y-6 animate-fade-in pb-16">
      <header className="space-y-2">
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="font-[var(--font-playfair)] text-2xl sm:text-3xl font-bold text-[var(--brown-dark)]">
            Pengajuan Konselor
          </h1>
          <Link
            href="/admin"
            className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider hover:text-[var(--terra)]"
          >
            ← Panel Admin
          </Link>
        </div>
        <p className="text-sm text-[var(--text-muted)]">
          Menyetujui pengajuan akan otomatis mengubah peran pengguna menjadi{' '}
          <code className="px-1.5 py-0.5 rounded bg-[var(--cream-dark)] text-[11px] font-mono">konselor</code>{' '}
          dan menampilkan profilnya di halaman booking.
        </p>
      </header>

      <KonselorQueue
        pending={(pending ?? []) as KonselorApplication[]}
        decided={(decided ?? []) as KonselorApplication[]}
      />
    </div>
  )
}
