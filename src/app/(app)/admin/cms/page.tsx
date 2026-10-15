// src/app/(app)/admin/cms/page.tsx
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getAuthContext } from '@/lib/auth-guard'
import { can } from '@/lib/rbac'
import { CmsPanel } from './cms-panel'
import type { HotlineContact, LegalDocument, SiteSetting } from '@/types/database'

export const dynamic = 'force-dynamic'

export const metadata = { title: 'Pengaturan Situs | UPK-Kr' }

export default async function AdminCmsPage() {
  const ctx = await getAuthContext()
  if (!ctx) redirect('/auth/login')

  // Halaman ini khusus super_admin. Admin biasa diarahkan ke antrean artikel.
  if (!can(ctx.role, 'manageSettings')) redirect('/admin/articles')

  const supabase = createClient()

  const [{ data: settings }, { data: hotlines }, { data: docs }] = await Promise.all([
    supabase.from('site_settings').select('*').order('key'),
    supabase.from('hotline_contacts').select('*').order('sort_order'),
    supabase.from('legal_documents').select('*').order('slug'),
  ])

  return (
    <CmsPanel
      settings={(settings ?? []) as SiteSetting[]}
      hotlines={(hotlines ?? []) as HotlineContact[]}
      documents={(docs ?? []) as LegalDocument[]}
    />
  )
}
