// src/app/(app)/admin/kata-terlarang/page.tsx
// Daftar kata terlarang.
//
// TIGA KATEGORI, TIGA PERILAKU BERBEDA:
//   spam   — konten ditolak saat dibuat
//   kasar  — konten ditolak saat dibuat
//   krisis — TIDAK PERNAH ditolak; justru menaikkan prioritas laporan
//
// Perbedaan ini ditampilkan di UI supaya tidak ada yang mengira kata krisis
// menyembunyikan orang yang sedang dalam bahaya.

import { createClient } from '@/lib/supabase/server'
import { requireAdminPage } from '@/lib/auth-guard'
import { checkSchema } from '@/lib/cms/schema'
import { MigrationBanner } from '@/components/admin/migration-banner'
import { BannedWordManager, type BannedRow } from './banned-word-manager'

export const dynamic = 'force-dynamic'

export default async function BannedWordsPage() {
  await requireAdminPage('moderateContent')
  const supabase = createClient()
  const schema = await checkSchema()

  const { data, error } = await supabase
    .from('banned_words')
    .select('id, word, category, is_active, created_at')
    .order('category', { ascending: true })
    .order('word', { ascending: true })

  if (error) {
    return (
      <div className="space-y-3">
        <h1 className="text-xl font-bold text-[var(--brown-dark)]">Kata Terlarang</h1>
        <MigrationBanner file="supabase/phase3-content-modules.sql" detail={error.message} />
      </div>
    )
  }

  const rows = (data ?? []) as unknown as Record<string, unknown>[]
  const words: BannedRow[] = rows.map((r) => ({
    id: r.id as string,
    word: r.word as string,
    category: r.category as string,
    isActive: Boolean(r.is_active),
  }))

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-xl font-bold text-[var(--brown-dark)]">Kata Terlarang</h1>
        <p className="text-sm text-[var(--text-muted)] mt-1">
          Konten yang memuat kata kategori <strong>spam</strong> atau <strong>kasar</strong>{' '}
          ditolak saat dibuat. Kata kategori <strong>krisis</strong> tidak pernah ditolak —
          kontennya justru masuk antrean prioritas tinggi agar cepat dilihat konselor.
        </p>
      </header>

      <BannedWordManager words={words} />
    </div>
  )
}
