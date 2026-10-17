// src/app/(app)/admin/legal/page.tsx
// Pengelolaan dokumen legal (Syarat, Privasi, Panduan Konselor).
//
// Versi dokumen naik otomatis setiap isi berubah — supaya pengguna bisa
// diminta menyetujui ulang hanya ketika isinya benar-benar berubah.

import { createClient } from '@/lib/supabase/server'
import { requireAdminPage } from '@/lib/auth-guard'
import type { LegalDocument } from '@/types/database'
import { LegalManager } from './legal-manager'

export const dynamic = 'force-dynamic'

/** Dokumen yang seharusnya ada. Bila belum ada, ditawarkan untuk dibuat. */
const EXPECTED = [
  { slug: 'terms', title: 'Syarat & Ketentuan' },
  { slug: 'privacy', title: 'Kebijakan Privasi' },
  { slug: 'panduan-konselor', title: 'Panduan Konselor' },
  { slug: 'kode-etik', title: 'Kode Etik Komunitas' },
]

export default async function AdminLegalPage() {
  await requireAdminPage('manageLegal')
  const supabase = createClient()

  const { data, error } = await supabase
    .from('legal_documents')
    .select('*')
    .order('slug', { ascending: true })

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
        Gagal memuat dokumen legal: {error.message}
      </div>
    )
  }

  const docs = (data ?? []) as unknown as LegalDocument[]
  const existing = new Set(docs.map((d) => d.slug))
  const missing = EXPECTED.filter((e) => !existing.has(e.slug))

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-xl font-bold text-[var(--brown-dark)]">Dokumen Legal</h1>
        <p className="text-sm text-[var(--text-muted)] mt-1">
          Versi naik otomatis saat isi berubah. Dokumen tidak terbit tidak bisa dibuka
          pengguna.
        </p>
      </header>

      <LegalManager docs={docs} missing={missing} />
    </div>
  )
}
