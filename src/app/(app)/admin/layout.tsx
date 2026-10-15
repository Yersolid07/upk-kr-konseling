// src/app/(app)/admin/layout.tsx
// Gerbang RBAC untuk seluruh area /admin.
//
// Ini kontrol SEBENARNYA: halaman anak boleh saja merender UI apa pun, tetapi
// request tidak akan pernah sampai ke sana kalau peran pengguna di bawah admin.
// Setiap Server Action tetap memeriksa ulang sendiri (lihat lib/auth-guard.ts).

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { hasMinRole, ROLE_LABEL } from '@/lib/rbac'
import type { Profile } from '@/types/database'

export const dynamic = 'force-dynamic'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  const p = profile as Profile | null
  if (!p) redirect('/auth/setup-error')

  // Anggota & konselor tidak punya urusan di panel admin.
  if (!hasMinRole(p.role, 'moderator')) {
    redirect('/dashboard')
  }

  return <>{children}</>
}
