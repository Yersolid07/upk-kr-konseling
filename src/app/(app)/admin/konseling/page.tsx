// src/app/(app)/admin/konseling/page.tsx
// Konseling lanjutan (M7): daftar sesi, alih konselor, break-glass.

import { createClient } from '@/lib/supabase/server'
import { requireAdminPage, getAuthContext } from '@/lib/auth-guard'
import { can } from '@/lib/rbac'
import { KonselingConsole } from './konseling-console'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Sesi Konseling | IKA UPK-Kr FT UNSRAT' }

export default async function KonselingPage() {
  const ctx = await getAuthContext()
  await requireAdminPage('manageKonseling')

  const supabase = createClient()

  const [sessionsRes, konselorRes] = await Promise.all([
    supabase
      .from('chat_sessions')
      .select(
        'id, member_id, konselor_id, status, topic, is_anonymous, started_at, ended_at, created_at, updated_at'
      )
      .order('created_at', { ascending: false })
      .limit(80),
    supabase
      .from('profiles')
      .select('id, full_name, role, specialization')
      .in('role', ['konselor', 'admin', 'super_admin'])
      .eq('is_active', true)
      .order('full_name'),
  ])

  if (sessionsRes.error) {
    return (
      <div className="card-premium p-6">
        <h1 className="text-lg font-bold text-[var(--brown-dark)]">Sesi Konseling</h1>
        <p className="mt-2 text-sm text-[var(--text-muted)]">
          {sessionsRes.error.message}
        </p>
      </div>
    )
  }

  const isSuper = ctx?.role === 'super_admin'

  return (
    <KonselingConsole
      sessions={sessionsRes.data ?? []}
      konselor={konselorRes.data ?? []}
      canReassign={ctx ? can(ctx.role, 'manageKonseling') : false}
      canBreakGlass={isSuper}
    />
  )
}
