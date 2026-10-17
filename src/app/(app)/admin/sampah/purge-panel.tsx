// src/app/(app)/admin/sampah/purge-panel.tsx
// Tombol pembersihan tempat sampah.
//
// Angka retensi ditampilkan di muka supaya admin tahu persis apa yang akan
// hilang. Konfirmasi level 'critical' karena tindakan ini tidak bisa dibatalkan.

'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { Flame, Loader2 } from 'lucide-react'
import { ConfirmDialog } from '@/components/admin/confirm-dialog'
import { purgeExpiredTrash } from './purge-actions'

export function PurgePanel({ retentionDays }: { retentionDays: number }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [result, setResult] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  return (
    <>
      <div className="card-premium p-4 flex flex-wrap items-center gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-[var(--brown-dark)]">
            Bersihkan yang kedaluwarsa
          </p>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">
            Konten di tempat sampah lebih dari {retentionDays} hari dihapus permanen. Yang
            lebih baru tidak tersentuh.
          </p>
          {result && (
            <p className="text-[11px] text-emerald-800 mt-1.5">{result}</p>
          )}
        </div>
        <button
          onClick={() => setOpen(true)}
          disabled={pending}
          className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100 disabled:opacity-50 shrink-0"
        >
          {pending ? <Loader2 size={13} className="animate-spin" /> : <Flame size={13} />}
          Jalankan pembersihan
        </button>
      </div>

      <ConfirmDialog
        open={open}
        onClose={() => setOpen(false)}
        title="Hapus permanen isi tempat sampah yang kedaluwarsa?"
        description={`Semua konten di tempat sampah lebih dari ${retentionDays} hari akan dihapus dari database. Tindakan ini TIDAK dapat dibatalkan.`}
        level="critical"
        confirmWord="BERSIHKAN"
        confirmLabel="Hapus permanen"
        onConfirm={async ({ reason }) => {
          const res = await purgeExpiredTrash({ reason })
          if ('error' in res) return { ok: false, error: res.error }

          if (res.total === 0) {
            setResult('Tidak ada konten yang melewati masa retensi. Tidak ada yang dihapus.')
            toast.success('Tidak ada yang perlu dibersihkan.')
          } else {
            const detail = res.deleted.map((d) => `${d.table}: ${d.count}`).join(', ')
            setResult(`Dihapus ${res.total} baris (${detail}).`)
            toast.success(`${res.total} baris dihapus permanen.`)
          }
          startTransition(() => router.refresh())
          return { ok: true }
        }}
      />
    </>
  )
}
