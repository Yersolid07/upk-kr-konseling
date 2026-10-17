// src/lib/site-content.ts
// Pembacaan konten situs yang bisa diedit admin (M10).
//
// SETIAP FUNGSI DI SINI TIDAK PERNAH MELEMPAR.
// Halaman publik tidak boleh 404 atau 500 hanya karena migrasi belum
// dijalankan. Bila tabel belum ada, pemanggil mendapat `null` / array kosong
// dan memakai konten bawaannya sendiri.

import { createClient } from '@/lib/supabase/server'
import type { SitePage, SiteBanner, Resource } from '@/types/database'

/** Halaman statis yang diterbitkan. `null` bila tabel belum ada. */
export async function loadSitePage(slug: string): Promise<SitePage | null> {
  try {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('site_pages')
      .select('id, slug, title, title_en, content, content_en, status, sort_order, show_in_footer, created_at, updated_at')
      .eq('slug', slug)
      .eq('status', 'published')
      .maybeSingle()
    if (error || !data) return null
    return data as SitePage
  } catch {
    return null
  }
}

/** Semua halaman terbit, untuk daftar di footer. */
export async function loadFooterPages(): Promise<Pick<SitePage, 'slug' | 'title'>[]> {
  try {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('site_pages')
      .select('slug, title')
      .eq('status', 'published')
      .eq('show_in_footer', true)
      .order('sort_order')
    if (error || !data) return []
    return data
  } catch {
    return []
  }
}

/** Banner yang sedang aktif pada waktu sekarang. */
export async function loadActiveBanners(): Promise<SiteBanner[]> {
  try {
    const supabase = createClient()
    const now = new Date().toISOString()
    const { data, error } = await supabase
      .from('site_banners')
      .select('id, message, message_en, level, starts_at, ends_at, target_role, dismissible, is_active, created_at')
      .eq('is_active', true)
      .lte('starts_at', now)
      .order('created_at', { ascending: false })
      .limit(3)
    if (error || !data) return []
    // ends_at null = tanpa batas.
    return (data as SiteBanner[]).filter((b) => !b.ends_at || b.ends_at > now)
  } catch {
    return []
  }
}

/** Resource tambahan yang aktif. */
export async function loadResources(): Promise<Resource[]> {
  try {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('resources')
      .select('id, title, title_en, description, description_en, url, category, sort_order, is_active, created_at')
      .eq('is_active', true)
      .order('sort_order')
    if (error || !data) return []
    return data as Resource[]
  } catch {
    return []
  }
}
