// src/app/(app)/admin/kategori/page.tsx
// Kelola kategori.
//
// Kategori yang masih dipakai TIDAK bisa dihapus (dijaga trigger database).
// Halaman ini menjelaskan itu di muka dan menawarkan Arsipkan sebagai
// tindakan yang benar, alih-alih membiarkan admin menekan Hapus lalu gagal.

import { createClient } from '@/lib/supabase/server'
import { requireAdminPage } from '@/lib/auth-guard'
import { checkSchema } from '@/lib/cms/schema'
import { MigrationBanner } from '@/components/admin/migration-banner'
import { CategoryManager, type CategoryRow } from './category-manager'

export const dynamic = 'force-dynamic'

export default async function AdminCategoriesPage() {
  await requireAdminPage('manageCategories')
  const supabase = createClient()
  const schema = await checkSchema()

  const { data, error } = await supabase
    .from('thread_categories')
    .select('id, name, name_en, slug, icon, color, sort_order, description, is_archived')
    .order('sort_order', { ascending: true })

  if (error) {
    return (
      <div className="space-y-3">
        <h1 className="text-xl font-bold text-[var(--brown-dark)]">Kategori</h1>
        <MigrationBanner file="supabase/phase3-content-modules.sql" detail={error.message} />
      </div>
    )
  }

  const rows = (data ?? []) as unknown as Record<string, unknown>[]

  // Hitung pemakaian per kategori dalam tiga query ringan — lebih murah
  // daripada RPC terpisah, dan hasilnya pasti sama dengan isi tabel.
  const [threads, prayers, articles] = await Promise.all([
    supabase.from('threads').select('category_id').not('category_id', 'is', null),
    supabase.from('prayer_requests').select('category_id').not('category_id', 'is', null),
    supabase.from('articles').select('category_id').not('category_id', 'is', null),
  ])

  const counts = new Map<string, { threads: number; prayers: number; articles: number }>()
  const bump = (list: unknown, field: 'threads' | 'prayers' | 'articles') => {
    for (const r of (list ?? []) as { category_id: string | null }[]) {
      if (!r.category_id) continue
      const c = counts.get(r.category_id) ?? { threads: 0, prayers: 0, articles: 0 }
      c[field] += 1
      counts.set(r.category_id, c)
    }
  }
  bump(threads.data, 'threads')
  bump(prayers.data, 'prayers')
  bump(articles.data, 'articles')

  const categories: CategoryRow[] = rows.map((r) => {
    const c = counts.get(r.id as string) ?? { threads: 0, prayers: 0, articles: 0 }
    return {
      id: r.id as string,
      name: r.name as string,
      nameEn: (r.name_en as string | null) ?? null,
      slug: r.slug as string,
      icon: (r.icon as string) ?? '💬',
      color: (r.color as string) ?? '#C4895A',
      sortOrder: (r.sort_order as number) ?? 0,
      description: (r.description as string | null) ?? null,
      isArchived: Boolean(r.is_archived),
      usage: c,
      totalUsage: c.threads + c.prayers + c.articles,
    }
  })

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-xl font-bold text-[var(--brown-dark)]">Kategori</h1>
        <p className="text-sm text-[var(--text-muted)] mt-1">
          Kategori yang masih dipakai tidak bisa dihapus — arsipkan saja. Konten lama
          tetap punya kategorinya, tetapi tidak bisa dipilih untuk konten baru.
        </p>
      </header>

      {!schema.moderation && <MigrationBanner file="supabase/cms-superadmin.sql" />}

      <CategoryManager categories={categories} />
    </div>
  )
}
