// src/app/(app)/admin/pengguna/page.tsx
// Daftar pengguna: cari, urutkan, ubah peran, aktif/nonaktif.
//
// Catatan privasi: kolom yang ditampilkan hanya yang memang dibutuhkan untuk
// mengambil keputusan administratif (nama, angkatan, jurusan, peran, status).
// Tidak ada token anonim atau data sesi konseling di sini.

import { createClient } from '@/lib/supabase/server'
import { requireAdminPage } from '@/lib/auth-guard'
import { can } from '@/lib/rbac'
import { parseListParams } from '@/lib/cms/query'
import { UsersTable, type UserRow } from './users-table'

export const dynamic = 'force-dynamic'

const SORTABLE = ['created_at', 'full_name', 'role']

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>
}) {
  const { profile } = await requireAdminPage('manageUsers')
  const supabase = createClient()
  const params = parseListParams(searchParams, {
    sortable: SORTABLE,
    defaultSort: 'created_at',
  })

  let query = supabase
    .from('profiles')
    .select('id, full_name, role, angkatan, jurusan, is_active, is_verified, created_at', {
      count: 'exact',
    })

  if (params.scope === 'inactive') query = query.eq('is_active', false)
  else if (params.scope === 'staff')
    query = query.in('role', ['super_admin', 'admin', 'moderator'])
  else if (params.scope === 'konselor') query = query.eq('role', 'konselor')

  if (params.q) {
    const term = params.q.replace(/[,()%]/g, ' ').trim()
    if (term) query = query.or(`full_name.ilike.%${term}%,angkatan.ilike.%${term}%,jurusan.ilike.%${term}%`)
  }

  query = query
    .order(params.sort, { ascending: params.dir === 'asc' })
    .range((params.page - 1) * params.pageSize, params.page * params.pageSize - 1)

  const { data, count, error } = await query

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
        Gagal memuat pengguna: {error.message}
      </div>
    )
  }

  const rows: UserRow[] = ((data ?? []) as unknown as Record<string, unknown>[]).map((r) => ({
    id: r.id as string,
    fullName: r.full_name as string,
    role: r.role as UserRow['role'],
    angkatan: (r.angkatan as string | null) ?? null,
    jurusan: (r.jurusan as string | null) ?? null,
    isActive: Boolean(r.is_active),
    isVerified: Boolean(r.is_verified),
    createdAt: r.created_at as string,
    isSelf: r.id === profile.id,
  }))

  return (
    <UsersTable
      rows={rows}
      total={count ?? 0}
      page={params.page}
      pageSize={params.pageSize}
      sort={params.sort}
      dir={params.dir}
      q={params.q}
      scope={params.scope}
      viewerRole={profile.role}
      canManageRoles={can(profile.role, 'manageUsers')}
      canBan={can(profile.role, 'banUsers')}
    />
  )
}
