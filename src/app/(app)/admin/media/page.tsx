// src/app/(app)/admin/media/page.tsx
// Media & penyimpanan (M12).

import { createClient } from '@/lib/supabase/server'
import { requireAdminPage } from '@/lib/auth-guard'
import { MediaConsole } from './media-console'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Media | IKA UPK-Kr FT UNSRAT' }

/** Kuota per pengguna. Satu angka di satu tempat, bukan tersebar di UI. */
const QUOTA_BYTES = 50 * 1024 * 1024

export default async function MediaPage() {
  await requireAdminPage('manageMedia')
  const supabase = createClient()

  const [usageRes, orphanRes, profilesRes] = await Promise.all([
    supabase.rpc('storage_usage_by_user'),
    supabase
      .from('attachments')
      .select('id, owner_id, title, mime_type, size_bytes, created_at')
      .eq('is_orphan', true)
      .order('created_at', { ascending: false })
      .limit(100),
    supabase.from('profiles').select('id, full_name, role').eq('is_active', true),
  ])

  if (usageRes.error) {
    return (
      <div className="card-premium p-6">
        <h1 className="text-lg font-bold text-[var(--brown-dark)]">Media</h1>
        <p className="mt-2 text-sm text-[var(--text-muted)]">{usageRes.error.message}</p>
        <p className="mt-2 text-xs text-[var(--text-muted)]">
          Jalankan <code className="rounded bg-[var(--cream)] px-1">supabase/phase4-advanced-modules.sql</code> lebih dulu.
        </p>
      </div>
    )
  }

  const usage = (usageRes.data ?? []) as { user_id: string; file_count: number; total_bytes: number }[]
  const profiles = profilesRes.data ?? []
  const nameOf = new Map(profiles.map((p) => [p.id, p.full_name]))

  const rows = usage
    .map((u) => ({
      userId: u.user_id,
      name: nameOf.get(u.user_id) ?? 'Pengguna dihapus',
      fileCount: Number(u.file_count),
      totalBytes: Number(u.total_bytes),
      overQuota: Number(u.total_bytes) > QUOTA_BYTES,
    }))
    .sort((a, b) => b.totalBytes - a.totalBytes)

  const totalBytes = rows.reduce((n, r) => n + r.totalBytes, 0)
  const totalFiles = rows.reduce((n, r) => n + r.fileCount, 0)

  return (
    <MediaConsole
      rows={rows}
      totalBytes={totalBytes}
      totalFiles={totalFiles}
      quotaBytes={QUOTA_BYTES}
      orphans={(orphanRes.data ?? []) as OrphanRow[]}
    />
  )
}

export type OrphanRow = {
  id: string
  owner_id: string
  title: string | null
  mime_type: string | null
  size_bytes: number | null
  created_at: string
}
