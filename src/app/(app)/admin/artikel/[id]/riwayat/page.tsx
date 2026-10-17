// src/app/(app)/admin/artikel/[id]/riwayat/page.tsx
// Riwayat revisi artikel + tombol kembalikan.
//
// Revisi menyimpan salinan SEBELUM perubahan, jadi versi terbaru artikel tidak
// muncul di daftar ini — yang muncul adalah semua versi sebelumnya. Versi 1
// adalah kondisi artikel saat pertama kali diubah setelah migrasi Fase 3.

import { createClient } from '@/lib/supabase/server'
import { requireAdminPage } from '@/lib/auth-guard'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { checkSchema } from '@/lib/cms/schema'
import { MigrationBanner } from '@/components/admin/migration-banner'
import { RevisionList, type RevisionRow } from './revision-list'

export const dynamic = 'force-dynamic'

export default async function ArticleHistoryPage({ params }: { params: { id: string } }) {
  await requireAdminPage('manageSiteContent')
  const supabase = createClient()
  const schema = await checkSchema()

  const { data: article } = await supabase
    .from('articles')
    .select('id, title, slug, content, excerpt, status, updated_at')
    .eq('id', params.id)
    .maybeSingle()

  if (!article) notFound()

  if (!schema.articleRevisions) {
    return (
      <div className="space-y-3">
        <h1 className="text-xl font-bold text-[var(--brown-dark)]">Riwayat revisi</h1>
        <MigrationBanner
          file="supabase/phase3-content-modules.sql"
          detail="Tabel article_revisions belum ada di database, jadi riwayat belum bisa ditampilkan."
        />
      </div>
    )
  }

  const { data, error } = await supabase
    .from('article_revisions')
    .select('id, title, content, excerpt, status, version, created_at, edited_by')
    .eq('article_id', params.id)
    .order('version', { ascending: false })
    .limit(50)

  if (error) {
    return (
      <div className="space-y-3">
        <h1 className="text-xl font-bold text-[var(--brown-dark)]">Riwayat revisi</h1>
        <MigrationBanner file="supabase/phase3-content-modules.sql" detail={error.message} />
      </div>
    )
  }

  const rows = (data ?? []) as unknown as Record<string, unknown>[]

  // Nama penyunting — staf, bukan data sensitif anggota.
  const editorIds = Array.from(
    new Set(rows.map((r) => r.edited_by as string | null).filter(Boolean) as string[])
  )
  const names = new Map<string, string>()
  if (editorIds.length > 0) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name')
      .in('id', editorIds)
    for (const p of (profiles ?? []) as { id: string; full_name: string }[]) {
      names.set(p.id, p.full_name)
    }
  }

  const a = article as unknown as Record<string, unknown>
  const revisions: RevisionRow[] = rows.map((r) => ({
    id: r.id as string,
    version: Number(r.version),
    title: r.title as string,
    content: r.content as string,
    excerpt: (r.excerpt as string | null) ?? null,
    status: (r.status as string | null) ?? null,
    createdAt: r.created_at as string,
    editorName: names.get(r.edited_by as string) ?? null,
  }))

  return (
    <div className="space-y-4">
      <Link
        href={`/admin/artikel/${params.id}`}
        className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--text-muted)] hover:text-[var(--terra)]"
      >
        <ArrowLeft size={13} /> Kembali ke editor
      </Link>

      <header>
        <h1 className="text-xl font-bold text-[var(--brown-dark)] break-words">
          Riwayat: {String(a.title)}
        </h1>
        <p className="text-sm text-[var(--text-muted)] mt-1">
          Setiap baris adalah kondisi artikel SEBELUM perubahan itu. Mengembalikan sebuah
          versi tidak menghapus versi lain.
        </p>
      </header>

      <RevisionList
        articleId={params.id}
        current={{ title: String(a.title), content: String(a.content) }}
        revisions={revisions}
      />
    </div>
  )
}
