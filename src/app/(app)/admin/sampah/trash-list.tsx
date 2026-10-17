// src/app/(app)/admin/sampah/trash-list.tsx
// Daftar isi tempat sampah + pemulihan / penghapusan permanen.

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { RotateCcw, Flame, Trash2 } from 'lucide-react'
import { DetailDrawer, DetailRow } from '@/components/admin/detail-drawer'
import { ConfirmDialog, type ConfirmLevel } from '@/components/admin/confirm-dialog'
import { formatDateTime } from '@/lib/utils'
import { tableLabel, type ContentTable } from '@/lib/cms/content-tables'
import { restoreContent, purgeContent } from '@/lib/cms/content-actions'

export interface TrashItem {
  table: ContentTable
  id: string
  preview: string
  deletedAt: string
  reason: string | null
  deletedBy: string | null
}

interface Pending {
  kind: 'restore' | 'purge'
  item: TrashItem
  title: string
  description: string
  level: ConfirmLevel
  confirmLabel: string
  confirmWord?: string
}

export function TrashList({ items, canPurge }: { items: TrashItem[]; canPurge: boolean }) {
  const router = useRouter()
  const [open, setOpen] = useState<TrashItem | null>(null)
  const [pending, setPending] = useState<Pending | null>(null)

  function ask(kind: 'restore' | 'purge', item: TrashItem) {
    if (kind === 'restore') {
      setPending({
        kind,
        item,
        title: 'Pulihkan konten ini?',
        description: `${tableLabel(item.table)} akan kembali tampil seperti sebelum dihapus.`,
        level: 'normal',
        confirmLabel: 'Pulihkan',
      })
    } else {
      setPending({
        kind,
        item,
        title: 'Hapus PERMANEN?',
        description:
          'Baris ini dihapus dari database dan TIDAK dapat dipulihkan lagi, termasuk seluruh data turunannya.',
        level: 'critical',
        confirmLabel: 'Hapus permanen',
        confirmWord: 'HAPUS',
      })
    }
  }

  async function run(data: { reason: string }): Promise<{ ok: boolean; error?: string }> {
    if (!pending) return { ok: false, error: 'Tidak ada tindakan.' }
    const { kind, item } = pending
    const res =
      kind === 'restore'
        ? await restoreContent({ table: item.table, id: item.id })
        : await purgeContent({ table: item.table, id: item.id, reason: data.reason })

    if (res && typeof res === 'object' && 'error' in res && res.error) {
      return { ok: false, error: String(res.error) }
    }
    toast.success(kind === 'restore' ? 'Konten dipulihkan.' : 'Konten dihapus permanen.')
    setOpen(null)
    router.refresh()
    return { ok: true }
  }

  if (items.length === 0) {
    return (
      <div className="card-premium px-6 py-14 text-center">
        <Trash2 size={28} className="mx-auto text-[var(--text-muted)]" />
        <p className="mt-3 text-sm text-[var(--text-muted)]">
          Tempat sampah kosong. Tidak ada konten yang dihapus.
        </p>
      </div>
    )
  }

  return (
    <>
      <div className="card-premium overflow-hidden divide-y divide-[var(--cream)]">
        {items.map((item) => (
          <button
            key={`${item.table}:${item.id}`}
            onClick={() => setOpen(item)}
            className="w-full text-left px-4 py-3 hover:bg-[var(--cream)]/60 transition-colors flex items-start gap-3"
          >
            <span className="shrink-0 mt-0.5 rounded-md bg-[var(--cream-dark)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[var(--text-2)]">
              {tableLabel(item.table)}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm text-[var(--text)] line-clamp-2">{item.preview}</span>
              <span className="block text-[11px] text-[var(--text-muted)] mt-0.5">
                Dihapus {formatDateTime(item.deletedAt)}
                {item.reason ? ` · ${item.reason}` : ''}
              </span>
            </span>
          </button>
        ))}
      </div>

      <DetailDrawer
        open={Boolean(open)}
        onClose={() => setOpen(null)}
        title={open ? tableLabel(open.table) : ''}
        subtitle="Konten di tempat sampah"
        footer={
          open && (
            <>
              <button
                onClick={() => ask('restore', open)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100"
              >
                <RotateCcw size={13} /> Pulihkan
              </button>
              {canPurge && (
                <button
                  onClick={() => ask('purge', open)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100"
                >
                  <Flame size={13} /> Hapus permanen
                </button>
              )}
            </>
          )
        }
      >
        {open && (
          <>
            <DetailRow label="Jenis">{tableLabel(open.table)}</DetailRow>
            <DetailRow label="Dihapus">{formatDateTime(open.deletedAt)}</DetailRow>
            <DetailRow label="Alasan">{open.reason ?? '—'}</DetailRow>
            <div>
              <p className="text-xs text-[var(--text-muted)] mb-1.5">Isi</p>
              <p className="text-sm whitespace-pre-wrap rounded-lg bg-[var(--cream)] border border-[var(--cream-dark)] p-3">
                {open.preview}
              </p>
            </div>
            {!canPurge && (
              <p className="text-[11px] text-[var(--text-muted)]">
                Hapus permanen hanya bisa dilakukan super admin.
              </p>
            )}
          </>
        )}
      </DetailDrawer>

      <ConfirmDialog
        open={Boolean(pending)}
        onClose={() => setPending(null)}
        title={pending?.title ?? ''}
        description={pending?.description}
        level={pending?.level ?? 'reason'}
        confirmLabel={pending?.confirmLabel}
        confirmWord={pending?.confirmWord}
        onConfirm={run}
      />
    </>
  )
}
