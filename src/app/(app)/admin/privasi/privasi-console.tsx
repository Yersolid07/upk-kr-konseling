// src/app/(app)/admin/privasi/privasi-console.tsx
// Konsol privasi (M13).

'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import {
  Download, Trash2, ShieldCheck, Clock, CheckCircle2, XCircle, X, Loader2, Eye, Lock,
} from 'lucide-react'
import { formatDateTime } from '@/lib/utils'
import { handleDataRequest } from './actions'

type ReqRow = {
  id: string; user_id: string; kind: string; status: string
  note: string | null; handled_by: string | null; handled_at: string | null
  created_at: string; userName: string
}
type RevealRow = {
  id: string; reason: string; createdAt: string
  contentType: string | null; contentId: string | null
  actorName: string; targetName: string
}

const STATUS_STYLE: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-800',
  processing: 'bg-blue-100 text-blue-800',
  completed: 'bg-emerald-100 text-emerald-800',
  rejected: 'bg-red-100 text-red-800',
}
const STATUS_LABEL: Record<string, string> = {
  pending: 'Menunggu',
  processing: 'Diproses',
  completed: 'Selesai',
  rejected: 'Ditolak',
}

export function PrivasiConsole({
  requests,
  reveals,
  isSuper,
}: {
  requests: ReqRow[]
  reveals: RevealRow[]
  isSuper: boolean
}) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const refresh = () => startTransition(() => router.refresh())

  const [tab, setTab] = useState<'requests' | 'reveals'>('requests')
  const [handling, setHandling] = useState<ReqRow | null>(null)

  const pending = requests.filter((r) => r.status === 'pending')

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-[var(--font-playfair)] text-2xl font-bold text-[var(--brown-dark)]">Privasi</h1>
        <p className="text-sm text-[var(--text-muted)] mt-0.5">
          Permintaan akses &amp; penghapusan data anggota, serta jejak pembukaan identitas anonim.
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        <Stat label="Permintaan menunggu" value={String(pending.length)} tone={pending.length > 0 ? 'warn' : undefined} />
        <Stat label="Total permintaan" value={String(requests.length)} />
        <Stat label="Pembukaan identitas" value={isSuper ? String(reveals.length) : '—'} />
      </div>

      <div className="flex gap-1.5">
        <button
          onClick={() => setTab('requests')}
          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold border transition-colors ${
            tab === 'requests'
              ? 'bg-[var(--brown-dark)] text-[var(--cream)] border-[var(--brown-dark)]'
              : 'bg-[var(--surface)] text-[var(--text-2)] border-[var(--cream-dark)]'
          }`}
        >
          <Download size={12} /> Permintaan data
        </button>
        <button
          onClick={() => setTab('reveals')}
          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold border transition-colors ${
            tab === 'reveals'
              ? 'bg-[var(--brown-dark)] text-[var(--cream)] border-[var(--brown-dark)]'
              : 'bg-[var(--surface)] text-[var(--text-2)] border-[var(--cream-dark)]'
          }`}
        >
          <Eye size={12} /> Log identitas
        </button>
      </div>

      {tab === 'requests' && (
        <>
          {requests.length === 0 ? (
            <div className="card-premium px-6 py-12 text-center">
              <ShieldCheck size={24} className="mx-auto text-[var(--text-muted)]" />
              <p className="mt-2 text-sm text-[var(--text-muted)]">Belum ada permintaan data.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {requests.map((r) => (
                <div key={r.id} className="card-premium p-4">
                  <div className="flex flex-wrap items-start gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="inline-flex items-center gap-1 text-sm font-semibold text-[var(--brown-dark)]">
                          {r.kind === 'export' ? <Download size={13} /> : <Trash2 size={13} />}
                          {r.kind === 'export' ? 'Ekspor data' : 'Hapus akun'}
                        </span>
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${STATUS_STYLE[r.status] ?? ''}`}>
                          {STATUS_LABEL[r.status] ?? r.status}
                        </span>
                      </div>
                      <p className="mt-1 text-[11px] text-[var(--text-muted)]">
                        {r.userName} · diminta {formatDateTime(r.created_at)}
                        {r.handled_at ? ` · ditangani ${formatDateTime(r.handled_at)}` : ''}
                      </p>
                      {r.note && (
                        <p className="mt-1.5 rounded-lg bg-[var(--cream)]/60 px-2.5 py-1.5 text-[11px] text-[var(--text)]">
                          {r.note}
                        </p>
                      )}
                    </div>
                    {(r.status === 'pending' || r.status === 'processing') && (
                      <button
                        onClick={() => setHandling(r)}
                        className="rounded-lg bg-[var(--brown-dark)] px-3 py-1.5 text-xs font-semibold text-[var(--cream)]"
                      >
                        Tangani
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {tab === 'reveals' && (
        <>
          {!isSuper ? (
            <div className="card-premium px-6 py-12 text-center">
              <Lock size={24} className="mx-auto text-[var(--text-muted)]" />
              <p className="mt-2 text-sm text-[var(--text-muted)]">
                Log pembukaan identitas hanya dapat dibaca super admin.
              </p>
            </div>
          ) : reveals.length === 0 ? (
            <div className="card-premium px-6 py-12 text-center">
              <ShieldCheck size={24} className="mx-auto text-emerald-600" />
              <p className="mt-2 text-sm text-[var(--text-muted)]">
                Tidak ada identitas anonim yang pernah dibuka. Ini kondisi yang diinginkan.
              </p>
            </div>
          ) : (
            <div className="card-premium divide-y divide-[var(--cream)]">
              {reveals.map((r) => (
                <div key={r.id} className="px-4 py-3">
                  <p className="text-xs font-semibold text-[var(--brown-dark)]">
                    {r.actorName} membuka identitas {r.targetName}
                  </p>
                  <p className="mt-1 text-[11px] text-[var(--text)]">{r.reason}</p>
                  <p className="mt-1 inline-flex flex-wrap items-center gap-x-2 gap-1 text-[10px] text-[var(--text-muted)]">
                    <span className="inline-flex items-center gap-1">
                      <Clock size={9} /> {formatDateTime(r.createdAt)}
                    </span>
                    {r.contentType && (
                      <span className="font-mono">
                        {r.contentType} · {String(r.contentId ?? '').slice(0, 8)}
                      </span>
                    )}
                  </p>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {handling && (
        <HandleDialog
          row={handling}
          onClose={() => setHandling(null)}
          onDone={() => {
            setHandling(null)
            refresh()
          }}
        />
      )}
    </div>
  )
}

function HandleDialog({ row, onClose, onDone }: { row: ReqRow; onClose: () => void; onDone: () => void }) {
  const [status, setStatus] = useState<'processing' | 'completed' | 'rejected'>('completed')
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit() {
    if (note.trim().length < 5) return toast.error('Catatan minimal 5 karakter.')
    setBusy(true)
    const res = await handleDataRequest({ id: row.id, status, note: note.trim() })
    setBusy(false)
    if ('error' in res) return toast.error(res.error)
    toast.success('Permintaan diperbarui.')
    onDone()
  }

  return (
    <div className="fixed inset-0 z-[140] overflow-y-auto">
      <div className="fixed inset-0 bg-black/45 backdrop-blur-[2px]" onClick={() => !busy && onClose()} />
      <div className="relative flex min-h-full items-center justify-center p-4">
        <div className="relative w-full max-w-md rounded-2xl bg-white shadow-2xl border border-[var(--cream-dark)] max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--cream-dark)]">
            <h2 className="font-bold text-[var(--brown-dark)] text-sm">Tangani permintaan</h2>
            <button onClick={onClose} aria-label="Tutup">
              <X size={16} className="text-[var(--text-muted)]" />
            </button>
          </div>
          <div className="p-5 space-y-3">
            <div className="rounded-lg border border-[var(--cream-dark)] bg-[var(--cream)]/50 px-3 py-2">
              <p className="text-xs font-semibold text-[var(--brown-dark)]">
                {row.kind === 'export' ? 'Ekspor data' : 'Hapus akun'} — {row.userName}
              </p>
            </div>

            <div className="form-group">
              <label className="form-label">Status</label>
              <select value={status} onChange={(e) => setStatus(e.target.value as never)} className="form-input">
                <option value="processing">Diproses</option>
                <option value="completed">Selesai</option>
                <option value="rejected">Ditolak</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Catatan (min. 5 karakter)</label>
              <textarea
                rows={3}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                maxLength={1000}
                className="form-input"
                style={{ resize: 'vertical' }}
                placeholder={
                  status === 'completed'
                    ? 'Contoh: berkas ekspor dikirim ke email terdaftar.'
                    : status === 'rejected'
                      ? 'Contoh: akun masih memiliki tanggungan data yang harus diselesaikan.'
                      : 'Contoh: sedang disiapkan, selesai dalam 3 hari kerja.'
                }
              />
            </div>

            {status === 'rejected' && (
              <p className="text-[11px] text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 leading-relaxed">
                Penolakan wajib beralasan jelas — anggota berhak memahami dasar penolakan.
              </p>
            )}

            <div className="flex justify-end gap-2 pt-1">
              <button
                onClick={onClose}
                disabled={busy}
                className="rounded-lg border border-[var(--cream-dark)] px-4 py-2 text-xs font-semibold text-[var(--text-2)] disabled:opacity-50"
              >
                Batal
              </button>
              <button
                onClick={submit}
                disabled={busy}
                className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--brown-dark)] px-4 py-2 text-xs font-semibold text-[var(--cream)] disabled:opacity-50"
              >
                {busy && <Loader2 size={13} className="animate-spin" />}
                Simpan
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: 'warn' }) {
  return (
    <div
      className={`rounded-xl border px-3 py-2 ${
        tone === 'warn' ? 'border-amber-200 bg-amber-50' : 'border-[var(--cream-dark)] bg-[var(--surface)]'
      }`}
    >
      <p className="text-[10px] font-bold uppercase tracking-wide text-[var(--text-muted)]">{label}</p>
      <p className="text-lg font-bold text-[var(--brown-dark)] leading-tight">{value}</p>
    </div>
  )
}
