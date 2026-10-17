// src/app/(app)/admin/layout.tsx
// Gerbang RBAC untuk seluruh area /admin.
//
// Ini kontrol SEBENARNYA: halaman anak boleh saja merender UI apa pun, tetapi
// request tidak akan pernah sampai ke sana kalau peran pengguna di bawah admin.
// Setiap Server Action tetap memeriksa ulang sendiri (lihat lib/auth-guard.ts).

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { hasMinRole, can, type Capability } from '@/lib/rbac'
import type { Profile } from '@/types/database'
import { AdminNav, type NavGroup } from './admin-nav'

export const dynamic = 'force-dynamic'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  const p = profile as Profile | null
  if (!p) redirect('/auth/setup-error')

  // Anggota & konselor tidak punya urusan di panel admin.
  if (!hasMinRole(p.role, 'moderator')) {
    redirect('/dashboard')
  }

  const allow = (cap: Capability) => can(p.role, cap)

  // Menu dibangun dari kemampuan nyata peran yang sedang masuk. Menu yang
  // tidak bisa diakses tidak ditampilkan — kenyamanan, bukan keamanan.
  const groups: NavGroup[] = [
    {
      title: 'Ringkasan',
      items: [
        { href: '/admin', label: 'Dasbor', icon: 'dashboard' },
        ...(allow('manageReports')
          ? [
              { href: '/admin/laporan-modul', label: 'Antrean Laporan', icon: 'reportsQueue' as const },
              { href: '/admin/laporan', label: 'Panel Moderasi', icon: 'reports' as const },
            ]
          : []),
      ],
    },
    {
      title: 'Moderasi',
      items: [
        ...(allow('moderateContent')
          ? [
              { href: '/admin/forum', label: 'Forum', icon: 'forum' as const },
              { href: '/admin/prayer', label: 'Permohonan Doa', icon: 'prayer' as const },
            ]
          : []),
        ...(allow('manageSiteContent')
          ? [{ href: '/admin/artikel', label: 'Tulis Artikel', icon: 'write' as const }]
          : []),
        ...(allow('approveArticles')
          ? [{ href: '/admin/articles', label: 'Antrean Artikel', icon: 'articles' as const }]
          : []),
        ...(allow('manageCategories')
          ? [{ href: '/admin/kategori', label: 'Kategori', icon: 'categories' as const }]
          : []),
        ...(allow('moderateContent')
          ? [{ href: '/admin/kata-terlarang', label: 'Kata Terlarang', icon: 'banned' as const }]
          : []),
        ...(allow('restoreContent')
          ? [{ href: '/admin/sampah', label: 'Tempat Sampah', icon: 'trash' as const }]
          : []),
      ],
    },
    {
      title: 'Pengguna',
      items: [
        ...(allow('manageUsers')
          ? [{ href: '/admin/pengguna', label: 'Pengguna', icon: 'users' as const }]
          : []),
        ...(allow('approveKonselor')
          ? [{ href: '/admin/konselor', label: 'Konselor', icon: 'konselor' as const }]
          : []),
        ...(allow('manageAdmins')
          ? [{ href: '/admin/kelola-admin', label: 'Kelola Admin', icon: 'admins' as const }]
          : []),
      ],
    },
    {
      title: 'Situs',
      items: [
        ...(allow('manageSettings')
          ? [
              { href: '/admin/pengaturan', label: 'Pengaturan', icon: 'settings' as const },
              { href: '/admin/hotline', label: 'Hotline Darurat', icon: 'hotlines' as const },
              { href: '/admin/legal', label: 'Dokumen Legal', icon: 'legal' as const },
            ]
          : []),
        ...(allow('viewAuditLog')
          ? [{ href: '/admin/audit', label: 'Jejak Audit', icon: 'audit' as const }]
          : []),
      ],
    },
  ].filter((g) => g.items.length > 0)

  return (
    <div className="flex flex-col lg:flex-row gap-6">
      {/* Sidebar: di layar kecil jadi baris gulir horizontal di atas konten.
          Tidak ada header sendiri di sini — AppShell sudah menyediakan Topbar
          beserta judul halaman ("Panel Admin"). */}
      <aside className="lg:w-56 lg:shrink-0">
        <div className="lg:sticky lg:top-20">
          <div className="hidden lg:block">
            <AdminNav groups={groups} />
          </div>
          {/* Versi ringkas untuk ponsel */}
          <div className="lg:hidden -mx-1 overflow-x-auto">
            <div className="flex gap-1.5 pb-1 w-max">
              {groups.flatMap((g) => g.items).map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  className="whitespace-nowrap rounded-full border border-[var(--cream-dark)] bg-[var(--surface)] px-3 py-1.5 text-xs font-medium text-[var(--text-2)]"
                >
                  {item.label}
                </a>
              ))}
            </div>
          </div>
        </div>
      </aside>

      <main className="flex-1 min-w-0">{children}</main>
    </div>
  )
}
