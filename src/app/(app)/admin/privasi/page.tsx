// src/app/(app)/admin/privasi/page.tsx
// Privasi (M13): permintaan data anggota + log pembukaan identitas.

import { createClient } from '@/lib/supabase/server'
import { requireAdminPage, getAuthContext } from '@/lib/auth-guard'
import { PrivasiConsole } from './privasi-console'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Privasi | IKA UPK-Kr FT UNSRAT' }

export default async function PrivasiPage() {
  await requireAdminPage('managePrivacy')
  const ctx = await getAuthContext()
  const supabase = createClient()

  const [reqRes, logRes] = await Promise.all([
    supabase
      .from('data_requests')
      .select('id, user_id, kind, status, note, handled_by, handled_at, created_at')
      .order('created_at', { ascending: false })
      .limit(100),
    // Log ini hanya bisa dibaca super admin (RLS). Untuk admin biasa kueri
    // mengembalikan kosong — dan itu memang jawaban yang benar.
    supabase
      .from('identity_reveal_log')
      .select('id, requested_by, target_content_type, target_content_id, revealed_user_id, reason, created_at')
      .order('created_at', { ascending: false })
      .limit(80),
  ])

  if (reqRes.error) {
    return (
      <div className="card-premium p-6">
        <h1 className="text-lg font-bold text-[var(--brown-dark)]">Privasi</h1>
        <p className="mt-2 text-sm text-[var(--text-muted)]">{reqRes.error.message}</p>
        <p className="mt-2 text-xs text-[var(--text-muted)]">
          Jalankan <code className="rounded bg-[var(--cream)] px-1">supabase/phase4-advanced-modules.sql</code> lebih dulu.
        </p>
      </div>
    )
  }

  const userIds = new Set<string>()
  for (const r of reqRes.data ?? []) userIds.add(r.user_id)
  for (const r of logRes.data ?? []) {
    userIds.add(r.requested_by)
    if (r.revealed_user_id) userIds.add(r.revealed_user_id)
  }

  const { data: profiles } = userIds.size
    ? await supabase.from('profiles').select('id, full_name').in('id', Array.from(userIds))
    : { data: [] as { id: string; full_name: string }[] }

  const nameOf = new Map((profiles ?? []).map((p) => [p.id, p.full_name]))

  return (
    <PrivasiConsole
      requests={(reqRes.data ?? []).map((r) => ({ ...r, userName: nameOf.get(r.user_id) ?? '—' }))}
      reveals={(logRes.data ?? []).map((r) => ({
        id: r.id,
        reason: r.reason,
        createdAt: r.created_at,
        contentType: r.target_content_type,
        contentId: r.target_content_id,
        actorName: nameOf.get(r.requested_by) ?? '—',
        targetName: r.revealed_user_id ? nameOf.get(r.revealed_user_id) ?? '—' : 'tidak diketahui',
      }))}
      isSuper={ctx?.role === 'super_admin'}
    />
  )
}
