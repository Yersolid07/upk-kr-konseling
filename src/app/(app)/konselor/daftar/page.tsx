// src/app/(app)/konselor/daftar/page.tsx
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, BookOpen } from 'lucide-react'
import { ApplicationForm } from './application-form'
import type { KonselorApplication } from '@/types/database'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Ajukan sebagai Konselor | IKA UPK-Kr FT UNSRAT' }

export default async function KonselorApplyPage() {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profileData } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()
  const profile = profileData as { role: string; full_name: string } | null
  if (!profile) redirect('/auth/setup-error')

  const { data: existing } = await supabase
    .from('konselor_applications')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  const application = existing as KonselorApplication | null

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fade-in pb-20">
      <Link
        href="/konselor"
        className="inline-flex items-center gap-2 text-sm font-bold text-[var(--text-muted)] hover:text-[var(--terra)] transition-colors group"
      >
        <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" /> Kembali
      </Link>

      <header className="space-y-3">
        <h1 className="font-[var(--font-playfair)] text-3xl sm:text-4xl font-bold text-[var(--brown-dark)]">
          Menjadi Konselor IKA UPK-Kr FT UNSRAT
        </h1>
        <p className="text-[var(--text-muted)] leading-relaxed">
          Konselor mendampingi anggota secara rahasia melalui sesi 1-on-1. Sebelum melayani,
          kamu perlu mengajukan diri agar admin dapat meninjau kesiapan dan kompetensimu.
        </p>
        <Link
          href="/legal/konselor-guide"
          className="inline-flex items-center gap-2 text-xs font-bold text-[var(--terra)] uppercase tracking-wider hover:underline"
        >
          <BookOpen size={13} /> Baca panduan lengkap & kode etik
        </Link>
      </header>

      <ApplicationForm
        role={profile.role}
        existing={application}
        userId={user.id}
        fullName={profile.full_name}
      />
    </div>
  )
}
