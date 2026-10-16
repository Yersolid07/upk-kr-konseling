// src/app/(app)/admin/konselor/konselor-queue.tsx
'use client'

import { useState, useTransition } from 'react'
import {
  Check, X, Loader2, Clock, ShieldCheck, AlertTriangle,
  ChevronDown, ExternalLink, Eye, FileText, UserCheck
} from 'lucide-react'
import toast from 'react-hot-toast'
import { cn } from '@/lib/utils'
import { decideApplication } from './actions'
import type { KonselorApplication } from '@/types/database'

type Row = KonselorApplication & {
  applicant?: { id: string; full_name: string; angkatan: string | null; jurusan: string | null; role: string } | null
}

const STATUS_UI: Record<string, { label: string; cls: string }> = {
  pending:      { label: 'Menunggu',      cls: 'bg-[var(--gold)]/15 text-[var(--brown-dark)]' },
  under_review: { label: 'Ditinjau',      cls: 'bg-[var(--gold)]/15 text-[var(--brown-dark)]' },
  approved:     { label: 'Disetujui',     cls: 'bg-[var(--sage)]/15 text-[var(--sage)]' },
  rejected:     { label: 'Ditolak',       cls: 'bg-red-50 text-red-600' },
  withdrawn:    { label: 'Ditarik',       cls: 'bg-[var(--cream-dark)] text-[var(--text-muted)]' },
}

export function KonselorQueue({ pending, decided }: { pending: Row[]; decided: Row[] }) {
  const [queue, setQueue] = useState(pending)
  const [busy, startTransition] = useTransition()

  function decide(id: string, decision: string, notes: string, doneMsg: string) {
    const fd = new FormData()
    fd.set('id', id)
    fd.set('decision', decision)
    if (notes) fd.set('review_notes', notes)

    startTransition(async () => {
      const res = (await decideApplication(fd)) as { error?: string; success?: string } | undefined
      if (res?.error) {
        toast.error(res.error)
        return
      }
      if (decision !== 'under_review') {
        setQueue((prev) => prev.filter((r) => r.id !== id))
      }
      toast.success(res?.success ?? doneMsg)
    })
  }

  return (
    <div className="space-y-8">
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <Clock size={16} className="text-[var(--gold)]" />
          <h2 className="font-bold text-[var(--brown-dark)] text-sm uppercase tracking-wider">
            Menunggu Keputusan ({queue.length})
          </h2>
        </div>

        {queue.length === 0 ? (
          <div className="card-premium p-10 text-center space-y-2">
            <UserCheck size={28} className="text-[var(--sage)] mx-auto" />
            <p className="text-sm text-[var(--text-muted)]">Tidak ada pengajuan yang menunggu.</p>
          </div>
        ) : (
          queue.map((r) => <ApplicationCard key={r.id} row={r} onDecide={decide} busy={busy} />)
        )}
      </section>

      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <FileText size={16} className="text-[var(--terra)]" />
          <h2 className="font-bold text-[var(--brown-dark)] text-sm uppercase tracking-wider">
            Riwayat Keputusan ({decided.length})
          </h2>
        </div>

        {decided.length === 0 ? (
          <div className="card-premium p-8 text-center text-sm text-[var(--text-muted)]">
            Belum ada keputusan yang tercatat.
          </div>
        ) : (
          <div className="card-premium divide-y divide-[var(--cream-dark)]">
            {decided.map((r) => {
              const meta = STATUS_UI[r.status] ?? STATUS_UI.pending
              return (
                <div key={r.id} className="p-4 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={cn('text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full', meta.cls)}>
                      {meta.label}
                    </span>
                    <span className="text-sm font-bold text-[var(--brown-dark)]">
                      {r.applicant?.full_name ?? 'Tanpa nama'}
                    </span>
                    {r.applicant?.role && (
                      <span className="text-[10px] font-mono text-[var(--text-muted)]">
                        {r.applicant.role}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-[var(--text-muted)]">
                    Diajukan {new Date(r.created_at).toLocaleDateString('id-ID')}
                    {r.reviewed_at && ` · diputuskan ${new Date(r.reviewed_at).toLocaleDateString('id-ID')}`}
                  </p>
                  {r.review_notes && (
                    <p className="text-[11px] text-[var(--text-muted)] italic line-clamp-2">
                      “{r.review_notes}”
                    </p>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}

function ApplicationCard({
  row,
  onDecide,
  busy,
}: {
  row: Row
  onDecide: (id: string, decision: string, notes: string, msg: string) => void
  busy: boolean
}) {
  const [open, setOpen] = useState(false)
  const [notes, setNotes] = useState('')

  const app = row.applicant

  return (
    <article className="card-premium p-5 sm:p-6 space-y-4">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="min-w-0 flex-1">
          <h3 className="font-bold text-[var(--brown-dark)]">{app?.full_name ?? 'Tanpa nama'}</h3>
          <p className="text-[11px] text-[var(--text-muted)] mt-1">
            {[app?.angkatan, app?.jurusan].filter(Boolean).join(' · ') || 'Data akademik tidak diisi'}
          </p>
          <p className="text-[11px] text-[var(--text-muted)]">
            Diajukan {new Date(row.created_at).toLocaleDateString('id-ID', {
              day: 'numeric', month: 'long', year: 'numeric',
            })}
          </p>
        </div>
        <button
          onClick={() => setOpen((v) => !v)}
          className="inline-flex items-center gap-1.5 text-[11px] font-bold text-[var(--terra)] uppercase tracking-wider"
        >
          {open ? 'Tutup' : 'Lihat Detail'}
          <ChevronDown size={13} className={cn('transition-transform', open && 'rotate-180')} />
        </button>
      </div>

      {row.specialization && row.specialization.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {row.specialization.map((s) => (
            <span
              key={s}
              className="px-2.5 py-1 rounded-full bg-[var(--terra)]/10 text-[var(--terra)] text-[10px] font-bold uppercase tracking-wider"
            >
              {s}
            </span>
          ))}
        </div>
      )}

      {open && (
        <div className="space-y-4 pt-2">
          <div>
            <p className="text-[11px] font-bold text-[var(--brown-dark)] uppercase tracking-wider mb-1">
              Motivasi
            </p>
            <p className="text-sm text-[var(--text)] leading-relaxed whitespace-pre-wrap p-4 rounded-xl bg-[var(--cream)]/50 border border-[var(--cream-dark)]">
              {row.motivation}
            </p>
          </div>

          {row.experience && (
            <div>
              <p className="text-[11px] font-bold text-[var(--brown-dark)] uppercase tracking-wider mb-1">
                Pengalaman
              </p>
              <p className="text-sm text-[var(--text)] leading-relaxed whitespace-pre-wrap p-4 rounded-xl bg-[var(--cream)]/50 border border-[var(--cream-dark)]">
                {row.experience}
              </p>
            </div>
          )}

          {row.availability_note && (
            <div>
              <p className="text-[11px] font-bold text-[var(--brown-dark)] uppercase tracking-wider mb-1">
                Ketersediaan
              </p>
              <p className="text-sm text-[var(--text)]">{row.availability_note}</p>
            </div>
          )}

          {row.credential_url && (
            <a
              href={row.credential_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-[var(--cream)] border border-[var(--cream-dark)] text-xs font-bold text-[var(--brown)] hover:border-[var(--terra)] transition-all"
            >
              <Eye size={13} /> Lihat Lampiran Kredensial
              <ExternalLink size={11} className="text-[var(--text-muted)]" />
            </a>
          )}
        </div>
      )}

      <div className="space-y-2 p-4 rounded-xl bg-[var(--cream)]/50 border border-[var(--cream-dark)]">
        <label className="flex items-center gap-2 text-[11px] font-bold text-[var(--brown-dark)] uppercase tracking-wider">
          <AlertTriangle size={12} className="text-[var(--gold)]" /> Catatan untuk pelamar (wajib bila ditolak)
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          placeholder="mis. Perlu mengikuti pembinaan dasar IKA UPK-Kr FT UNSRAT terlebih dahulu."
          className="form-input text-sm resize-none"
        />
      </div>

      <div className="flex items-center gap-2 flex-wrap pt-2 border-t border-[var(--cream-dark)]">
        <button
          disabled={busy}
          onClick={() => onDecide(row.id, 'approved', notes, 'Pengajuan disetujui.')}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[var(--sage)] text-white text-xs font-bold uppercase tracking-wider hover:opacity-90 transition-all disabled:opacity-50"
        >
          {busy ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />} Setujui
        </button>

        <button
          disabled={busy}
          onClick={() => onDecide(row.id, 'rejected', notes, 'Pengajuan ditolak.')}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-50 text-red-600 text-xs font-bold uppercase tracking-wider border border-red-200 hover:bg-red-100 transition-all disabled:opacity-50"
        >
          <X size={13} /> Tolak
        </button>

        {row.status === 'pending' && (
          <button
            disabled={busy}
            onClick={() => onDecide(row.id, 'under_review', notes, 'Ditandai sedang ditinjau.')}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white text-[var(--brown)] text-xs font-bold uppercase tracking-wider border border-[var(--cream-dark)] hover:border-[var(--terra)] transition-all disabled:opacity-50"
          >
            <Clock size={13} /> Tandai Ditinjau
          </button>
        )}

        <span className="ml-auto inline-flex items-center gap-1.5 text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">
          <ShieldCheck size={11} /> Keputusan tercatat di log audit
        </span>
      </div>
    </article>
  )
}
