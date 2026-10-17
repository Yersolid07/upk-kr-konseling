// src/app/(app)/admin/artikel/page.tsx
// Daftar artikel untuk staf — semua status, dengan pintasan menyunting.

import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { requireAdminPage } from '@/lib/auth-guard'
import { checkSchema } from '@/lib/cms/schema'
import { MigrationBanner } from '@/components/admin/migration-banner'
import { Plus, Newspaper, ExternalLink } from 'lucide-react'
import { formatDateTime } from '@/lib/utils'
import { ArticleList, type ArticleRow } from './article-list'

export const dynamic = 'force-dynamic'

export default async function AdminArticlesEditorPage() {
  await requireAdminPage('manageSiteContent')
  const supabase = createClient()
  const schema = await checkSchema()

  const { data, error } = await supabase
    .from('articles')
    .select(
      'id, title, slug, status, is_featured, published_at, created_at, updated_at, read_count, author_id, cover_url'
    )
    .order('updated_at', { ascending: false })
    .limit(200)

  if (error) {
    return (
      <div className="space-y-3">
        <h1 className="text-xl font-bold text-[var(--brown-dark)]">Artikel</h1>
        <MigrationBanner file="supabase/phase3-content-modules.sql" detail={error.message} />
      </div>
    )
  }

  const rows = (data ?? []) as unknown as Record<string, unknown>[]

  // Nama penulis — hanya yang tampil di publik, bukan data sensitif.
  const authorIds = Array.from(new Set(rows.map((r) => r.author_id as string).filter(Boolean)))
  const names = new Map<string, string>()
  if (authorIds.length > 0) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name')
      .in('id', authorIds)
    for (const p of (profiles ?? []) as { id: string; full_name: string }[]) {
      names.set(p.id, p.full_name)
    }
  }

  const articles: ArticleRow[] = rows.map((r) => ({
    id: r.id as string,
    title: r.title as string,
    slug: r.slug as string,
    status: r.status as string,
    isFeatured: Boolean(r.is_featured),
    publishedAt: (r.published_at as string | null) ?? null,
    updatedAt: r.updated_at as string,
    readCount: Number(r.read_count ?? 0),
    authorName: names.get(r.author_id as string) ?? 'Tim',
  }))

  return (
    <div className="space-y-4">
      <header className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-[var(--brown-dark)]">Artikel</h1>
          <p className="text-sm text-[var(--text-muted)] mt-1">
            Tulis dan sunting artikel, atur status terbit, dan kembalikan ke versi sebelumnya.
            Setiap perubahan menyimpan versi lama secara otomatis.
          </p>
        </div>
        <Link
          href="/admin/artikel/baru"
          className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--brown-dark)] px-4 py-2 text-xs font-semibold text-[var(--cream)]"
        >
          <Plus size={14} /> Artikel baru
        </Link>
      </header>

      {!schema.moderation && <MigrationBanner file="supabase/cms-superadmin.sql" />}
      {!schema.articleRevisions && (
        <MigrationBanner
          file="supabase/phase3-content-modules.sql"
          detail="Tabel article_revisions belum ada — riwayat revisi belum aktif. Artikel tetap bisa disunting."
        />
      )}

      {articles.length === 0 ? (
        <div className="card-premium px-6 py-14 text-center">
          <Newspaper size={26} className="mx-auto text-[var(--text-muted)]" />
          <p className="mt-3 text-sm text-[var(--text-muted)]">
            Belum ada artikel. Mulai dengan menulis yang pertama.
          </p>
        </div>
      ) : (
        <ArticleList articles={articles} canRestore={schema.articleRevisions} />
      )}

      <p className="text-[11px] text-[var(--text-muted)] flex items-center gap-1.5">
        <ExternalLink size={11} />
        Antrean persetujuan artikel anggota ada di{' '}
        <Link href="/admin/articles" className="underline hover:text-[var(--terra)]">
          /admin/articles
        </Link>
        .
      </p>
    </div>
  )
}
