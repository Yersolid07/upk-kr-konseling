// src/app/(app)/admin/artikel/[id]/riwayat/revision-list.tsx
// Daftar revisi dengan pratinjau dan tombol kembalikan.

'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { ChevronDown, ChevronUp, RotateCcw, Loader2, Clock } from 'lucide-react'
import { formatDateTime } from '@/lib/utils'
import { ConfirmDialog } from '@/components/admin/confirm-dialog'
import { restoreRevision } from '../../actions'

export interface RevisionRow {
  id: string
  version: number
  title: string
  content: string
  excerpt: string | null
  status: string | null
  createdAt: string
  editorName: string | null
}

export function RevisionList({
  articleId,
  current,
  revisions,
}: {
  articleId: string
  current: { title: string; content: string }
  revisions: RevisionRow[]
}) {
  const router = useRouter()
  const [open, setOpen] = useState<string | null>(null)
  const [pending, setPending] = useState<RevisionRow | null>(null)
  const [busy, startTransition] = useTransition()

  if (revisions.length === 0) {
    return (
      <div className="card-premium px-6 py-14 text-center">
        <Clock size={26} className="mx-auto text-[var(--text-muted)]" />
        <p className="mt-3 text-sm text-[var(--text-muted)]">
          Belum ada revisi. Versi lama baru tersimpan setelah artikel ini disunting.
        </p>
      </div>
    )
  }

  return (
    <>
      <div className="space-y-2">
        {revisions.map((r) => {
          const expanded = open === r.id
          const changed = r.content !== current.content || r.title !== current.title
          return (
            <div key={r.id} className="card-premium overflow-hidden">
              <button
                onClick={() => setOpen(expanded ? null : r.id)}
                className="w-full text-left px-4 py-3 flex items-start gap-3 hover:bg-[var(--cream)]/40 transition-colors"
              >
                <span className="shrink-0 mt-0.5 rounded-md bg-[var(--cream-dark)] px-2 py-0.5 text-[10px] font-bold text-[var(--text-2)]">
                  v{r.version}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-[var(--brown-dark)] break-words">
                    {r.title}
                  </p>
                  <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
                    {formatDateTime(r.createdAt)}
                    {r.editorName && ` · ${r.editorName}`}
                    {r.status && ` · ${r.status}`}
                  </p>
                </div>
                <span className="shrink-0 text-[var(--text-muted)]">
                  {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </span>
              </button>

              {expanded && (
                <div className="border-t border-[var(--cream)] px-4 py-3 space-y-2.5">
                  <pre className="max-h-72 overflow-y-auto whitespace-pre-wrap break-words rounded-lg bg-[var(--cream)]/60 p-3 text-[11px] leading-relaxed font-mono text-[var(--text-2)]">
                    {r.content}
                  </pre>
                  <div className="flex items-center gap-2">
                    <button
                      disabled={busy || !changed}
                      onClick={() => setPending(r)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--terra)] px-3 py-1.5 text-xs font-semibold text-[var(--terra)] hover:bg-[var(--terra)]/8 disabled:opacity-40"
                    >
                      <RotateCcw size={12} /> Kembalikan ke v{r.version}
                    </button>
                    {!changed && (
                      <span className="text-[10px] text-[var(--text-muted)]">
                        Sama dengan versi sekarang.
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      <ConfirmDialog
        open={Boolean(pending)}
        onClose={() => setPending(null)}
        title={`Kembalikan ke versi ${pending?.version ?? ''}?`}
        description="Isi artikel sekarang akan diganti dengan versi ini. Versi sekarang tetap tersimpan di riwayat, jadi tindakan ini bisa dibatalkan dengan mengembalikan ke versi yang lebih baru."
        level="reason"
        confirmLabel="Kembalikan"
        onConfirm={async ({ reason }) => {
          if (!pending) return { ok: false, error: 'Tidak ada versi dipilih.' }
          const res = await restoreRevision({
            articleId,
            revisionId: pending.id,
            reason: reason || `Dikembalikan ke versi ${pending.version}.`,
          })
          if (res && typeof res === 'object' && 'ok' in res && !res.ok) {
            return { ok: false, error: String((res as { error: string }).error) }
          }
          toast.success(`Artikel dikembalikan ke versi ${pending.version}.`)
          startTransition(() => router.refresh())
          return { ok: true }
        }}
      />
    </>
  )
}
