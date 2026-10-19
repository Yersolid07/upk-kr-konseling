// src/app/(app)/pengaturan/page.tsx
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import {
  User, Lock, Bell, Palette, ShieldCheck, FileText, LogOut, ChevronRight, Smartphone,
} from 'lucide-react'
import { SettingsPanels } from './settings-panels'
import { SignOutEverywhere } from './sign-out-everywhere'
import type { Profile } from '@/types/database'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Pengaturan | IKA UPK-Kr FT UNSRAT' }

export default async function SettingsPage() {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  const profile = data as unknown as Profile | null
  if (!profile) redirect('/auth/login')

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fade-in pb-24">
      <header>
        <h1 className="font-[var(--font-playfair)] text-2xl sm:text-3xl font-bold text-[var(--brown-dark)]">
          Pengaturan
        </h1>
        <p className="text-sm text-[var(--text-muted)] mt-1">
          Kelola profil, keamanan, dan preferensi akun Anda.
        </p>
      </header>

      {/* Profil ringkas */}
      <div className="card-premium p-5 flex items-center gap-4">
        <div className="w-14 h-14 rounded-full bg-gradient-to-br from-[var(--terra)] to-[var(--brown)] flex items-center justify-center text-white font-bold text-xl shrink-0">
          {profile.full_name?.charAt(0) ?? 'U'}
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-bold text-[var(--brown-dark)] truncate">{profile.full_name}</p>
          <p className="text-xs text-[var(--text-muted)] truncate">{user.email}</p>
          <span className="inline-block mt-1 text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[var(--cream-dark)] text-[var(--brown)]">
            {profile.role.replace('_', ' ')}
          </span>
        </div>
        <Link
          href="/privasi-saya"
          className="text-[11px] font-bold text-[var(--terra)] hover:underline shrink-0"
        >
          Privasi
        </Link>
      </div>

      {/* Panel pengaturan */}
      <SettingsPanels profile={profile} email={user.email ?? ''} />

      {/* Pintasan ke halaman terkait */}
      <section className="space-y-2">
        <h2 className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-[0.2em] px-1">
          Lainnya
        </h2>
        <div className="card-premium divide-y divide-[var(--cream-dark)] overflow-hidden">
          <ShortcutRow
            href="/keamanan"
            icon={<ShieldCheck size={18} />}
            title="Verifikasi Dua Langkah"
            hint="Autentikator (TOTP) untuk akun ini"
          />
          <ShortcutRow
            href="/privasi-saya"
            icon={<FileText size={18} />}
            title="Data & Privasi Saya"
            hint="Unduh data, ajukan penghapusan"
          />
          <ShortcutRow
            href="/terms"
            icon={<FileText size={18} />}
            title="Syarat & Ketentuan"
            hint="Aturan penggunaan platform"
          />
          <ShortcutRow
            href="/privacy"
            icon={<ShieldCheck size={18} />}
            title="Kebijakan Privasi"
            hint="Cara kami memperlakukan data Anda"
          />
        </div>
      </section>

      {/* Sesi */}
      <section className="space-y-2">
        <h2 className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-[0.2em] px-1">
          Sesi
        </h2>
        <div className="card-premium divide-y divide-[var(--cream-dark)] overflow-hidden">
          <SignOutEverywhere />
        </div>
      </section>

      {/* Zona bahaya */}
      <section className="space-y-2">
        <h2 className="text-[10px] font-bold text-red-600/70 uppercase tracking-[0.2em] px-1">
          Zona Berbahaya
        </h2>
        <div className="card-premium p-5 border-red-200/60">
          <h3 className="text-sm font-bold text-[var(--brown-dark)]">Nonaktifkan akun</h3>
          <p className="text-xs text-[var(--text-muted)] mt-1 leading-relaxed">
            Akun tidak dapat dipakai masuk lagi dan profil disembunyikan dari daftar alumni.
            Data konseling dan doa tetap tersimpan. Hubungi pengurus bila ingin diaktifkan kembali.
          </p>
          <DeactivateAccount />
        </div>
      </section>
    </div>
  )
}

function ShortcutRow({
  href,
  icon,
  title,
  hint,
}: {
  href: string
  icon: React.ReactNode
  title: string
  hint: string
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 px-4 py-3.5 hover:bg-[var(--cream)]/60 transition-colors group"
    >
      <span className="w-9 h-9 rounded-xl bg-[var(--cream)] text-[var(--brown)] flex items-center justify-center shrink-0">
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-bold text-[var(--brown-dark)] group-hover:text-[var(--terra)] transition-colors">
          {title}
        </span>
        <span className="block text-[11px] text-[var(--text-muted)] mt-0.5">{hint}</span>
      </span>
      <ChevronRight size={16} className="text-[var(--text-muted)] shrink-0" />
    </Link>
  )
}

// Diimpor di bawah agar tetap satu berkas — komponen klien terpisah.
import { DeactivateAccount } from './deactivate-account'
