// src/app/(app)/admin/audit/page.tsx
// Jejak audit — siapa melakukan apa, kapan, dari mana, dan mengapa.
//
// Tabel audit_log bersifat APPEND-ONLY (lihat supabase/cms-superadmin.sql):
// tidak ada policy UPDATE/DELETE, jadi isinya tidak bisa diubah dari aplikasi
// bahkan oleh super admin. Halaman ini hanya membaca.

import { createClient } from '@/lib/supabase/server'
import { requireAdminPage } from '@/lib/auth-guard'
import { parseListParams } from '@/lib/cms/query'
import { MigrationBanner } from '@/components/admin/migration-banner'
import type { AuditAction } from '@/types/database'
import { AuditTable, type AuditRow } from './audit-table'

export const dynamic = 'force-dynamic'

export default async function AdminAuditPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>
}) {
  await requireAdminPage('viewAuditLog')
  const supabase = createClient()
  const params = parseListParams(searchParams, {
    sortable: ['created_at'],
    defaultSort: 'created_at',
  })

  let query = supabase
    .from('audit_log')
    .select(
      'id, actor_id, actor_role, action, entity, entity_id, before, after, reason, ip, user_agent, created_at',
      { count: 'exact' }
    )

  if (params.scope && params.scope !== 'all') query = query.eq('action', params.scope as AuditAction)
  if (params.filter && params.filter !== 'all') query = query.eq('entity', params.filter)

  if (params.q) {
    const term = params.q.replace(/[,()%]/g, ' ').trim()
    if (term) query = query.or(`entity.ilike.%${term}%,reason.ilike.%${term}%`)
  }

  query = query
    .order('created_at', { ascending: params.dir === 'asc' })
    .range((params.page - 1) * params.pageSize, params.page * params.pageSize - 1)

  const { data, count, error } = await query

  if (error) {
    // Kolom before/after/reason/ip/user_agent baru ada setelah migrasi Fase 2.
    const missingV2 = error.message.includes('before') || error.message.includes('reason')
    return (
      <div className="space-y-4">
        <header>
          <h1 className="text-xl font-bold text-[var(--brown-dark)]">Jejak Audit</h1>
        </header>
        {missingV2 ? (
          <MigrationBanner file="supabase/cms-superadmin.sql" detail={error.message} />
        ) : (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            Gagal memuat jejak audit: {error.message}
          </div>
        )}
      </div>
    )
  }

  // Ambil nama pelaku dalam satu query terpisah — audit_log tidak punya FK
  // ke profiles (sengaja: baris audit harus tetap ada walau akun dihapus).
  const actorIds = Array.from(
    new Set(
      ((data ?? []) as unknown as { actor_id: string | null }[])
        .map((r) => r.actor_id)
        .filter((x): x is string => Boolean(x))
    )
  )
  const names = new Map<string, string>()
  if (actorIds.length > 0) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name')
      .in('id', actorIds)
    for (const p of (profiles ?? []) as unknown as { id: string; full_name: string }[]) {
      names.set(p.id, p.full_name)
    }
  }

  const rows: AuditRow[] = ((data ?? []) as unknown as Record<string, unknown>[]).map((r) => ({
    id: r.id as string,
    actorName: r.actor_id ? (names.get(r.actor_id as string) ?? '(akun terhapus)') : 'Sistem',
    actorRole: (r.actor_role as AuditRow['actorRole']) ?? null,
    action: r.action as string,
    entity: r.entity as string,
    entityId: (r.entity_id as string | null) ?? null,
    before: (r.before as Record<string, unknown> | null) ?? null,
    after: (r.after as Record<string, unknown> | null) ?? null,
    reason: (r.reason as string | null) ?? null,
    ip: (r.ip as string | null) ?? null,
    userAgent: (r.user_agent as string | null) ?? null,
    createdAt: r.created_at as string,
  }))

  return (
    <AuditTable
      rows={rows}
      total={count ?? 0}
      page={params.page}
      pageSize={params.pageSize}
      sort={params.sort}
      dir={params.dir}
      q={params.q}
      scope={params.scope}
      filter={params.filter}
    />
  )
}
