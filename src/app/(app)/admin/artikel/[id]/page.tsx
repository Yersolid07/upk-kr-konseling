// src/app/(app)/admin/artikel/[id]/page.tsx
// Sunting artikel yang sudah ada.

import { createClient } from '@/lib/supabase/server'
import { requireAdminPage } from '@/lib/auth-guard'
import { notFound } from 'next/navigation'
import { ArticleForm } from '../article-form'

export const dynamic = 'force-dynamic'

export default async function EditArticlePage({ params }: { params: { id: string } }) {
  await requireAdminPage('manageSiteContent')
  const supabase = createClient()

  const [{ data: article }, { data: cats }] = await Promise.all([
    supabase
      .from('articles')
      .select(
        'id, title, slug, excerpt, content, category_id, cover_url, tags, status, is_featured, published_at'
      )
      .eq('id', params.id)
      .maybeSingle(),
    supabase.from('thread_categories').select('id, name').order('sort_order', { ascending: true }),
  ])

  if (!article) notFound()

  const a = article as unknown as Record<string, unknown>
  const categories = (cats ?? []) as unknown as { id: string; name: string }[]

  // datetime-local butuh "YYYY-MM-DDTHH:mm" tanpa zona waktu.
  const publishedAt = a.published_at as string | null
  const scheduledAt = publishedAt ? publishedAt.slice(0, 16) : ''

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-xl font-bold text-[var(--brown-dark)] break-words">
          {String(a.title)}
        </h1>
        <p className="text-sm text-[var(--text-muted)] mt-1">
          Setiap simpan yang mengubah isi menyimpan versi lama ke riwayat.
        </p>
      </header>

      <ArticleForm
        isNew={false}
        categories={categories}
        initial={{
          id: a.id as string,
          title: a.title as string,
          slug: a.slug as string,
          excerpt: (a.excerpt as string | null) ?? '',
          content: a.content as string,
          categoryId: (a.category_id as string | null) ?? null,
          coverUrl: (a.cover_url as string | null) ?? '',
          tags: ((a.tags as string[] | null) ?? []).join(', '),
          status: a.status as string,
          isFeatured: Boolean(a.is_featured),
          scheduledAt,
        }}
      />
    </div>
  )
}
