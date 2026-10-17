// src/app/(app)/admin/hotline/page.tsx
// Pengelolaan nomor hotline darurat.
//
// Nomor ini adalah jalur paling kritis di seluruh situs: orang dalam krisis
// membukanya tanpa login. Karena itu halaman ini menonjolkan status aktif dan
// urutan tampil, serta memperingatkan bila tidak ada satu pun nomor aktif.

import { createClient } from '@/lib/supabase/server'
import { requireAdminPage } from '@/lib/auth-guard'
import type { HotlineContact } from '@/types/database'
import { HotlineManager } from './hotline-manager'

export const dynamic = 'force-dynamic'

export default async function AdminHotlinePage() {
  await requireAdminPage('manageHotlines')
  const supabase = createClient()

  const { data, error } = await supabase
    .from('hotline_contacts')
    .select('*')
    .order('sort_order', { ascending: true })

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
        Gagal memuat hotline: {error.message}
      </div>
    )
  }

  const contacts = (data ?? []) as unknown as HotlineContact[]
  const activeCount = contacts.filter((c) => c.is_active).length

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-xl font-bold text-[var(--brown-dark)]">Hotline Darurat</h1>
        <p className="text-sm text-[var(--text-muted)] mt-1">
          Tampil di halaman <code className="font-mono">/hotline</code> yang bisa dibuka
          tanpa login. Pastikan nomornya benar.
        </p>
      </header>

      {activeCount === 0 && (
        <div className="rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-900">
          <strong>Tidak ada nomor hotline aktif.</strong> Halaman darurat akan kosong
          bagi orang yang membutuhkannya. Aktifkan setidaknya satu nomor.
        </div>
      )}

      <HotlineManager contacts={contacts} />
    </div>
  )
}
