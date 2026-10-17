// src/app/(app)/admin/kk-ktb/page.tsx
// Daftar grup KK & KTB (M6).
//
// Halaman ini sengaja menampilkan HAL YANG PERLU DIPERHATIKAN lebih dulu:
// grup tanpa pemimpin, grup yang penuh, dan grup yang sudah diarsipkan tetapi
// masih punya anggota. Daftar biasa akan menyembunyikan ketiganya di antara
// puluhan baris yang tidak butuh tindakan.

import { createClient } from '@/lib/supabase/server'
import { requireAdminPage } from '@/lib/auth-guard'
import { can } from '@/lib/rbac'
import { GroupManager, type GroupRow, type LeaderOption } from './group-manager'

export const dynamic = 'force-dynamic'

export default async function KkKtbPage() {
  const { profile } = await requireAdminPage('manageCellGroups')
  const supabase = createClient()

  const { data: groups, error } = await supabase
    .from('cell_groups')
    .select('id, name, description, leader_id, invite_code, invite_code_required, max_members, is_active, is_archived, created_at')
    .order('is_archived', { ascending: true })
    .order('name', { ascending: true })

  if (error) {
    return (
      <div className="card-premium p-6">
        <h1 className="text-lg font-bold text-[var(--brown-dark)]">KK &amp; KTB</h1>
        <p className="mt-2 text-sm text-[var(--text-muted)]">
          Gagal memuat grup: {error.message}
        </p>
        <p className="mt-2 text-xs text-[var(--text-muted)]">
          Bila pesan menyebut kolom tidak ada, jalankan migrasi
          <code className="mx-1 rounded bg-[var(--cream)] px-1">phase4-advanced-modules.sql</code>
          lebih dulu.
        </p>
      </div>
    )
  }

  const ids = (groups ?? []).map((g) => g.id)

  // Anggota diambil sekaligus untuk semua grup — satu kueri, bukan N kueri.
  const { data: members } = ids.length
    ? await supabase
        .from('cell_group_members')
        .select('group_id, user_id, is_leader, joined_at')
        .in('group_id', ids)
    : { data: [] as { group_id: string; user_id: string; is_leader: boolean; joined_at: string }[] }

  const userIds = Array.from(new Set((members ?? []).map((m) => m.user_id)))
  const { data: profiles } = userIds.length
    ? await supabase.from('profiles').select('id, full_name, role').in('id', userIds)
    : { data: [] as { id: string; full_name: string; role: string }[] }

  const nameById = new Map((profiles ?? []).map((p) => [p.id, p.full_name]))

  // Calon pemimpin: konselor ke atas. Pemimpin grup adalah pembina, bukan
  // sekadar anggota yang paling aktif.
  const { data: leaders } = await supabase
    .from('profiles')
    .select('id, full_name, role')
    .in('role', ['konselor', 'moderator', 'admin', 'super_admin'])
    .order('full_name')

  const leaderOptions: LeaderOption[] = (leaders ?? []).map((l) => ({
    id: l.id,
    name: l.full_name,
    role: l.role,
  }))

  const byGroup = new Map<string, { userId: string; isLeader: boolean; joinedAt: string }[]>()
  for (const m of members ?? []) {
    const arr = byGroup.get(m.group_id) ?? []
    arr.push({ userId: m.user_id, isLeader: m.is_leader, joinedAt: m.joined_at })
    byGroup.set(m.group_id, arr)
  }

  const rows: GroupRow[] = (groups ?? []).map((g) => {
    const list = byGroup.get(g.id) ?? []
    return {
      id: g.id,
      name: g.name,
      description: g.description,
      leaderId: g.leader_id,
      leaderName: g.leader_id ? nameById.get(g.leader_id) ?? 'Tidak diketahui' : null,
      inviteCode: g.invite_code,
      inviteCodeRequired: g.invite_code_required,
      maxMembers: g.max_members,
      isActive: g.is_active,
      isArchived: g.is_archived,
      memberCount: list.length,
      members: list
        .map((m) => ({
          userId: m.userId,
          name: nameById.get(m.userId) ?? 'Tidak diketahui',
          isLeader: m.isLeader,
          joinedAt: m.joinedAt,
        }))
        .sort((a, b) => Number(b.isLeader) - Number(a.isLeader) || a.name.localeCompare(b.name)),
    }
  })

  return (
    <GroupManager
      groups={rows}
      leaders={leaderOptions}
      canDelete={can(profile.role, 'purgeContent')}
    />
  )
}
