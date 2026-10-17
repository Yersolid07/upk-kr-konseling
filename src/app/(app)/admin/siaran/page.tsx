// src/app/(app)/admin/siaran/page.tsx
// Siaran & templat (M9).

import { createClient } from '@/lib/supabase/server'
import { requireAdminPage } from '@/lib/auth-guard'
import { BroadcastConsole } from './broadcast-console'

export const dynamic = 'force-dynamic'

export default async function SiaranPage() {
  await requireAdminPage('broadcast')
  const supabase = createClient()

  const [broadcastsRes, templatesRes, groupsRes] = await Promise.all([
    supabase
      .from('broadcasts')
      .select('id, title, body, link, audience, audience_value, status, scheduled_at, sent_at, recipient_count, read_count, created_at')
      .order('created_at', { ascending: false })
      .limit(60),
    supabase
      .from('broadcast_templates')
      .select('id, name, title, body, link')
      .order('name'),
    supabase
      .from('cell_groups')
      .select('id, name')
      .eq('is_archived', false)
      .order('name'),
  ])

  if (broadcastsRes.error) {
    return (
      <div className="card-premium p-6">
        <h1 className="text-lg font-bold text-[var(--brown-dark)]">Siaran</h1>
        <p className="mt-2 text-sm text-[var(--text-muted)]">
          Tabel siaran belum tersedia: {broadcastsRes.error.message}
        </p>
        <p className="mt-2 text-xs text-[var(--text-muted)]">
          Jalankan migrasi
          <code className="mx-1 rounded bg-[var(--cream)] px-1">supabase/phase4-advanced-modules.sql</code>
          lebih dulu.
        </p>
      </div>
    )
  }

  // Angkatan yang benar-benar ada — supaya pemilih tidak menawarkan tahun kosong.
  const { data: angkatanRows } = await supabase
    .from('profiles')
    .select('angkatan')
    .not('angkatan', 'is', null)
  const angkatan = Array.from(
    new Set((angkatanRows ?? []).map((r) => r.angkatan).filter(Boolean) as string[])
  ).sort()

  return (
    <BroadcastConsole
      broadcasts={broadcastsRes.data ?? []}
      templates={templatesRes.data ?? []}
      groups={groupsRes.data ?? []}
      angkatan={angkatan}
    />
  )
}
