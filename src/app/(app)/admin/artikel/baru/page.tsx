// src/app/(app)/admin/artikel/baru/page.tsx
// Artikel baru — ditulis atas nama staf yang sedang masuk.

import { createClient } from '@/lib/supabase/server'
import { requireAdminPage } from '@/lib/auth-guard'
import { ArticleForm } from '../article-form'

export const dynamic = 'force-dynamic'

export default async function NewArticlePage() {
  await requireAdminPage('manageSiteContent')
  const supabase = createClient()

  const { data } = await supabase
    .from('thread_categories')
    .select('id, name')
    .order('sort_order', { ascending: true })

  const categories = (data ?? []) as unknown as { id: string; name: string }[]

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-xl font-bold text-[var(--brown-dark)]">Artikel baru</h1>
        <p className="text-sm text-[var(--text-muted)] mt-1">
          Ditulis atas nama akunmu. Versi lama tersimpan otomatis setiap kali disunting.
        </p>
      </header>

      <ArticleForm
        isNew
        categories={categories}
        initial={{
          title: '',
          slug: '',
          excerpt: '',
          content: '',
          categoryId: null,
          coverUrl: '',
          tags: '',
          status: 'draft',
          isFeatured: false,
          scheduledAt: '',
        }}
      />
    </div>
  )
}
