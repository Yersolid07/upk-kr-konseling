// src/app/(app)/layout.tsx
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AppShell } from '@/components/layout/AppShell'
import { loadActiveBanners, loadFooterPages } from '@/lib/site-content'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient()
  
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error) {
    console.error('Layout getUser error:', error.message)
  }

  if (!user) {
    console.log('Redirecting to login because user is null')
    redirect('/auth/login')
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (profileError) {
    console.error('Layout profile error:', profileError)
  }

  if (!profile) {
    redirect('/auth/setup-error')
  }

  // Banner pengumuman (M10). Tidak pernah melempar — bila tabel belum ada,
  // hasilnya array kosong dan AppShell tampil seperti biasa.
  const [banners, footerPages] = await Promise.all([loadActiveBanners(), loadFooterPages()])

  return (
    <AppShell profile={profile} banners={banners} footerPages={footerPages}>
      {children}
    </AppShell>
  )
}
