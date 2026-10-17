// src/app/(app)/admin/sistem/page.tsx
// Status sistem (M14).
//
// Halaman ini menjawab satu pertanyaan yang selama ini dijawab dengan menebak:
// "migrasi mana yang sudah dijalankan?" Sebelum ada tabel schema_migrations,
// urutan berkas SQL diingat manusia — dan ingatan gagal tepat saat dibutuhkan.

import { createClient } from '@/lib/supabase/server'
import { requireAdminPage } from '@/lib/auth-guard'
import { SistemConsole } from './sistem-console'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Status Sistem | IKA UPK-Kr FT UNSRAT' }

/**
 * Migrasi yang diharapkan tercatat.
 *
 * `match` adalah akhiran nilai `version` di schema_migrations — kolomnya
 * menyimpan versi bertanggal (`2026-10-17-phase4-advanced-modules`), bukan
 * nama berkas. Membandingkan dengan nama berkas membuat SEMUA migrasi tampak
 * belum dijalankan.
 */
const EXPECTED: { label: string; match: string }[] = [
  { label: 'schema.sql', match: '-schema' },
  { label: 'rls.sql', match: '-rls' },
  { label: 'cms-rbac.sql', match: '-cms-rbac' },
  { label: 'hotfix-security.sql', match: '-hotfix-security' },
  { label: 'phase1-data-security.sql', match: '-phase1-data-security' },
  { label: 'cms-superadmin.sql', match: '-cms-superadmin' },
  { label: 'phase3-content-modules.sql', match: '-phase3-content-modules' },
  { label: 'phase4-advanced-modules.sql', match: '-phase4-advanced-modules' },
]

export default async function SistemPage() {
  await requireAdminPage('manageSystem')
  const supabase = createClient()

  const [statusRes, migrationsRes] = await Promise.all([
    supabase.rpc('system_status'),
    supabase.from('schema_migrations').select('version, description, applied_at').order('applied_at'),
  ])

  const status = (statusRes.data ?? {}) as Record<string, number>
  const migrations = (migrationsRes.data ?? []) as {
    version: string
    description: string | null
    applied_at: string
  }[]

  const matched = new Set<string>()
  for (const e of EXPECTED) {
    if (migrations.some((m) => m.version.endsWith(e.match))) matched.add(e.label)
  }

  return (
    <SistemConsole
      status={status}
      statusError={statusRes.error?.message ?? null}
      migrations={migrations}
      expected={EXPECTED.map((e) => e.label)}
      missing={EXPECTED.filter((e) => !matched.has(e.label)).map((e) => e.label)}
    />
  )
}
