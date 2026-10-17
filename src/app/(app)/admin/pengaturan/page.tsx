// src/app/(app)/admin/pengaturan/page.tsx
// Halaman pengaturan situs.
//
// Nilai dibaca langsung dari tabel (bukan lewat getSetting satu per satu)
// supaya satu query mengisi seluruh form, lalu divalidasi terhadap registry —
// nilai rusak jatuh ke default, bukan membuat halaman gagal.

import { createClient } from '@/lib/supabase/server'
import { requireAdminPage } from '@/lib/auth-guard'
import { SETTINGS } from '@/lib/settings/registry'
import { SettingsForm, SettingsNote } from './settings-form'

export const dynamic = 'force-dynamic'

/** Ambil nilai dari bentuk simpanan `{ value: X }`, dengan toleransi bentuk lama. */
function unwrap(raw: unknown): unknown {
  if (raw && typeof raw === 'object' && 'value' in (raw as Record<string, unknown>)) {
    return (raw as Record<string, unknown>).value
  }
  return raw
}

export default async function AdminSettingsPage() {
  await requireAdminPage('manageSettings')
  const supabase = createClient()

  const { data, error } = await supabase.from('site_settings').select('key, value')

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
        Gagal memuat pengaturan: {error.message}
      </div>
    )
  }

  const stored = new Map<string, unknown>()
  for (const row of (data ?? []) as unknown as { key: string; value: unknown }[]) {
    stored.set(row.key, unwrap(row.value))
  }

  // Setiap kunci di registry selalu punya nilai — dari database bila valid,
  // selain itu dari default. Tidak ada kontrol kosong tanpa alasan.
  const values: Record<string, unknown> = {}
  const invalid: string[] = []
  for (const def of SETTINGS) {
    const raw = stored.has(def.key) ? stored.get(def.key) : undefined
    const parsed = def.schema.safeParse(raw)
    if (parsed.success) {
      values[def.key] = parsed.data
    } else {
      if (raw !== undefined && raw !== '' ) invalid.push(def.label)
      values[def.key] = def.default
    }
  }

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-xl font-bold text-[var(--brown-dark)]">Pengaturan Situs</h1>
        <p className="text-sm text-[var(--text-muted)] mt-1">
          Perubahan berlaku langsung setelah disimpan dan tercatat di jejak audit.
        </p>
      </header>

      {invalid.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-900">
          <strong>{invalid.length} pengaturan tersimpan dalam bentuk lama</strong> dan
          ditampilkan memakai nilai bawaan: {invalid.join(', ')}. Simpan untuk memperbaikinya.
        </div>
      )}

      <SettingsNote />
      <SettingsForm values={values} />
    </div>
  )
}
