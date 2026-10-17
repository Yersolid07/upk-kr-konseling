// src/app/(app)/admin/konten-situs/page.tsx
// Konten situs: halaman, banner, resource, ayat harian (M10).

import { createClient } from '@/lib/supabase/server'
import { requireAdminPage } from '@/lib/auth-guard'
import { can } from '@/lib/rbac'
import { ContentTabs } from './content-tabs'

export const dynamic = 'force-dynamic'

export default async function KontenSitusPage() {
  const { profile } = await requireAdminPage('manageSiteContent')
  const supabase = createClient()

  const [pagesRes, bannersRes, resourcesRes, versesRes] = await Promise.all([
    supabase
      .from('site_pages')
      .select('id, slug, title, title_en, content, content_en, status, sort_order, show_in_footer, updated_at')
      .order('sort_order'),
    supabase
      .from('site_banners')
      .select('id, message, message_en, level, starts_at, ends_at, target_role, dismissible, is_active')
      .order('created_at', { ascending: false }),
    supabase
      .from('resources')
      .select('id, title, title_en, description, description_en, url, category, sort_order, is_active')
      .order('sort_order'),
    supabase
      .from('daily_verses')
      .select('id, verse_text, verse_ref, verse_text_en, verse_ref_en, display_date')
      .order('display_date', { ascending: false, nullsFirst: false })
      .limit(120),
  ])

  // Bila salah satu tabel belum ada, tampilkan pesan migrasi alih-alih layar
  // error. Kode ini bisa ter-deploy sebelum SQL dijalankan.
  const missing = [
    pagesRes.error && 'site_pages',
    bannersRes.error && 'site_banners',
    resourcesRes.error && 'resources',
    versesRes.error && 'daily_verses',
  ].filter(Boolean)

  if (missing.length > 0) {
    return (
      <div className="card-premium p-6">
        <h1 className="text-lg font-bold text-[var(--brown-dark)]">Konten Situs</h1>
        <p className="mt-2 text-sm text-[var(--text-muted)]">
          Tabel berikut belum tersedia: <strong>{missing.join(', ')}</strong>.
        </p>
        <p className="mt-2 text-xs text-[var(--text-muted)]">
          Jalankan migrasi
          <code className="mx-1 rounded bg-[var(--cream)] px-1">supabase/phase4-advanced-modules.sql</code>
          di Supabase SQL Editor, lalu muat ulang halaman ini.
        </p>
        <p className="mt-2 text-xs text-[var(--text-muted)]">
          Detail: {pagesRes.error?.message ?? bannersRes.error?.message ?? resourcesRes.error?.message ?? versesRes.error?.message}
        </p>
      </div>
    )
  }

  return (
    <ContentTabs
      pages={pagesRes.data ?? []}
      banners={bannersRes.data ?? []}
      resources={resourcesRes.data ?? []}
      verses={versesRes.data ?? []}
      canManageVerses={can(profile.role, 'manageVerses')}
    />
  )
}
