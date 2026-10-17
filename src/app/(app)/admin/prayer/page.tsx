// src/app/(app)/admin/prayer/page.tsx
// Moderasi permohonan doa.
//
// Permohonan doa paling sensitif dari semua konten: isinya sering berupa
// pergumulan pribadi. Karena itu moderator melihat LABEL ANONIM saja, bukan
// nama asli — sama seperti anggota lain. Membuka identitas harus lewat
// prosedur terpisah yang tercatat (lihat /admin/laporan).

import { createClient } from '@/lib/supabase/server'
import { requireAdminPage } from '@/lib/auth-guard'
import { parseListParams } from '@/lib/cms/query'
import { checkSchema } from '@/lib/cms/schema'
import { MigrationBanner } from '@/components/admin/migration-banner'
import { PrayerTable, type PrayerRow } from './prayer-table'

export const dynamic = 'force-dynamic'

const SORTABLE = ['created_at', 'pray_count']

export default async function AdminPrayerPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>
}) {
  await requireAdminPage('moderateContent')
  const supabase = createClient()
  const params = parseListParams(searchParams, {
    sortable: SORTABLE,
    defaultSort: 'created_at',
  })

  const schema = await checkSchema()
  const canModerate = schema.moderation

  let query = canModerate
    ? supabase
        .from('prayer_requests')
        .select(
          'id, content, created_at, pray_count, is_answered, is_anonymous, moderation_status, hidden_reason, deleted_at',
          { count: 'exact' }
        )
    : supabase
        .from('prayer_requests')
        .select(
          'id, content, created_at, pray_count, is_answered, is_anonymous',
          { count: 'exact' }
        )

  if (canModerate) {
    if (params.scope === 'trash') query = query.not('deleted_at', 'is', null)
    else if (params.scope === 'pending')
      query = query.eq('moderation_status', 'pending').is('deleted_at', null)
    else if (params.scope === 'hidden')
      query = query.eq('moderation_status', 'hidden').is('deleted_at', null)
    else if (params.scope === 'answered')
      query = query.eq('is_answered', true).is('deleted_at', null)
    else query = query.is('deleted_at', null)
  } else if (params.scope === 'answered') {
    query = query.eq('is_answered', true)
  }

  if (params.q) {
    const term = params.q.replace(/[,()%]/g, ' ').trim()
    if (term) query = query.ilike('content', `%${term}%`)
  }

  query = query
    .order(params.sort, { ascending: params.dir === 'asc' })
    .range((params.page - 1) * params.pageSize, params.page * params.pageSize - 1)

  const { data, count, error } = await query

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
        Gagal memuat permohonan doa: {error.message}
      </div>
    )
  }

  const rows = (data ?? []) as unknown as Record<string, unknown>[]
  const ids = rows.map((r) => r.id as string)

  // Label penulis dari view publik — bukan nama asli.
  const labelById = new Map<string, string>()
  if (ids.length > 0) {
    const { data: pub } = await supabase
      .from('prayers_public')
      .select('id, anon_label, author_name, is_anonymous')
      .in('id', ids)
    for (const p of (pub ?? []) as unknown as {
      id: string
      anon_label: string | null
      author_name: string | null
      is_anonymous: boolean
    }[]) {
      labelById.set(
        p.id,
        p.is_anonymous ? `Anonim#${p.anon_label ?? '????'}` : (p.author_name ?? 'Pengguna')
      )
    }
  }

  const prayerRows: PrayerRow[] = rows.map((r) => ({
    id: r.id as string,
    content: r.content as string,
    authorLabel: labelById.get(r.id as string) ?? 'Pengguna',
    createdAt: r.created_at as string,
    prayCount: (r.pray_count as number) ?? 0,
    isAnswered: Boolean(r.is_answered),
    status: r.deleted_at ? 'deleted' : ((r.moderation_status as string) ?? 'visible'),
    hiddenReason: (r.hidden_reason as string | null) ?? null,
    inTrash: Boolean(r.deleted_at),
  }))

  return (
    <div className="space-y-3">
      {!canModerate && <MigrationBanner file="supabase/cms-superadmin.sql" />}
      <PrayerTable
        rows={prayerRows}
        total={count ?? 0}
        page={params.page}
        pageSize={params.pageSize}
        sort={params.sort}
        dir={params.dir}
        q={params.q}
        scope={params.scope}
        canModerate={canModerate}
      />
    </div>
  )
}
