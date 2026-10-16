// src/app/(app)/admin/articles/page.tsx
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getAuthContext } from '@/lib/auth-guard'
import { can } from '@/lib/rbac'
import { ArticleQueue } from './article-queue'
import type { Article } from '@/types/database'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Persetujuan Artikel | IKA UPK-Kr FT UNSRAT' }

export default async function AdminArticlesPage() {
  const ctx = await getAuthContext()
  if (!ctx) redirect('/auth/login')
  if (!can(ctx.role, 'approveArticles')) redirect('/admin')

  const supabase = createClient()

  const [{ data: pending }, { data: published }] = await Promise.all([
    supabase
      .from('articles')
      .select('*, author:profiles(id, full_name, role)')
      .in('status', ['pending_review', 'draft'])
      .order('created_at', { ascending: true }),
    supabase
      .from('articles')
      .select('*, author:profiles(id, full_name, role)')
      .in('status', ['published', 'rejected', 'archived'])
      .order('created_at', { ascending: false })
      .limit(50),
  ])

  return (
    <div className="space-y-6 animate-fade-in pb-16">
      <header className="space-y-2">
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="font-[var(--font-playfair)] text-2xl sm:text-3xl font-bold text-[var(--brown-dark)]">
            Persetujuan Artikel
          </h1>
          <Link
            href="/admin"
            className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider hover:text-[var(--terra)]"
          >
            ← Panel Admin
          </Link>
        </div>
        <p className="text-sm text-[var(--text-muted)]">
          Artikel dari anggota dan konselor tidak tampil di dinding Renungan sampai kamu
          menyetujuinya. Penulis otomatis menerima notifikasi berisi keputusanmu.
        </p>
      </header>

      <ArticleQueue
        pending={(pending ?? []) as Article[]}
        published={(published ?? []) as Article[]}
      />
    </div>
  )
}
