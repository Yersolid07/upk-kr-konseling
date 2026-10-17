// src/app/(app)/admin/forum/page.tsx
// Moderasi forum: daftar diskusi dengan pencarian, urutan, paginasi, dan panel
// detail. Semua parameter daftar hidup di URL sehingga bisa dibagikan/di-bookmark.
//
// Server Component ini hanya MENYIAPKAN data; tabel dan aksinya di
// forum-table.tsx (klien). Aksi moderasi sendiri adalah Server Action ber-guard
// di src/lib/cms/content-actions.ts.

import { createClient } from '@/lib/supabase/server'
import { requireAdminPage } from '@/lib/auth-guard'
import { parseListParams } from '@/lib/cms/query'
import { checkSchema } from '@/lib/cms/schema'
import { MigrationBanner } from '@/components/admin/migration-banner'
import { ForumTable, type ForumRow } from './forum-table'

export const dynamic = 'force-dynamic'

/** Kolom urutan yang diizinkan — nama kolom dari URL tidak boleh bebas. */
const SORTABLE = ['created_at', 'comment_count', 'view_count', 'title'] as const

export default async function AdminForumPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>
}) {
  await requireAdminPage('moderateContent')
  const supabase = createClient()
  const params = parseListParams(searchParams, {
    sortable: SORTABLE as unknown as string[],
    defaultSort: 'created_at',
  })

  // Sebelum migrasi Fase 2, kolom moderasi belum ada. Membacanya akan membuat
  // PostgREST menolak SELURUH query, jadi daftar dasar tetap ditampilkan dan
  // tindakan moderasi dinonaktifkan sampai migrasi dijalankan.
  const schema = await checkSchema()
  const canModerate = schema.moderation

  let query = canModerate
    ? supabase
        .from('threads')
        .select(
          'id, title, content, created_at, comment_count, view_count, is_pinned, is_locked, is_flagged, is_anonymous, moderation_status, hidden_reason, deleted_at, author_id, category:thread_categories(name)',
          { count: 'exact' }
        )
    : supabase
        .from('threads')
        .select(
          'id, title, content, created_at, comment_count, view_count, is_pinned, is_locked, is_flagged, is_anonymous, author_id, category:thread_categories(name)',
          { count: 'exact' }
        )

  // Lingkup: aktif / disembunyikan / ditandai / tempat sampah.
  if (canModerate) {
    if (params.scope === 'trash') query = query.not('deleted_at', 'is', null)
    else if (params.scope === 'hidden')
      query = query.eq('moderation_status', 'hidden').is('deleted_at', null)
    else if (params.scope === 'flagged')
      query = query.eq('is_flagged', true).is('deleted_at', null)
    else query = query.is('deleted_at', null)
  } else if (params.scope === 'flagged') {
    query = query.eq('is_flagged', true)
  }

  if (params.q) {
    // Buang karakter yang mengubah sintaks filter PostgREST.
    const term = params.q.replace(/[,()%]/g, ' ').trim()
    if (term) query = query.or(`title.ilike.%${term}%,content.ilike.%${term}%`)
  }

  query = query
    .order(params.sort, { ascending: params.dir === 'asc' })
    .range((params.page - 1) * params.pageSize, params.page * params.pageSize - 1)

  const { data, count, error } = await query

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
        Gagal memuat diskusi: {error.message}
      </div>
    )
  }
  // Label penulis diambil dari view publik supaya moderator TIDAK melihat
  // identitas penulis anonim. Lihat supabase/phase1-data-security.sql.
  const rows = (data ?? []) as unknown as Record<string, unknown>[]
  const ids = rows.map((r) => r.id as string)

  const labelById = new Map<string, { label: string; author: string | null }>()
  if (ids.length > 0) {
    const { data: pub } = await supabase
      .from('threads_public')
      .select('id, anon_label, author_name, is_anonymous')
      .in('id', ids)
    for (const p of (pub ?? []) as unknown as {
      id: string
      anon_label: string | null
      author_name: string | null
      is_anonymous: boolean
    }[]) {
      labelById.set(p.id, {
        label: p.is_anonymous ? `Anonim#${p.anon_label ?? '????'}` : (p.author_name ?? 'Pengguna'),
        author: p.author_name,
      })
    }
  }

  const forumRows: ForumRow[] = rows.map((r) => {
    const info = labelById.get(r.id as string)
    const cat = r.category as { name?: string } | null
    return {
      id: r.id as string,
      title: r.title as string,
      excerpt: String(r.content ?? '').slice(0, 140),
      authorLabel: info?.label ?? 'Pengguna',
      categoryName: cat?.name ?? null,
      createdAt: r.created_at as string,
      commentCount: (r.comment_count as number) ?? 0,
      viewCount: (r.view_count as number) ?? 0,
      isPinned: Boolean(r.is_pinned),
      isLocked: Boolean(r.is_locked),
      isFlagged: Boolean(r.is_flagged),
      status: r.deleted_at ? 'deleted' : ((r.moderation_status as string) ?? 'visible'),
      hiddenReason: (r.hidden_reason as string | null) ?? null,
      inTrash: Boolean(r.deleted_at),
    }
  })

  return (
    <div className="space-y-3">
      {!canModerate && <MigrationBanner file="supabase/cms-superadmin.sql" />}
      <ForumTable
        rows={forumRows}
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
