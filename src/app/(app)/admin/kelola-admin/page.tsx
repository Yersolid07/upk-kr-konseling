// src/app/(app)/admin/kelola-admin/page.tsx
// Daftar akun berperan tinggi (super_admin, admin, moderator).
//
// Halaman terpisah dari /admin/pengguna karena risikonya berbeda: daftar ini
// adalah daftar orang yang bisa mengubah apa pun. Hanya super_admin dan admin
// yang boleh membukanya, dan perubahan peran super_admin dibatasi.

import { createClient } from '@/lib/supabase/server'
import { requireAdminPage } from '@/lib/auth-guard'
import { can } from '@/lib/rbac'
import type { Profile } from '@/types/database'
import { AdminList } from './admin-list'

export const dynamic = 'force-dynamic'

export default async function ManageAdminsPage() {
  const { profile } = await requireAdminPage('manageAdmins')
  const supabase = createClient()

  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, role, is_active, created_at')
    .in('role', ['super_admin', 'admin', 'moderator'])
    .order('role', { ascending: false })

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
        Gagal memuat daftar admin: {error.message}
      </div>
    )
  }

  const admins = (data ?? []) as unknown as Profile[]
  const superCount = admins.filter((a) => a.role === 'super_admin').length

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-xl font-bold text-[var(--brown-dark)]">Kelola Admin</h1>
        <p className="text-sm text-[var(--text-muted)] mt-1">
          Akun yang bisa mengubah isi dan pengaturan situs. Perubahan tercatat di jejak audit.
        </p>
      </header>

      {superCount <= 1 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-900">
          <strong>Hanya ada {superCount} super admin.</strong> Bila akun ini tidak bisa
          masuk, tidak ada yang bisa memulihkan akses lewat aplikasi. Pertimbangkan
          menambah satu super admin lagi.
        </div>
      )}

      <AdminList
        admins={admins}
        viewerId={profile.id}
        viewerRole={profile.role}
        canManageRoles={can(profile.role, 'manageUsers')}
      />
    </div>
  )
}
