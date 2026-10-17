// src/app/(app)/admin/laporan-modul/page.tsx
// Antrean laporan konten (M8).
//
// Laporan digabung per KONTEN, bukan per laporan: lima orang melaporkan thread
// yang sama adalah satu masalah, bukan lima pekerjaan. Mengelompokkan begini
// membuat antrean mencerminkan beban kerja sebenarnya.

import { createClient } from '@/lib/supabase/server'
import { requireAdminPage } from '@/lib/auth-guard'
import { parseListParams } from '@/lib/cms/query'
import { MigrationBanner } from '@/components/admin/migration-banner'
import { ReportQueue, type ReportGroup } from './report-queue'

export const dynamic = 'force-dynamic'

/** Kolom teks yang dipakai sebagai pratinjau per jenis konten. */
const PREVIEW_SELECT: Record<string, string> = {
  thread: 'id, title, content',
  comment: 'id, content',
  prayer: 'id, content',
  article: 'id, title',
  message: 'id, content',
}

const TABLE_BY_TYPE: Record<string, string> = {
  thread: 'threads',
  comment: 'comments',
  prayer: 'prayer_requests',
  article: 'articles',
  message: 'cell_group_messages',
}

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>
}) {
  await requireAdminPage('manageReports')
  const supabase = createClient()
  const params = parseListParams(searchParams, {
    defaultSort: 'created_at',
    sortable: ['created_at', 'severity'],
  })

  let query = supabase
    .from('content_reports')
    .select(
      'id, content_type, content_id, reason, detail, status, severity, created_at, reporter_id, reviewed_at, resolution, action_taken',
      { count: 'exact' }
    )

  if (params.scope === 'resolved') query = query.in('status', ['resolved', 'dismissed'])
  else if (params.scope === 'reviewed') query = query.eq('status', 'reviewed')
  else if (params.scope === 'high') query = query.eq('severity', 'high').eq('status', 'pending')
  else query = query.eq('status', 'pending')

  const { data, error, count } = await query
    .order('created_at', { ascending: false })
    .limit(300)

  if (error) {
    return (
      <div className="space-y-3">
        <h1 className="text-xl font-bold text-[var(--brown-dark)]">Laporan Konten</h1>
        <MigrationBanner file="supabase/phase3-content-modules.sql" detail={error.message} />
      </div>
    )
  }

  const reports = (data ?? []) as unknown as Record<string, unknown>[]

  // ── Kelompokkan per konten ──
  const groups = new Map<string, ReportGroup>()
  for (const r of reports) {
    const type = r.content_type as string
    const contentId = r.content_id as string
    const key = `${type}:${contentId}`
    const g = groups.get(key) ?? {
      key,
      contentType: type,
      contentId,
      reports: [],
      severity: 'normal',
      preview: null,
      title: null,
      authorLabel: null,
      status: r.status as string,
    }
    g.reports.push({
      id: r.id as string,
      reason: r.reason as string,
      detail: (r.detail as string | null) ?? null,
      createdAt: r.created_at as string,
      status: r.status as string,
      resolution: (r.resolution as string | null) ?? null,
      actionTaken: (r.action_taken as string | null) ?? null,
    })
    if (r.severity === 'high') g.severity = 'high'
    groups.set(key, g)
  }

  // ── Ambil pratinjau konten dalam satu query per jenis ──
  const byType = new Map<string, string[]>()
  for (const g of Array.from(groups.values())) {
    const list = byType.get(g.contentType) ?? []
    list.push(g.contentId)
    byType.set(g.contentType, list)
  }

  await Promise.all(
    Array.from(byType.entries()).map(async ([type, ids]) => {
      const table = TABLE_BY_TYPE[type]
      const cols = PREVIEW_SELECT[type]
      if (!table || !cols || ids.length === 0) return
      const { data: rows } = await supabase.from(table as 'threads').select(cols).in('id', ids)
      for (const row of (rows ?? []) as unknown as Record<string, unknown>[]) {
        const g = groups.get(`${type}:${row.id}`)
        if (!g) continue
        g.title = (row.title as string | null) ?? null
        g.preview = String(row.content ?? row.title ?? '').slice(0, 400)
      }
    })
  )

  // Label penulis dari view publik, agar moderator tidak melihat identitas
  // penulis anonim.
  const threadIds = Array.from(groups.values())
    .filter((g) => g.contentType === 'thread')
    .map((g) => g.contentId)
  if (threadIds.length > 0) {
    const { data: pub } = await supabase
      .from('threads_public')
      .select('id, anon_label, author_name, is_anonymous')
      .in('id', threadIds)
    for (const p of (pub ?? []) as unknown as {
      id: string
      anon_label: string | null
      author_name: string | null
      is_anonymous: boolean
    }[]) {
      const g = groups.get(`thread:${p.id}`)
      if (g) {
        g.authorLabel = p.is_anonymous
          ? `Anonim#${p.anon_label ?? '????'}`
          : (p.author_name ?? 'Pengguna')
      }
    }
  }

  const list = Array.from(groups.values()).sort((a, b) => {
    // Prioritas tinggi dulu, lalu yang paling banyak dilaporkan, lalu terbaru.
    if (a.severity !== b.severity) return a.severity === 'high' ? -1 : 1
    if (a.reports.length !== b.reports.length) return b.reports.length - a.reports.length
    return (b.reports[0]?.createdAt ?? '').localeCompare(a.reports[0]?.createdAt ?? '')
  })

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-xl font-bold text-[var(--brown-dark)]">Laporan Konten</h1>
        <p className="text-sm text-[var(--text-muted)] mt-1">
          Dikelompokkan per konten — beberapa laporan untuk konten yang sama adalah satu
          pekerjaan. Pelapor otomatis diberi tahu hasilnya.
        </p>
      </header>

      <ReportQueue groups={list} total={count ?? 0} scope={params.scope} />
    </div>
  )
}
