// src/app/(app)/admin/laporan-modul/report-queue.tsx
// Antrean laporan dengan tindakan per konten.

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import Link from 'next/link'
import {
  AlertTriangle, EyeOff, Trash2, XCircle, Clock, ChevronDown, ChevronUp, Flag, Loader2,
} from 'lucide-react'
import { formatDateTime } from '@/lib/utils'
import { resolveReport } from './actions'

export interface ReportGroup {
  key: string
  contentType: string
  contentId: string
  reports: {
    id: string
    reason: string
    detail: string | null
    createdAt: string
    status: string
    resolution: string | null
    actionTaken: string | null
  }[]
  severity: string
  preview: string | null
  title: string | null
  authorLabel: string | null
  status: string
}

type Decision = 'dismiss' | 'review' | 'hide' | 'delete'

/**
 * Label dialog per keputusan.
 *
 * `window.prompt` sengaja TIDAK dipakai: ia diblokir di banyak WebView dan
 * mode kios, tidak bisa menampilkan sisa karakter, dan tidak bisa ditata.
 * Keputusan moderator adalah tindakan yang harus selalu bisa dijalankan.
 */
const DECISION_UI: Record<
  Decision,
  { title: string; hint: string; confirm: string; tone: 'danger' | 'warn' | 'neutral' }
> = {
  hide: {
    title: 'Sembunyikan konten',
    hint: 'Konten tidak lagi tampil di halaman publik, tetapi tidak dihapus. Bisa dibatalkan nanti.',
    confirm: 'Sembunyikan',
    tone: 'warn',
  },
  delete: {
    title: 'Pindahkan ke tempat sampah',
    hint: 'Konten masuk tempat sampah dan bisa dipulihkan selama masa retensi.',
    confirm: 'Pindahkan',
    tone: 'danger',
  },
  review: {
    title: 'Tandai sedang ditinjau',
    hint: 'Laporan tetap terbuka, tetapi ditandai sudah dilihat. Pakai bila butuh waktu memutuskan.',
    confirm: 'Tandai ditinjau',
    tone: 'neutral',
  },
  dismiss: {
    title: 'Abaikan laporan',
    hint: 'Konten dibiarkan apa adanya. Pelapor akan diberi tahu bahwa laporannya tidak dilanjutkan.',
    confirm: 'Abaikan',
    tone: 'neutral',
  },
}

const TYPE_LABEL: Record<string, string> = {
  thread: 'Diskusi',
  comment: 'Komentar',
  prayer: 'Permohonan Doa',
  article: 'Artikel',
  message: 'Pesan KK/KTB',
}

const SCOPES = [
  { key: 'pending', label: 'Menunggu' },
  { key: 'high', label: 'Prioritas' },
  { key: 'reviewed', label: 'Ditinjau' },
  { key: 'resolved', label: 'Selesai' },
] as const

export function ReportQueue({
  groups,
  total,
  scope,
}: {
  groups: ReportGroup[]
  total: number
  scope: string
}) {
  const router = useRouter()
  const [open, setOpen] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [pending, setPending] = useState<{ group: ReportGroup; decision: Decision } | null>(null)
  const [note, setNote] = useState('')

  function askDecision(g: ReportGroup, decision: Decision) {
    setNote('')
    setPending({ group: g, decision })
  }

  async function confirmDecision() {
    if (!pending) return
    const { group: g, decision } = pending
    const trimmed = note.trim()
    if (trimmed.length < 5) {
      toast.error('Catatan minimal 5 karakter.')
      return
    }

    setBusy(g.key)
    // Semua laporan untuk konten ini ditutup dengan keputusan yang sama.
    for (const r of g.reports) {
      if (r.status === 'resolved' || r.status === 'dismissed') continue
      const res = await resolveReport({ reportId: r.id, decision, note: trimmed })
      if (res && typeof res === 'object' && 'ok' in res && !res.ok) {
        toast.error(String((res as { error: string }).error))
        setBusy(null)
        return
      }
    }
    setBusy(null)
    setPending(null)
    setNote('')
    toast.success(
      decision === 'dismiss'
        ? 'Laporan diabaikan, pelapor diberi tahu.'
        : decision === 'review'
          ? 'Ditandai sedang ditinjau.'
          : 'Konten ditindak, pelapor diberi tahu.'
    )
    router.refresh()
  }

  return (
    <>
      <div className="flex items-center gap-1.5 mb-3 flex-wrap">
        {SCOPES.map((s) => (
          <Link
            key={s.key}
            href={s.key === 'pending' ? '/admin/laporan-modul' : `/admin/laporan-modul?scope=${s.key}`}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold border transition-colors ${
              scope === s.key || (!scope && s.key === 'pending')
                ? 'bg-[var(--brown-dark)] text-[var(--cream)] border-[var(--brown-dark)]'
                : 'bg-[var(--surface)] text-[var(--text-2)] border-[var(--cream-dark)] hover:border-[var(--terra)]'
            }`}
          >
            {s.label}
          </Link>
        ))}
      </div>

      {groups.length === 0 ? (
        <div className="card-premium px-6 py-14 text-center">
          <Flag size={26} className="mx-auto text-[var(--text-muted)]" />
          <p className="mt-3 text-sm text-[var(--text-muted)]">
            Tidak ada laporan pada lingkup ini. Antrean bersih.
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {groups.map((g) => {
            const expanded = open === g.key
            const isOpen = g.status === 'pending' || g.status === 'reviewed'
            return (
              <div
                key={g.key}
                className={`card-premium overflow-hidden ${
                  g.severity === 'high' ? 'border-red-300' : ''
                }`}
              >
                <div className="px-4 py-3">
                  <div className="flex items-start gap-3">
                    <span
                      className={`shrink-0 mt-0.5 rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                        g.severity === 'high'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-[var(--cream-dark)] text-[var(--text-2)]'
                      }`}
                    >
                      {TYPE_LABEL[g.contentType] ?? g.contentType}
                    </span>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        {g.title && (
                          <span className="font-semibold text-sm text-[var(--brown-dark)] break-words">
                            {g.title}
                          </span>
                        )}
                        <span className="inline-flex items-center gap-1 text-[11px] text-amber-800 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5">
                          <Flag size={10} /> {g.reports.length} laporan
                        </span>
                        {g.severity === 'high' && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase text-red-700">
                            <AlertTriangle size={10} /> prioritas
                          </span>
                        )}
                      </div>

                      {g.authorLabel && (
                        <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
                          Oleh {g.authorLabel}
                        </p>
                      )}

                      {g.preview && (
                        <p className="text-xs text-[var(--text-muted)] mt-1 line-clamp-2 whitespace-pre-wrap">
                          {g.preview}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Alasan laporan — selalu terlihat, ini inti keputusan */}
                  <div className="mt-2 pl-0 sm:pl-[76px]">
                    <p className="text-[11px] text-[var(--text-muted)] mb-1">
                      Alasan pelapor:
                    </p>
                    <ul className="space-y-1">
                      {(expanded ? g.reports : g.reports.slice(0, 2)).map((r) => (
                        <li key={r.id} className="text-xs text-[var(--text)] flex gap-1.5">
                          <span className="text-[var(--text-muted)] shrink-0">•</span>
                          <span className="min-w-0">
                            {r.reason}
                            {r.detail && (
                              <span className="text-[var(--text-muted)]"> — {r.detail}</span>
                            )}
                            <span className="text-[10px] text-[var(--text-muted)] ml-1">
                              ({formatDateTime(r.createdAt)})
                            </span>
                          </span>
                        </li>
                      ))}
                    </ul>
                    {g.reports.length > 2 && (
                      <button
                        onClick={() => setOpen(expanded ? null : g.key)}
                        className="mt-1 inline-flex items-center gap-0.5 text-[11px] font-semibold text-[var(--terra)]"
                      >
                        {expanded ? (
                          <>
                            <ChevronUp size={11} /> Ringkas
                          </>
                        ) : (
                          <>
                            <ChevronDown size={11} /> Lihat {g.reports.length - 2} laporan lain
                          </>
                        )}
                      </button>
                    )}
                  </div>

                  {/* Hasil, untuk laporan yang sudah ditutup */}
                  {!isOpen && g.reports[0]?.resolution && (
                    <p className="mt-2 text-xs text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg px-2.5 py-1.5">
                      <strong>Hasil:</strong> {g.reports[0].resolution}
                    </p>
                  )}
                </div>

                {isOpen && (
                  <div className="flex flex-wrap gap-1.5 px-4 py-2.5 border-t border-[var(--cream)] bg-[var(--cream)]/40">
                    <button
                      disabled={busy === g.key}
                      onClick={() => askDecision(g, 'hide')}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-800 hover:bg-amber-100 disabled:opacity-50"
                    >
                      <EyeOff size={12} /> Sembunyikan
                    </button>
                    <button
                      disabled={busy === g.key}
                      onClick={() => askDecision(g, 'delete')}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100 disabled:opacity-50"
                    >
                      <Trash2 size={12} /> Tempat sampah
                    </button>
                    <button
                      disabled={busy === g.key}
                      onClick={() => askDecision(g, 'review')}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-100 disabled:opacity-50"
                    >
                      <Clock size={12} /> Tinjau nanti
                    </button>
                    <button
                      disabled={busy === g.key}
                      onClick={() => askDecision(g, 'dismiss')}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--cream-dark)] px-3 py-1.5 text-xs font-semibold text-[var(--text-2)] hover:border-[var(--terra)] disabled:opacity-50"
                    >
                      <XCircle size={12} /> Abaikan
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {pending && (
        <div className="fixed inset-0 z-[140] overflow-y-auto">
          <div
            className="fixed inset-0 bg-black/45 backdrop-blur-[2px]"
            onClick={() => busy === null && setPending(null)}
          />
          <div className="relative flex min-h-full items-center justify-center p-4">
          <div className="relative w-full max-w-md rounded-2xl bg-white shadow-2xl border border-[var(--cream-dark)] max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--cream-dark)]">
              <h2 className="font-bold text-[var(--brown-dark)] text-sm">
                {DECISION_UI[pending.decision].title}
              </h2>
              <button
                onClick={() => busy === null && setPending(null)}
                className="text-[var(--text-muted)] hover:text-[var(--brown)]"
                aria-label="Tutup"
              >
                <XCircle size={16} />
              </button>
            </div>

            <div className="p-5 space-y-3">
              <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                {DECISION_UI[pending.decision].hint}
              </p>

              {pending.group.title && (
                <p className="rounded-lg bg-[var(--cream)]/60 border border-[var(--cream-dark)] px-3 py-2 text-xs font-semibold text-[var(--brown-dark)]">
                  {pending.group.title}
                </p>
              )}

              <div className="form-group">
                <label className="form-label">
                  Catatan untuk pelapor (wajib, min. 5 karakter)
                </label>
                <textarea
                  className="form-input"
                  rows={3}
                  maxLength={500}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Contoh: Konten melanggar pedoman komunitas karena memuat tautan promosi."
                  style={{ resize: 'vertical' }}
                  autoFocus
                />
                <p className="text-[10px] text-[var(--text-muted)] mt-1">{note.length}/500</p>
              </div>

              {pending.decision === 'delete' && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-[11px] text-amber-900 leading-relaxed">
                  Konten tidak langsung hilang permanen — masuk tempat sampah dan masih bisa
                  dipulihkan selama masa retensi.
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 px-5 py-3 border-t border-[var(--cream-dark)] bg-[var(--cream)]/40">
              <button
                onClick={() => setPending(null)}
                disabled={busy !== null}
                className="rounded-lg border border-[var(--cream-dark)] px-4 py-2 text-xs font-semibold text-[var(--text-2)] disabled:opacity-50"
              >
                Batal
              </button>
              <button
                onClick={confirmDecision}
                disabled={busy !== null}
                className={`inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-semibold text-white disabled:opacity-50 ${
                  DECISION_UI[pending.decision].tone === 'danger'
                    ? 'bg-red-600'
                    : DECISION_UI[pending.decision].tone === 'warn'
                      ? 'bg-amber-600'
                      : 'bg-[var(--brown-dark)]'
                }`}
              >
                {busy !== null && <Loader2 size={13} className="animate-spin" />}
                {DECISION_UI[pending.decision].confirm}
              </button>
            </div>
          </div>
          </div>
        </div>
      )}
    </>
  )
}
