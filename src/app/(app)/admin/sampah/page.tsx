// src/app/(app)/admin/sampah/page.tsx
// Tempat sampah lintas tabel.
//
// Semua tabel konten berbagi kolom deleted_at, jadi satu halaman bisa
// menampilkan semuanya. Ini penting: tanpa daftar terpusat, admin harus
// menebak modul mana yang menyimpan konten yang sudah dihapus.

import { createClient } from '@/lib/supabase/server'
import { requireAdminPage } from '@/lib/auth-guard'
import { can } from '@/lib/rbac'
import { CONTENT_TABLES, type ContentTable } from '@/lib/cms/content-tables'
import { checkSchema } from '@/lib/cms/schema'
import { MigrationBanner } from '@/components/admin/migration-banner'
import { TrashList, type TrashItem } from './trash-list'

export const dynamic = 'force-dynamic'

/** Kolom teks yang dipakai sebagai ringkasan tiap tabel. */
const PREVIEW: Record<ContentTable, string> = {
  threads: 'title',
  comments: 'content',
  prayer_requests: 'content',
  articles: 'title',
  cell_groups: 'name',
  cell_group_messages: 'content',
}

export default async function TrashPage() {
  const { profile } = await requireAdminPage('restoreContent')
  const supabase = createClient()

  // Tanpa kolom deleted_at, daftar ini tidak mungkin diisi — tampilkan
  // pemberitahuan migrasi alih-alih enam pesan error berturut-turut.
  const schema = await checkSchema()
  if (!schema.moderation) {
    return (
      <div className="space-y-4">
        <header>
          <h1 className="text-xl font-bold text-[var(--brown-dark)]">Tempat Sampah</h1>
        </header>
        <MigrationBanner file="supabase/cms-superadmin.sql" />
      </div>
    )
  }

  const tables = Object.keys(CONTENT_TABLES) as ContentTable[]

  // Satu query per tabel, dijalankan paralel.
  const results = await Promise.all(
    tables.map(async (table) => {
      const cols = `id, ${PREVIEW[table]}, deleted_at, delete_reason, deleted_by`
      const { data, error } = await supabase
        .from(table)
        .select(cols)
        .not('deleted_at', 'is', null)
        .order('deleted_at', { ascending: false })
        .limit(50)
      return { table, data: (data ?? []) as unknown as Record<string, unknown>[], error }
    })
  )

  const items: TrashItem[] = []
  const failed: string[] = []

  for (const r of results) {
    if (r.error) {
      failed.push(r.table)
      continue
    }
    for (const row of r.data) {
      items.push({
        table: r.table,
        id: row.id as string,
        preview: String(row[PREVIEW[r.table]] ?? '(tanpa judul)').slice(0, 200),
        deletedAt: row.deleted_at as string,
        reason: (row.delete_reason as string | null) ?? null,
        deletedBy: (row.deleted_by as string | null) ?? null,
      })
    }
  }

  items.sort((a, b) => b.deletedAt.localeCompare(a.deletedAt))

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-xl font-bold text-[var(--brown-dark)]">Tempat Sampah</h1>
        <p className="text-sm text-[var(--text-muted)] mt-1">
          Konten yang dihapus staf tetap tersimpan di sini dan bisa dipulihkan.
          Hapus permanen hanya tersedia bagi super admin.
        </p>
      </header>

      {failed.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-900">
          Sebagian tabel belum bisa dibaca ({failed.join(', ')}). Kemungkinan migrasi
          <code className="mx-1 font-mono">cms-superadmin.sql</code> belum dijalankan.
        </div>
      )}

      <TrashList items={items} canPurge={can(profile.role, 'purgeContent')} />
    </div>
  )
}
